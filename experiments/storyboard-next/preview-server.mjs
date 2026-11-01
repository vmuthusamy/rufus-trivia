// Local-only preview. Real trivia APIs run in Wrangler on port 8793.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('.',import.meta.url));
const types={'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer(async(req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname.startsWith('/api/')||pathname.startsWith('/js/')||pathname.startsWith('/f/')||pathname.startsWith('/m/')||pathname==='/classic'){
  const upstream=http.request({hostname:'127.0.0.1',port:8793,path:pathname==='/classic'?'/':req.url,method:req.method,headers:{...req.headers,host:'127.0.0.1:8793'}},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});
  upstream.on('error',()=>{res.writeHead(503,{'content-type':'application/json'});res.end('{"error":"Local trivia server is not running on port 8793."}');});req.pipe(upstream);return;
 }
 try{const file=path.resolve(root,'.'+decodeURIComponent(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root))throw Error('outside');const data=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);}catch{res.writeHead(404);res.end('Not found');}
});
server.on('upgrade',(req,socket,head)=>{
 if(!/^\/api\/solo\/[0-9a-f]{64}\/ws(?:\?|$)/.test(req.url)){socket.destroy();return;}
 const up=http.request({hostname:'127.0.0.1',port:8793,path:req.url,headers:{...req.headers,host:'127.0.0.1:8793'}});
 up.on('upgrade',(res,peer,rest)=>{socket.write('HTTP/1.1 101 Switching Protocols\r\n'+Object.entries(res.headers).map(([k,v])=>`${k}: ${v}`).join('\r\n')+'\r\n\r\n');if(head.length)peer.write(head);if(rest.length)socket.write(rest);peer.pipe(socket);socket.pipe(peer);peer.on('error',()=>socket.destroy());socket.on('error',()=>peer.destroy());socket.on('close',()=>peer.destroy());});
 up.on('error',()=>socket.destroy());up.end();
});
server.listen(8791,'127.0.0.1',()=>console.log('New experiment: http://127.0.0.1:8791 · Original: http://127.0.0.1:8790'));
