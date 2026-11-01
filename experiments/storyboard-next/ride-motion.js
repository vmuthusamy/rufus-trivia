// Each ride builds its shapes once, then moves those shapes as time passes.
// Change a speed below and refresh to make a ride faster or slower.
export function buildRide(T, id, group, tools) {
 const {box, sphere, cylinder, mesh, tree}=tools;
 const motions=[];
 const part=()=>{const g=new T.Group();group.add(g);return g;};
 const curveFrom=points=>new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),true,'centripetal');
 const rail=(parent,curve,color,radius=.045)=>{const m=mesh(parent,new T.TubeGeometry(curve,100,radius,6,true),color);m.userData.glow=true;return m;};
 function follow(object,curve,seconds,offset=0,lift=0){
  const point=new T.Vector3(),tangent=new T.Vector3(),ahead=new T.Vector3();
  motions.push(time=>{const u=(time/seconds+offset)%1;curve.getPointAt(u,point);curve.getTangentAt(u,tangent);object.position.copy(point);object.position.y+=lift;ahead.copy(object.position).add(tangent);object.lookAt(ahead);});
 }
 if(id==='animals'){
  const water=cylinder(group,1.45,.07,0x83b9b8,0,.03,0);water.scale.z=.72;water.userData.glow=true;
  for(const [x,z] of [[-1.3,-.8],[1.3,-.75],[-1.4,.65]])tree(group,x,z);
  box(group,.08,1.6,.08,0x956b42,-1.35,.8,.9);box(group,.08,1.6,.08,0x956b42,1.35,.8,.9);box(group,2.9,.35,.18,0x739956,0,1.5,.9);
  const boat=part();box(boat,.48,.22,.85,0xcd9353,0,.19,0);box(boat,.35,.12,.55,0xffdd8c,0,.33,0);box(boat,.32,.32,.12,0x71986a,0,.4,-.15);
  const river=curveFrom([[0,.09,.65],[1,.09,.2],[.7,.09,-.55],[-.7,.09,-.55],[-1,.09,.2]]);follow(boat,river,19);
  for(let i=0;i<3;i++){const ripple=mesh(group,new T.TorusGeometry(.27,.014,4,24),0xc8efe0,.5,.085,-.1);ripple.rotation.x=-Math.PI/2;ripple.material.transparent=true;motions.push(time=>{const progress=(time*.25+i/3)%1;ripple.scale.setScalar(.4+progress*2);ripple.material.opacity=(1-progress)*.55;});}
 }
 if(id==='science'){
  mesh(group,new T.ConeGeometry(1.05,2.3,7),0x7a82a8,0,1.1,-.2);mesh(group,new T.ConeGeometry(.65,1.5,6),0xa1abc2,.65,.7,.25);
  const track=curveFrom([[-1.55,.38,.95],[-1.4,1.05,-.7],[-.35,2.1,-1.05],[1.4,1.4,-.45],[1.4,.45,.85],[0,.3,1.35]]);
  rail(group,track,0xe4b565,.065);
  for(let i=0;i<12;i++){const p=track.getPointAt(i/12);box(group,.035,p.y,.035,0x898caa,p.x,p.y/2,p.z);}
  for(let i=0;i<2;i++){const car=part();box(car,.38,.22,.52, i?0x83c7c4:0xeeb861,0,.16,0);box(car,.3,.2,.12,0x714e83,0,.31,-.15);const lamp=sphere(car,.07,0xffe6a1,0,.22,.27);lamp.material.emissive.set(0xffdf8c);follow(car,track,11,i*.047,.04);}
  const planet=part();planet.position.set(.75,2.65,-.3);sphere(planet,.34,0xdfbd74,0,0,0);const ring=mesh(planet,new T.TorusGeometry(.52,.035,6,32),0xf9e6b2);ring.rotation.x=.65;motions.push(t=>planet.rotation.y=t*.14);
 }
 if(id==='culture'){
  cylinder(group,1.3,.2,0xe1b56c,0,.08,0);cylinder(group,.09,1.8,0xd4ad60,0,1,0);
  const carousel=part();mesh(carousel,new T.ConeGeometry(1.6,.85,12),0xcb8277,0,2.2,0);sphere(carousel,.13,0xf1cc69,0,2.75,0);
  for(let n=0;n<6;n++){const a=n*Math.PI/3,x=Math.cos(a),z=Math.sin(a);cylinder(carousel,.035,1.55,0xf5d79a,x,.95,z);const horse=new T.Group();horse.position.set(x,.75,z);horse.rotation.y=-a;carousel.add(horse);box(horse,.43,.23,.23,0xf7eacb,0,0,0);sphere(horse,.12,0xc99068,.2,.21,0);box(horse,.1,.28,.1,0xf7eacb,-.12,-.16,0);motions.push(t=>horse.position.y=.75+Math.sin(t*1.5+n)*.16);}
  motions.push(t=>carousel.rotation.y=t*.22);
 }
 if(id==='flags'){
  for(let n=0;n<3;n++){const balloon=part();const x=(n-1)*.95,z=n%2*.5,y=1.85+(n%2)*.55;const envelope=sphere(balloon,.59,[0xd48769,0x77a6a4,0xd8ba68][n],0,0,0);envelope.scale.y=1.22;box(balloon,.32,.27,.3,0xb28a55,0,-1.12,0);for(const dx of [-.12,.12])box(balloon,.015,.55,.015,0xdcc79e,dx,-.77,0);motions.push(t=>{balloon.position.set(x+Math.sin(t*.45+n)*.12,y+Math.sin(t*.7+n*2)*.2,z);balloon.rotation.z=Math.sin(t*.55+n)*.045;});}
 }
 if(id==='math'){
  const rotor=part();rotor.position.y=1.6;mesh(rotor,new T.TorusGeometry(1.28,.09,8,48),0xd8ad5d);const cabins=[];
  for(let n=0;n<8;n++){const a=n*Math.PI/4,x=Math.cos(a)*1.27,y=Math.sin(a)*1.27;const spoke=box(rotor,1.27,.035,.035,0xf7e3a6,x/2,y/2,0);spoke.rotation.z=a;const cabin=new T.Group();cabin.position.set(x,y,.12);rotor.add(cabin);box(cabin,.4,.3,.35,[0xc37e69,0x6d9d97,0xdebe68][n%3],0,-.18,0);box(cabin,.43,.045,.39,0xf9df9c,0,.13,0);for(const dx of [-.17,.17])box(cabin,.025,.3,.025,0xf7e3a6,dx,0,0);cabins.push(cabin);}
  const l=box(group,.12,1.9,.12,0x819778,-.45,.8,-.08);l.rotation.z=-.38;const rr=box(group,.12,1.9,.12,0x819778,.45,.8,-.08);rr.rotation.z=.38;
  motions.push(t=>{rotor.rotation.z=t*.15;cabins.forEach(cabin=>cabin.rotation.z=-rotor.rotation.z);});
 }
 if(id==='mix'){
  const points=Array.from({length:12},(_,i)=>[Math.cos(i*Math.PI/6)*1.6,.12,Math.sin(i*Math.PI/6)*1.2]);const track=curveFrom(points);rail(group,track,0x927d60,.055);
  for(let n=0;n<3;n++){const car=part();box(car,.43,.32,.65,n?0xc78168:0x69958d,0,.35,0);if(n===0){cylinder(car,.09,.26,0xd09861,0,.63,.17);box(car,.4,.32,.25,0xe0b476,0,.62,-.16);box(car,.5,.07,.36,0xf4d99b,0,.82,-.16);}for(const x of [-.24,.24])for(const z of [-.21,.21]){const wheel=cylinder(car,.1,.06,0x665f4a,x,.18,z);wheel.rotation.z=Math.PI/2;}follow(car,track,18,n*.085);}
  box(group,.8,.65,.6,0xe5ce9e,0,.35,0);mesh(group,new T.ConeGeometry(.75,.45,4),0xbb795d,0,.88,0).rotation.y=Math.PI/4;
 }
 // The paused pose still shows every ride clearly.
 motions.forEach(move=>move(0));
 return time=>motions.forEach(move=>move(time));
}
