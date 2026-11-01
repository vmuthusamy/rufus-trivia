import assert from 'node:assert/strict';
const base='http://127.0.0.1:8791';
const meta=await(await fetch(base+'/api/meta')).json();
const player={id:'verify_'+Date.now(),adj:meta.names.adjectives[0],animal:meta.names.animals[0][0],color:meta.names.colors[0]};
const post=async(path,body)=>{const r=await fetch(base+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});assert(r.ok);return r.json();};
const topic=process.env.TEST_TOPIC || 'animals';
const {id}=await post('/api/solo',{topic,player,...(topic==='mix'?{mix:['animals','science']}:{})});
function open(){const socket=new WebSocket(base.replace('http','ws')+'/api/solo/'+id+'/ws');const states=[];socket.onopen=()=>socket.send(JSON.stringify({t:'hello',player}));socket.onmessage=e=>{const packet=JSON.parse(e.data);if(packet.t==='state')states.push(packet);};return {socket,states};}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(game,predicate){const deadline=Date.now()+10000;while(Date.now()<deadline){const found=game.states.find(predicate);if(found)return found;await delay(40);}throw Error('Timed out waiting for state');}
let game=open();
try{
 const question=await wait(game,s=>s.phase==='question');
 assert(!('answer' in question.question));assert(!('fact' in question.question));assert.equal(question.mine,null);
 game.socket.send(JSON.stringify({t:'answer',q:question.qi,choice:0}));
 const reveal=await wait(game,s=>s.phase==='reveal');
 assert.equal(reveal.mine.correct,reveal.reveal.answer===0);assert.equal(reveal.mine.choice,0);assert.equal(typeof reveal.reveal.fact,'string');
 game.socket.close();game=open();
 const resumed=await wait(game,s=>s.phase==='reveal');assert.equal(resumed.qi,reveal.qi);assert.equal(resumed.players[0].score,reveal.players[0].score);
 game.socket.send(JSON.stringify({t:'next'}));
 const next=await wait(game,s=>s.phase==='question'&&s.qi===question.qi+1);assert(next.deadline>next.serverNow);
 game.socket.send(JSON.stringify({t:'quit'}));
 const final=await wait(game,s=>s.phase==='final');assert(final.final.quit);assert(final.final.asked>=1);
 const collection=await post('/api/stickers',{player});assert.deepEqual(new Set(collection.stickers),new Set(final.myStickers));
 console.log('PASS: real local API through preview proxy; hidden answers; server reveal; resume without score change; next question; finish; persisted sticker ownership.');
}finally{game.socket.close();}
