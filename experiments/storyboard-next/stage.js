// Both rooms borrow the same canvas. Switching worlds does not open another GPU context.
let rendererPromise;
const scenes=new Set();
export function getRenderer(){
 if(!rendererPromise)rendererPromise=import('three').then(T=>{
  const renderer=new T.WebGLRenderer({alpha:true,antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.setClearColor(0,0);
  renderer.domElement.addEventListener('webglcontextlost',event=>{
   event.preventDefault();document.body.dataset.graphics='lost';
   document.getElementById('graphics-note').hidden=false;
  });
  renderer.domElement.addEventListener('webglcontextrestored',()=>{
   document.body.dataset.graphics='ready';document.getElementById('graphics-note').hidden=true;
  });
  const render=renderer.render.bind(renderer);
  renderer.paint=(scene,camera,host)=>{
   scenes.add(scene);
   if(renderer.domElement.parentElement!==host)host.prepend(renderer.domElement);
   const width=Math.max(1,host.clientWidth),height=Math.max(1,host.clientHeight);
   if(renderer.domElement.style.width!==width+'px'||renderer.domElement.style.height!==height+'px')renderer.setSize(width,height);
   render(scene,camera);
  };
  addEventListener('pagehide',event=>{
   if(event.persisted)return;
   const geometries=new Set(),materials=new Set(),textures=new Set();
   scenes.forEach(scene=>scene.traverse(object=>{if(object.geometry)geometries.add(object.geometry);for(const material of [object.material].flat().filter(Boolean)){materials.add(material);for(const value of Object.values(material))if(value?.isTexture)textures.add(value);}}));
   geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();
  },{once:true});
  return renderer;
 });
 return rendererPromise;
}
