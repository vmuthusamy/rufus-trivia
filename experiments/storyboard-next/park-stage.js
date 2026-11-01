import {getRenderer} from './stage.js';
import {buildRide} from './ride-motion.js';
import {rides} from './park-data.js';
import {spriteSVG} from './sprites.js';
// A little 3D park, with real HTML ride buttons placed over its landmarks.
export async function createPark(host,onChoose){
 const layer=document.createElement('div');layer.className='ride-signs';host.append(layer);
 const order=['animals','science','culture','flags','math','mix'];
 const signs=new Map();for(const id of order){const b=document.createElement('button');b.className='ride-sign';b.style.setProperty('--ride-color',rides[id].color);b.dataset.ride=id;b.setAttribute('aria-label','Visit '+rides[id].name);b.innerHTML=`<span class="ride-number">${order.indexOf(id)+1}</span><span>${rides[id].short}<small>${rides[id].kind.toLowerCase()}</small></span>`;b.onclick=()=>onChoose(id);layer.append(b);signs.set(id,b);}
 const picker=document.createElement('select');picker.className='ride-picker';picker.setAttribute('aria-label','Choose a carnival ride');for(const id of order){const option=document.createElement('option');option.value=id;option.textContent=rides[id].short;picker.append(option);}picker.onchange=()=>onChoose(picker.value);host.parentElement.before(picker);
 const fox=document.createElement('div');fox.className='park-fox';fox.setAttribute('aria-hidden','true');fox.innerHTML=spriteSVG('rufus')+'<span>Rufus is here</span>';host.append(fox);
 let chosen='animals',night=false,active=false,motion=true,draw=()=>{},layout=()=>{};
 function select(id){chosen=id;picker.value=id;if(closeUp)focusRide();for(const [key,b] of signs)b.setAttribute('aria-pressed',String(key===id));layout();draw();if(active&&!closeUp){const button=signs.get(id),scroller=host.parentElement;scroller.scrollTo({left:Math.max(0,parseFloat(button.style.left||0)-scroller.clientWidth/2),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}}
 let closeUp=false,focusRide=()=>{};const api={select,focus(){closeUp=true;focusRide();},setNight(value){night=value;draw();},setMotion(value){motion=value;draw();},setActive(value){active=value;if(active)layout();draw();},setJourney:()=>{},dispose:()=>{}};select(chosen);
 try{
 const T=await import('three');const renderer=await getRenderer();
 const scene=new T.Scene();const camera=new T.OrthographicCamera(-9,9,7,-7,.1,100);camera.position.set(0,17,21);camera.lookAt(0,0,0);
 const lookAt=new T.Vector3(),desiredLook=new T.Vector3(),desiredCamera=new T.Vector3(0,17,21);let desiredZoom=1;
 const back=document.createElement('button');back.className='back-to-map';back.textContent='← Back to park map';back.hidden=true;host.parentElement.after(back);
 function updateCamera(delta){const blend=delta===null?1:1-Math.exp(-delta*5);camera.position.lerp(desiredCamera,blend);lookAt.lerp(desiredLook,blend);camera.zoom+=(desiredZoom-camera.zoom)*blend;camera.lookAt(lookAt);camera.updateProjectionMatrix();}
 focusRide=()=>{host.classList.toggle('close-up',closeUp);back.hidden=!closeUp;host.parentElement.parentElement.querySelector('.park-hint').textContent=closeUp?'Watching '+rides[chosen].short+'.':'Choose a ride sign or tap a 3D attraction.';const index=order.indexOf(chosen);const [x,z]=[[-4.6,-3.3],[0,-3.3],[4.6,-3.3],[-4.6,3],[0,3],[4.6,3]][index];desiredLook.set(closeUp?x:0,closeUp?1:0,closeUp?z:0);desiredCamera.set(closeUp?x+4:0,closeUp?5:17,closeUp?z+7:21);desiredZoom=closeUp?2.6:1;host.parentElement.scrollLeft=0;if(!motion)updateCamera(null);layout();draw();};
 back.onclick=()=>{closeUp=false;focusRide();select(chosen);};
 const ambient=new T.HemisphereLight(0xfff6e0,0x7c9a68,2.8);scene.add(ambient);const sun=new T.DirectionalLight(0xffefd4,2.5);sun.position.set(-6,12,10);scene.add(sun);
 const map=new T.Group();scene.add(map);const anchors={};const meshes=[];const movingRides=[];
 function mesh(parent,geo,color,x=0,y=0,z=0){const m=new T.Mesh(geo,new T.MeshStandardMaterial({color,roughness:.85}));m.position.set(x,y,z);parent.add(m);return m;}
 const box=(p,w,h,d,c,x,y,z)=>mesh(p,new T.BoxGeometry(w,h,d),c,x,y,z);
 const sphere=(p,r,c,x,y,z)=>mesh(p,new T.SphereGeometry(r,16,12),c,x,y,z);
 const cylinder=(p,r,h,c,x,y,z)=>mesh(p,new T.CylinderGeometry(r,r,h,24),c,x,y,z);
 function tree(p,x,z){box(p,.13,.7,.13,0x906d47,x,.35,z);mesh(p,new T.ConeGeometry(.47,1.15,7),0x6c9461,x,1.1,z);}
 function tube(p,points,color,r=.06){const curve=new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v)));return mesh(p,new T.TubeGeometry(curve,70,r,6,false),color);}
 const ground=cylinder(map,8.5,.24,0xc0d59f,0,-.25,0);ground.scale.z=.8;
 // Wide cream paths form a loop between the six attractions.
 const path=mesh(map,new T.TorusGeometry(4.45,.36,8,64),0xf0dcae,0,-.06,.5);path.rotation.x=-Math.PI/2;path.scale.x=1.38;box(map,.8,.06,10,0xf0dcae,0,-.03,0);
 const locations=[[-4.6,-3.3],[0,-3.3],[4.6,-3.3],[-4.6,3],[0,3],[4.6,3]];
 for(let i=0;i<order.length;i++){const id=order[i],g=new T.Group();g.position.set(locations[i][0],0,locations[i][1]);map.add(g);g.userData.ride=id;meshes.push(g);anchors[id]=new T.Vector3(locations[i][0],0,locations[i][1]+1.7);
 cylinder(g,1.9,.1,0xe2e2bb,0,-.07,0);
 movingRides.push(buildRide(T,id,g,{box,sphere,cylinder,mesh,tree}));
 }
 for(const [x,z] of [[-7,-3],[7,-3],[-6,5],[6,5]])tree(map,x,z);
 // Striped carnival tents and a string of pennants frame the park.
 for(const x of [-6.8,6.8]){cylinder(map,.8,.7,0xf0d9a4,x,.3,0);mesh(map,new T.ConeGeometry(1.05,1.2,12),x<0?0xd18c75:0x7da7a0,x,1.2,0);box(map,.06,.55,.06,0xb79a62,x,2,0);}
 tube(map,[[-7,3.5,-5],[0,2.6,-5],[7,3.5,-5]],0xb79669,.025);for(let n=0;n<15;n++){const x=-6.6+n*.94;const pennant=mesh(map,new T.ConeGeometry(.18,.4,3),[0xce8d73,0xe2c170,0x85a69b][n%3],x,2.75+Math.abs(x)*.11,-5);pennant.rotation.z=Math.PI;}
 // Shared geometry keeps hundreds of tiny carnival bulbs inexpensive to draw.
 const lightColors=[0xffcf73,0xff91b5,0x87e8e4,0xc4a4ff];
 const bulbPositions=[];
 function addBulb(x,y,z,color=0xffcf73){bulbPositions.push({x,y,z,color});}
 for(let i=0;i<64;i++){const a=i*Math.PI/32;addBulb(Math.cos(a)*6.15,.36,.5+Math.sin(a)*4.45,0xffd29a);}
 for(let i=0;i<30;i++){const x=-7+i*14/29;addBulb(x,2.85+Math.abs(x)*.11,-5,lightColors[i%4]);}
 for(let i=0;i<24;i++){const a=i*Math.PI/12;addBulb(Math.cos(a)*1.28,1.6+Math.sin(a)*1.28,3.09,lightColors[i%4]);}
 for(let i=0;i<18;i++){const a=i*Math.PI/9;addBulb(4.6+Math.cos(a)*1.5,1.82,-3.3+Math.sin(a)*1.5,lightColors[i%4]);}
 const bulbMaterial=new T.MeshBasicMaterial({color:0xffffff});
 const bulbs=new T.InstancedMesh(new T.SphereGeometry(.065,6,4),bulbMaterial,bulbPositions.length);
 const transform=new T.Object3D();bulbPositions.forEach((b,i)=>{transform.position.set(b.x,b.y,b.z);transform.updateMatrix();bulbs.setMatrixAt(i,transform.matrix);bulbs.setColorAt(i,new T.Color(b.color));});map.add(bulbs);
 // Soft halos are a small painted texture, without a full-screen blur pass.
 const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const ctx=canvas.getContext('2d');const glow=ctx.createRadialGradient(32,32,0,32,32,32);glow.addColorStop(0,'rgba(255,255,255,.75)');glow.addColorStop(.2,'rgba(255,255,255,.3)');glow.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,64,64);const texture=new T.CanvasTexture(canvas);
 const lamps=[];const halos=[];function halo(x,y,z,color,size){const h=new T.Sprite(new T.SpriteMaterial({map:texture,color,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));h.position.set(x,y,z);h.scale.set(size,size,1);map.add(h);halos.push(h);}
 for(const x of [-7,7])for(const z of [-4,4]){box(map,.045,1.5,.045,0x7c785d,x,.7,z);const lamp=sphere(map,.16,0xffdb87,x,1.6,z);lamp.material.emissive.set(0xffba53);lamps.push(lamp);halo(x,1.6,z,0xffc270,1.7);}
 for(const [x,z] of locations)halo(x,.4,z,lightColors[halos.length%4],3.8);
 // Make the coaster rail and water glow, while preserving the models in daylight.
 const accents=[];meshes.forEach(g=>g.traverse(o=>{if(o.isMesh&&o.userData.glow){accents.push(o);o.material.emissive.copy(o.material.color);}}));
 const festivalLight=new T.PointLight(0xffb66e,0,18,2);festivalLight.position.set(0,4,1);scene.add(festivalLight);
 // Advance a local clock only while playing; returning to the tab never jumps a ride.
 let frame=0,elapsed=0,previous=0;
 function animate(time){
  frame=0;if(!active||!motion||document.hidden)return;
  const delta=previous?Math.min((time-previous)/1000,.05):0;previous=time;elapsed+=delta;
  movingRides.forEach(move=>move(elapsed));
  const warmth=.86+Math.sin(elapsed*.6)*.09;
  halos.forEach((h,i)=>h.material.opacity=warmth+Math.sin(elapsed+i)*.06);
  updateCamera(delta);if(!closeUp)layout();
  renderer.paint(scene,camera,host);frame=requestAnimationFrame(animate);
 }
 function project(point){const p=point.clone().project(camera);return {x:(p.x+1)*host.clientWidth/2,y:(1-p.y)*host.clientHeight/2};}
 layout=()=>{if(!active||!host.clientWidth)return;const ratio=host.clientWidth/host.clientHeight;const halfW=9.1;camera.left=-halfW;camera.right=halfW;camera.top=halfW/ratio;camera.bottom=-halfW/ratio;camera.updateProjectionMatrix();camera.updateMatrixWorld();for(const [id,b] of signs){const p=project(anchors[id]);b.style.left=p.x+'px';b.style.top=p.y+'px';}const spot=project(anchors[chosen].clone().add(new T.Vector3(-.7,.3,-1.0)));fox.style.left=spot.x+'px';fox.style.top=spot.y+'px';};
 draw=()=>{cancelAnimationFrame(frame);frame=0;if(!active||document.hidden)return;if(!motion)updateCamera(null);ambient.intensity=night?.65:2.8;ambient.color.set(night?0x9eafff:0xfff6e0);sun.intensity=night?.5:2.5;ground.material.color.set(night?0x344c60:0xc0d59f);bulbs.visible=night;lamps.forEach(l=>l.material.emissiveIntensity=night?1:0);halos.forEach(h=>{h.visible=night;h.material.opacity=.9;});accents.forEach(o=>o.material.emissiveIntensity=night?1.1:0);festivalLight.intensity=night?16:0;renderer.paint(scene,camera,host);previous=0;if(motion)frame=requestAnimationFrame(animate);};
 const observer=new ResizeObserver(()=>{layout();draw();});observer.observe(host);const visibility=()=>draw();document.addEventListener('visibilitychange',visibility);api.dispose=()=>{cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener('visibilitychange',visibility);};
 api.setJourney=(questionIndex,rideId='animals')=>{meshes.forEach(group=>group.visible=questionIndex===null||group.userData.ride===rideId);if(questionIndex===null){closeUp=false;focusRide();return;}chosen=rideId;closeUp=true;motion=false;movingRides[order.indexOf(rideId)](Math.max(0,questionIndex)*3.8);focusRide();};
 renderer.domElement.addEventListener('click',e=>{if(closeUp)return;const rect=renderer.domElement.getBoundingClientRect(),pointer=new T.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),ray=new T.Raycaster();ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(meshes,true)[0];if(hit){let g=hit.object;while(g&&!g.userData.ride)g=g.parent;if(g)onChoose(g.userData.ride);}});
 layout();draw();
 }catch(error){host.classList.add('park-flat');fox.hidden=true;document.getElementById('watch-ride').disabled=true;document.getElementById('graphics-note').hidden=false;}
 return api;
}
