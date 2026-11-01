import {getRenderer} from './stage.js';
import {houseRooms} from './house-rooms.js';
import {spriteSVG} from './sprites.js';

// One small model per room. Slow movements help the house feel lived in.
export async function createHouse(host,onSelect){
 const T=await import('three'), renderer=await getRenderer();
 const scene=new T.Scene(),camera=new T.OrthographicCamera(-8,8,6,-6,.1,80);
 const ambient=new T.HemisphereLight(0xffead5,0x71685e,2.8);scene.add(ambient);
 const sun=new T.DirectionalLight(0xffeccb,2.6);sun.position.set(-6,10,12);scene.add(sun);
 const root=new T.Group();scene.add(root);
 let parent=root,active=true,motion=true,night=false,frame=0,time=0,previous=0,selected='animals',focus=null;
 const moves=[],windows=[],bulbs=[],roomGroups=new Map(),lights=[];
 function mesh(geometry,color,x,y,z){const m=new T.Mesh(geometry,new T.MeshStandardMaterial({color,roughness:.8}));m.position.set(x,y,z);parent.add(m);return m;}
 const box=(w,h,d,c,x,y,z)=>mesh(new T.BoxGeometry(w,h,d),c,x,y,z);
 const ball=(r,c,x,y,z)=>mesh(new T.SphereGeometry(r,16,12),c,x,y,z);
 const cyl=(r,h,c,x,y,z)=>mesh(new T.CylinderGeometry(r,r,h,20),c,x,y,z);
 function glow(object,color,strength){object.material.emissive.set(color);object.material.emissiveIntensity=strength;return object;}
 function group(x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;}
 function table(x,z,color=0xa3704b){box(1.5,.13,.9,color,x,.87,z);for(const dx of [-.6,.6])for(const dz of [-.32,.32])box(.09,.86,.09,color,x+dx,.4,z+dz);}
 function steam(x,y,z){for(let i=0;i<5;i++){const puff=ball(.08,0xffe6c5,x,y,z);puff.material.transparent=true;const phase=i/5;moves.push(t=>{const a=(t*.25+phase)%1;puff.position.set(x+Math.sin(a*5+i)*.1,y+a*.8,z);puff.scale.setScalar(.4+a);puff.material.opacity=(1-a)*.35;});}}
 function plant(x,z){cyl(.18,.3,0xb57850,x,.15,z);for(let i=0;i<4;i++){const leaf=ball(.2,0x688752,x+Math.cos(i*2)*.13,.42+i*.09,z);leaf.scale.set(.55,1.4,.55);}}
 function windowAt(x){box(1.16,1.6,.12,0xf1d3a1,x,1.95,-1.25);const pane=box(1.02,1.46,.04,0x8bb6c4,x,1.95,-1.16);windows.push(pane);box(.055,1.5,.06,0xf8e0b5,x,1.95,-1.10);box(1.08,.055,.06,0xf8e0b5,x,1.95,-1.1);}
 // The garden, timber frame and roof make this one house, rather than six cards.
 box(15,.28,6.5,0x82946c,0,-2.67,0);box(12.6,.3,3.5,0x735340,0,-2.48,0);
 for(let i=0;i<10;i++){const stepping=box(.6,.07,.34,0xc3b58e,-4.8+i*1.05,-2.46,2.7);stepping.rotation.y=Math.sin(i)*.2;}
 for(const x of [-7,7]){cyl(.17,2,0x8a6448,x,-1.7,-.5);const tree=ball(1.05,0x66875b,x,-.2,-.5);tree.scale.y=1.4;moves.push(t=>tree.rotation.z=Math.sin(t*.35+x)*.025);}
 for(const r of houseRooms){
  parent=root;const g=group(r.x,r.y,0);g.userData.room=r.id;roomGroups.set(r.id,g);parent=g;
  box(3.9,.18,3,0xb0845e,0,-.08,0);box(3.9,3.55,.16,r.wall,0,1.7,-1.4);
  box(.12,3.55,2.8,0xb89570,-1.97,1.7,0);box(.12,3.55,2.8,0xb89570,1.97,1.7,0);
  for(let i=0;i<7;i++)box(3.75,.015,.018,0x986e4e,0,.02,-1.25+i*.4);
  box(3.85,.15,.13,0xe6c49b,0,3.42,-1.23);windowAt(r.id==='science'?0:-.95);
  const rug=cyl(1.12,.025,r.color,0,.035,.2);rug.scale.z=.68;
  // One pendant per room. Emissive bulbs give warm light without six costly shadow maps.
  box(.025,.45,.025,0x6d574b,.9,3.2,.1);const shade=mesh(new T.ConeGeometry(.26,.25,16,1,true),0xe7ba71,.9,2.86,.1);
  bulbs.push(glow(ball(.10,0xffe2a1,.9,2.76,.1),0xffb663,.25));
  const lamp=new T.PointLight(0xffce89,2.8,4.5,2);lamp.position.set(.3,2.6,1);parent.add(lamp);
  if(r.id==='animals'){
   box(1.1,1.35,.65,0xac7451,.9,.68,-.6);box(.82,.8,.12,0x332d31,.9,.5,-.22);box(1.4,.16,.9,0xe1b687,.9,1.38,-.55);
   for(let i=0;i<5;i++){const flame=glow(mesh(new T.ConeGeometry(.11,.4,7),i%2?0xffd37d:0xf19743,.62+i*.14,.4,-.1),0xff982e,.8);moves.push(t=>{flame.scale.y=.75+Math.sin(t*(3+i*.2)+i)*.25;});}
   const fire=new T.PointLight(0xff9b45,3.3,4);fire.position.set(.9,.75,0);parent.add(fire);lights.push(fire);moves.push(t=>fire.intensity=(night?3.8:1.2)+Math.sin(t*3)*.35);
   const chair=group(-.85,.25,.4);parent=chair;box(.9,.15,.9,0x829674,0,.35,0);box(.9,.9,.12,0x829674,0,.85,-.37);for(const x of [-.5,.5]){box(.12,.5,.95,0xb88858,x,.48,0);const rocker=mesh(new T.TorusGeometry(.62,.055,6,28,Math.PI*.68),0xd3a56e,x,0,0);rocker.rotation.set(0,Math.PI/2,Math.PI*.16);}
   moves.push(t=>chair.rotation.x=Math.sin(t*1.05)*.065);parent=g;table(.95,.85);cyl(.13,.2,0xe8c781,.95,1.03,.85);steam(.95,1.15,.85);plant(-1.5,-.9);
  }else if(r.id==='math'){
   box(3.3,.85,.72,0x91a592,0,.44,-.85);box(3.5,.13,.85,0xf2dbc0,0,.93,-.85);
   for(const x of [-1.1,0,1.1]){box(.95,.63,.05,0xc7d0b1,x,.47,-.46);box(.2,.055,.07,0xa4794b,x,.65,-.4);}
   cyl(.3,.05,0x474848,-.9,1.02,-.7);const pot=cyl(.26,.35,0xc07545,-.9,1.2,-.7);const lid=cyl(.29,.05,0xdcb884,-.9,1.4,-.7);moves.push(t=>lid.rotation.z=Math.sin(t*3)*.025);steam(-.9,1.43,-.7);
   table(.2,.7,0xd3a068);for(let i=0;i<5;i++)ball(.08,[0xe3b64d,0xbe633d,0x7a995f][i%3],-.3+i*.24,1.0,.7);plant(1.45,.1);
   box(.85,.45,.07,0xf5ddb1,.95,2.35,-1.25);const hand=box(.025,.22,.04,0x7f7554,.95,2.38,-1.19);moves.push(t=>hand.rotation.z=-t*.25);
  }else if(r.id==='science'){
   const scope=group(-.5,1.3,.15);parent=scope;const tube=cyl(.19,1.3,0xe1bc78,0,.2,0);tube.rotation.z=-1;const lens=glow(cyl(.15,.03,0x91c7db,.55,.55,0),0x72a4cc,.3);lens.rotation.z=-1;parent=g;
   for(const d of [-1,1]){const leg=box(.06,1.15,.06,0x8b6c51,-.5+d*.2,.5,.15);leg.rotation.z=d*.3;}moves.push(t=>scope.rotation.y=Math.sin(t*.25)*.13);
   const system=group(.8,1.85,-.1);parent=system;glow(ball(.16,0xefbd67,0,0,0),0xf3ad53,.6);for(let i=0;i<3;i++){const orbit=mesh(new T.TorusGeometry(.36+i*.22,.008,4,40),0xe0c29d,0,0,0);orbit.rotation.x=1;const planet=ball(.065+i*.02,[0x86c7ba,0xd19b89,0x9996c6][i],0,0,0);moves.push(t=>planet.position.set(Math.cos(t*(.65-i*.12)+i)*(.36+i*.22),Math.sin(t*(.65-i*.12)+i)*.2,Math.sin(t*(.65-i*.12)+i)*(.36+i*.22)));}parent=g;
   for(let i=0;i<16;i++)glow(ball(.025,0xffe7ae,-1.75+(i*.73)%3.4,.65+(i*.37)%2.6,-1.23),0xffe7ae,.5);
  }else if(r.id==='flags'){
   table(0,.1);const globe=group(0,1.48,.1);parent=globe;const earth=ball(.48,0xffffff,0,0,0);new T.TextureLoader().load('./world-globe.svg',texture=>{texture.colorSpace=T.SRGBColorSpace;earth.material.map=texture;earth.material.needsUpdate=true;paint();});parent=g;moves.push(t=>globe.rotation.y=t*.2);
   box(1.3,.92,.09,0xf5deae,.94,2.15,-1.22);for(let i=0;i<4;i++)box(.75,.02,.02,0xb79568,.94,1.92+i*.15,-1.15);plant(-1.45,.4);
   const balloon=group(-1.1,2.65,.3);parent=balloon;const top=ball(.28,0xca8c67,0,0,0);top.scale.y=1.2;box(.2,.16,.18,0xb89468,0,-.55,0);for(const x of [-.08,.08])box(.014,.26,.014,0xe4ca97,x,-.35,0);parent=g;moves.push(t=>balloon.position.y=2.55+Math.sin(t*.65)*.1);
  }else if(r.id==='culture'){
   box(1.25,1.55,.5,0xa66560,.75,.8,-.6);box(.96,.9,.05,0x635368,.75,1,-.3);for(const x of [.18,1.32])box(.3,1,.1,0xd8a093,x,1,-.2);box(1.5,.14,.8,0xe0b988,.75,.4,-.3);
   table(-.8,.5);const page=box(.5,.03,.55,0xffe7be,-.7,.98,.5);moves.push(t=>page.rotation.z=Math.sin(t*.65)*.09);
   for(let i=0;i<3;i++){const bird=group(-1+i,2.65,.25);parent=bird;const a=mesh(new T.ConeGeometry(.18,.35,3),[0xe8c174,0xc7d3b3,0xd39379][i],0,0,0);a.rotation.z=1.5;parent=g;moves.push(t=>{bird.rotation.y=t*.3+i;bird.position.y=2.6+Math.sin(t*.7+i)*.07;});}
  }else{
   const track=mesh(new T.TorusGeometry(1.1,.035,6,48),0x79604c,0,.12,.15);track.rotation.x=Math.PI/2;track.scale.y=.7;
   const train=group();parent=train;box(.32,.25,.2,0xbd6847,0,.23,0);box(.16,.17,.2,0xe2b775,-.1,.43,0);for(const x of [-.1,.1])for(const z of [-.13,.13])ball(.06,0x5d6250,x,.1,z);parent=g;moves.push(t=>{train.position.set(Math.cos(t*.5)*1.1,0,.15+Math.sin(t*.5)*.77);train.rotation.y=-t*.5;});
   for(let i=0;i<5;i++){const block=box(.32,.32,.32,[0xbf8762,0x84a7a1,0xd5b667][i%3],-1.3+i*.28,.2+(i%2)*.32,-.8);block.rotation.y=i*.3;}const mobile=group(.8,2.1,-.7);parent=mobile;for(let i=0;i<3;i++){const star=mesh(new T.OctahedronGeometry(.14),0xe3b773,i*.4-.4,Math.sin(i)*.2,0);}parent=g;moves.push(t=>mobile.rotation.y=t*.2);
  }
 }
 parent=root;
 // A pitched roof with little fox-ear gables, porch, chimney and drifting smoke.
 for(const side of [-1,1]){const roof=box(7.4,.22,3.5,0xa46548,side*3.15,5.82,0);roof.rotation.z=side*-.22;}
 box(.7,1.9,.7,0xb58566,-4.7,5.4,-.5);box(.9,.16,.85,0xd6ae7f,-4.7,6.4,-.5);
 for(let i=0;i<5;i++){const puff=ball(.15,0xe9dcca,-4.7,6.6,-.5);puff.material.transparent=true;moves.push(t=>{const a=(t*.1+i/5)%1;puff.position.set(-4.7+a*.65,6.6+a*1.5,-.5);puff.scale.setScalar(.7+a*1.5);puff.material.opacity=(1-a)*.23;});}
 // The character remains a crisp, accessible HTML sprite over the 3D room.
 const fox=document.createElement('div');fox.className='house-resident';fox.innerHTML=spriteSVG('rufus');fox.setAttribute('aria-hidden','true');host.append(fox);
 const signs=document.createElement('div');signs.className='house-signs';host.append(signs);
 const buttons=houseRooms.map(r=>{const b=document.createElement('button');b.className='house-sign';b.textContent=r.name;b.setAttribute('aria-label','Enter '+r.name);b.onclick=()=>onSelect(r.id);signs.append(b);return b;});
 const ray=new T.Raycaster(),pointer=new T.Vector2();host.addEventListener('click',event=>{if(event.target.tagName!=='CANVAS')return;const rect=host.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects([...roomGroups.values()],true)[0];if(hit){let o=hit.object;while(o&&!o.userData.room)o=o.parent;if(o)onSelect(o.userData.room);}});
 const center=new T.Vector3(0,1.7,0),target=new T.Vector3(0,1.7,0);let zoom=1,goalZoom=1;
 function layout(){const aspect=host.clientWidth/Math.max(1,host.clientHeight);const halfW=Math.max(7.8,6*aspect);camera.left=-halfW;camera.right=halfW;camera.top=halfW/aspect;camera.bottom=-halfW/aspect;camera.zoom=zoom;camera.position.set(center.x+.5,center.y+3.0,24);camera.lookAt(center.x,center.y,0);camera.updateProjectionMatrix();camera.updateMatrixWorld();const point=new T.Vector3();houseRooms.forEach((r,i)=>{point.set(r.x,r.y-.06,1.5).project(camera);buttons[i].style.left=(point.x*.5+.5)*100+'%';buttons[i].style.top=(-point.y*.5+.5)*100+'%';buttons[i].hidden=!!focus;buttons[i].setAttribute('aria-pressed',String(selected===r.id));});const r=houseRooms.find(r=>r.id===selected);point.set(r.x-.65,r.y+.7,.95).project(camera);fox.style.left=(point.x*.5+.5)*100+'%';fox.style.top=(-point.y*.5+.5)*100+'%';fox.style.width=(focus?62:37)+'px';}
 function paint(){if(!active)return;layout();renderer.paint(scene,camera,host);}
 function loop(stamp){if(!active)return;const dt=previous?Math.min((stamp-previous)/1000,.05):0;previous=stamp;if(motion){time+=dt;moves.forEach(move=>move(time));center.lerp(target,1-Math.exp(-dt*5));zoom+=(goalZoom-zoom)*(1-Math.exp(-dt*5));}else{center.copy(target);zoom=goalZoom;}paint();if(motion)frame=requestAnimationFrame(loop);}
 function refresh(){cancelAnimationFrame(frame);previous=0;if(active){if(motion)frame=requestAnimationFrame(loop);else{center.copy(target);zoom=goalZoom;paint();}}}
 const observer=new ResizeObserver(paint);observer.observe(host);
 return {select(id,enter=false){selected=id;if(enter||focus){focus=id;const r=houseRooms.find(r=>r.id===id);target.set(r.x,r.y+1.4,0);goalZoom=2.45;}refresh();},overview(){focus=null;target.set(0,1.7,0);goalZoom=1;refresh();},setActive(value){active=value;refresh();},setNight(value){night=value;ambient.intensity=night?1.25:2.8;sun.intensity=night?.65:2.6;sun.color.set(night?0xb3bded:0xffeccb);windows.forEach(w=>{w.material.color.set(night?0x263d64:0x9ec2c4);w.material.emissive.set(night?0x273652:0x000000);w.material.emissiveIntensity=.25;});bulbs.forEach(b=>b.material.emissiveIntensity=night?2:.25);refresh();},setMotion(value){motion=value;refresh();},dispose(){cancelAnimationFrame(frame);observer.disconnect();}};
}
