import {createSceneMusic} from './scene-music.js';
import {getRenderer} from './stage.js';
import {createJourney} from './journey.js';
import {books} from './fox-house-data.js';
import {rides} from './park-data.js';
import {createPark} from './park-stage.js';
import {spriteSVG} from './sprites.js';
const $=id=>document.getElementById(id);
const sceneMusic=createSceneMusic();
let refreshRoomMotion=()=>{},journeyActive=false,adventureOpener=null;let parkPromise;
function ensurePark(){if(!parkPromise)parkPromise=createPark($('park-map'),selectBook).then(api=>{park=api;park.select(selected.id);park.setActive(theme==='park');park.setNight(night);syncMotion();return api;});return parkPromise;}

let selected=books[1],theme='house',night=false,step=0,answered=false,stop=0,park;
// The chair belongs to Rufus's button, so it rocks together with him.
const chair=document.createElementNS('http://www.w3.org/2000/svg','svg');chair.setAttribute('viewBox','0 0 190 210');chair.setAttribute('aria-hidden','true');chair.classList.add('rocking-chair');chair.innerHTML='<rect x="32" y="20" width="126" height="126" rx="18" fill="#956342" stroke="#c69969" stroke-width="8"/><path d="M56 32v105M82 28v110M108 28v110M134 32v105" stroke="#c39462" stroke-width="7"/><rect x="25" y="123" width="140" height="28" rx="10" fill="#718b7d" stroke="#bd946b" stroke-width="5"/><path d="M38 146l-8 44M152 146l8 44M17 110h37M136 110h37" stroke="#c59968" stroke-width="10" stroke-linecap="round"/><path d="M10 187q85 32 170 0" stroke="#cda471" stroke-width="10" fill="none" stroke-linecap="round"/>';$('rufus').prepend(chair);
$('brand-fox').innerHTML=spriteSVG('rufus');$('rufus-sprite').innerHTML=spriteSVG('rufus');
const progress=document.createElement('div');progress.id='journey-progress';progress.className='ride-progress';$('dialog-copy').after(progress);
const shelves=$('shelves');for(let row=0;row<3;row++){const shelf=document.createElement('div');shelf.className='shelf';for(const book of books.slice(row*2,row*2+2)){const button=document.createElement('button');button.className='book';button.dataset.book=book.id;button.style.setProperty('--book',book.color);button.setAttribute('aria-label',`Choose ${book.label}`);button.innerHTML=`<span class="book-cover"><span class="book-icon" aria-hidden="true">${book.icon}</span><span class="spine-title">${book.short}</span></span><span class="category">${book.label}</span>`;button.onclick=()=>selectBook(book.id);shelf.append(button);}shelves.append(shelf);}
function currentStory(){return theme==='park'?{...selected,...rides[selected.id]}:selected;}
function selectBook(id){selected=books.find(book=>book.id===id);const b=currentStory();document.querySelectorAll('[data-book]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.book===id)));$('category-tag').textContent=theme==='park'?b.kind:selected.label.toUpperCase();$('bookmark').textContent=String(books.indexOf(selected)+1).padStart(2,'0');$('guide-art').innerHTML=spriteSVG(selected.guide);$('guide-name').textContent='YOUR GUIDE · '+selected.guideName.toUpperCase();$('adventure-title').textContent=theme==='park'?b.name:b.title;$('adventure-description').textContent=b.description;$('role-name').textContent=b.role;$('quick-open').textContent=theme==='park'?'Ride '+b.short+' →':'Open '+selected.short+' →';$('open-book').textContent=theme==='park'?'Board this ride →':'Open this book →';document.querySelector('.invite>small').textContent=selected.id==='animals'?'Real solo game · 15 seconds per question · 3 hearts':theme==='park'?'3 sample stops · no timer':'Sample story · no timer';if(id==='animals'){$('guide-art').innerHTML=spriteSVG('rufus')+spriteSVG('fiery');$('guide-name').textContent='YOUR GUIDES · RUFUS & FIERY';$('adventure-description').textContent='Explore fox facts, dinosaur discoveries and wild animals with Rufus or Fiery.';if(theme==='house')$('adventure-title').textContent='The wildlife notebook';$('open-book').textContent=theme==='park'?'Play Animal Kingdom →':'Open Animal Kingdom →';}
 $('greeting').textContent=`${selected.guideName} has an adventure in ${selected.short} for you!`;park?.select(id);}
document.querySelectorAll('[data-story]').forEach(el=>el.onclick=()=>{selectBook(el.dataset.story);openAdventure();});
const greetings=['I’ve saved you a cozy spot. Which book shall we open?','Every book has a little world inside. Try pulling one from the shelf!','You can be a detective, an explorer, or our picnic planner.','Take your time. We learn something even when we try a different answer.'];let hello=0;$('rufus').onclick=()=>{$('greeting').textContent=greetings[(hello++)%greetings.length];};
function changeTheme(value){theme=value;document.body.dataset.setting=theme;const isPark=theme==='park';if(isPark)ensurePark();document.querySelectorAll('[data-theme]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.theme===theme)));$('park-world').hidden=!isPark;$('watch-ride').hidden=!isPark;document.querySelector('.bookcase').hidden=isPark;document.querySelector('h1').textContent=isPark?'Your next adventure is a ride away.':'Welcome to the Fox House.';document.querySelector('.welcome>div>p:last-child').textContent=isPark?'Choose a ride. Rufus will meet you at the entrance.':'Pick a book from Rufus’s shelf. Step into a little adventure.';$('setting-label').textContent=isPark?'THE CARNIVAL MAP':'THE LIVING ROOM';$('theme-description').textContent=isPark?'Safari boats, a space coaster and carnival rides. Animal Kingdom connects to the real trivia game.':'A warm room, a full bookshelf, and your fox friends.';$('home-label').textContent=isPark?'Your next stop awaits':'Make yourself at home';document.querySelector('.house').setAttribute('aria-label',isPark?'Interactive Rufus theme park':'Interactive Fox House');document.querySelector('.adventure-section').hidden=isPark;selectBook(selected.id);park?.setActive(isPark);park?.setNight(night);updateAtmosphere();drawRoom();}
document.querySelectorAll('[data-theme]').forEach(el=>el.onclick=()=>changeTheme(el.dataset.theme));
$('light').onclick=()=>{night=!night;document.body.dataset.night=String(night);$('light').textContent=night?'☾ Evening':'☀ Daytime';$('light').setAttribute('aria-pressed',String(night));park?.setNight(night);updateAtmosphere();drawRoom();};

// Motion is scenery only. Pause it during questions, in hidden tabs, or by choice.
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
let motionOn=!motionPreference.matches,motionChosen=false;
function syncMotion(){
 const paused=!motionOn||document.hidden||$('adventure').open||journeyActive;
 document.body.dataset.motion=paused?'paused':'running';
 $('effects').textContent=motionOn?'Pause motion':'Play motion';
 $('effects').removeAttribute('aria-pressed');$('effects').title=motionOn?'Pause decorative motion':'Play decorative motion';
 sceneMusic.setReading(journeyActive||$('adventure').open);park?.setMotion(!paused);refreshRoomMotion();
}
$('effects').onclick=()=>{motionChosen=true;motionOn=!motionOn;syncMotion();};
motionPreference.addEventListener('change',()=>{if(!motionChosen)motionOn=!motionPreference.matches;syncMotion();});
document.addEventListener('visibilitychange',syncMotion);
new MutationObserver(syncMotion).observe($('adventure'),{attributes:true,attributeFilter:['open']});
function updateAtmosphere(){
 sceneMusic.setScene(theme,night);
 document.querySelector('.window-label').textContent=night?'The stars are out. The fire is warm.':'A good day for discovering things.';
 if(theme==='house')$('greeting').textContent=night?'Come sit by the fire. Pick a book and we’ll explore together.':'I’ve saved you a cozy spot. Which book shall we open?';
 document.querySelector('.park-banner small').textContent=night?'Follow the lights. Your next ride is waiting.':'Six rides. A whole world of discoveries.';
 syncMotion();
}
// Fixed star positions keep this little sky the same every time you visit.
for(let i=0;i<42;i++){const star=document.createElement('i');star.style.cssText=`left:${(i*37+11)%100}%;top:${(i*23+7)%95}%;--delay:${-(i%9)}s;--size:${i%4===0?3:2}px`;document.querySelector('.sky-stars').append(star);}
syncMotion();

function openAdventure(){adventureOpener=document.activeElement;if(selected.id==='animals'){journey.open(theme);return;}step=0;stop=0;answered=false;renderAdventure();$('adventure').showModal();$('continue').focus();}
function renderAdventure(){const b=currentStory(),isPark=theme==='park',q=isPark?b.stops[stop]:selected;$('dialog-category').textContent=isPark?b.name.toUpperCase():b.label.toUpperCase();$('dialog-step').textContent=isPark?(step===0?'BOARDING':step===1?`STOP ${stop+1} OF 3`:'BACK AT THE GATE'):['YOUR MISSION','TRY A QUESTION','YOUR DISCOVERY'][step];$('dialog-fox').innerHTML=spriteSVG(selected.guide);$('dialog-title').textContent=step===0?(isPark?b.name:b.title):step===1?(isPark?q.name:'What do you think?'):(isPark?'What a ride!':'A discovery for your notebook');$('dialog-copy').textContent=step===0?b.description:step===1?q.question:b.ending;$('pretend').textContent=step===0?'Try a little pretend: '+b.pretend:'';$('answer-note').textContent=step===2?(isPark?'You explored all three stops. Every answer helped us discover something.':b.fact):'';$('choices').replaceChildren();progress.replaceChildren();if(isPark)b.stops.forEach((item,i)=>{const node=document.createElement('span');node.textContent=(i+1)+' · '+item.name;node.className=step===2||i<stop?'done':step===1&&i===stop?'current':'';progress.append(node);});$('back-home').hidden=step===2;$('back-home').textContent=isPark?'Back to the park':'Back to the bookshelf';$('continue').hidden=step===1;$('continue').textContent=step===0?(isPark?'All aboard →':'Let’s begin →'):(isPark?'Explore another ride →':'Back to the bookshelf →');if(step===1){q.choices.forEach((choice,i)=>{const button=document.createElement('button');button.textContent=choice;button.onclick=()=>{if(answered)return;answered=true;$('answer-note').textContent=(i===q.answer?'You found it! ':'Let’s discover it together. ')+q.fact;for(const el of $('choices').children)el.disabled=true;$('continue').hidden=false;$('continue').textContent=isPark?(stop<2?'Next stop →':'Return to the gate →'):'Finish our little story →';$('continue').focus();};$('choices').append(button);});}}
$('watch-ride').onclick=()=>{park?.focus();document.querySelector('.house').scrollIntoView({behavior:motionOn?'smooth':'instant',block:'start'});};
$('open-book').onclick=openAdventure;$('quick-open').onclick=openAdventure;$('continue').onclick=()=>{if(step===2){$('adventure').close();return;}if(theme==='park'&&step===1&&stop<2){stop++;answered=false;}else step++;renderAdventure();if(step===1)$('choices').firstElementChild.focus();else $('continue').focus();};$('back-home').onclick=()=>{$('adventure').close();};$('adventure').addEventListener('close',()=>{if(adventureOpener?.isConnected)adventureOpener.focus();});
selectBook('animals');$('greeting').innerHTML='I’ve saved you a cozy spot.<br>Which book shall we open?';

// The room is scenery. Real buttons and words stay in HTML, even without WebGL.
let THREE,renderer,scene,camera,room,roomAmbient,roomSun,roomMoves=[],roomFrame=0,roomTime=0,roomPrevious=0;const host=$('room-art');
async function initRoom(){try{THREE=await import('three');renderer=await getRenderer();scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-6,6,4.4,-4.4,.1,50);camera.position.set(0,4,12);camera.lookAt(0,0,0);roomAmbient=new THREE.HemisphereLight(0xfff2d4,0x7a5546,3);scene.add(roomAmbient);roomSun=new THREE.DirectionalLight(0xffedce,2.4);roomSun.position.set(-5,6,8);scene.add(roomSun);const observer=new ResizeObserver(()=>drawRoom());observer.observe(host);addEventListener('pagehide',()=>observer.disconnect(),{once:true});drawRoom();}catch(error){host.dataset.fallback='true';$('graphics-note').hidden=false;}}
function shape(g,c,x,y,z){const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:c,roughness:1}));m.position.set(x,y,z);room.add(m);return m;}
const box=(w,h,d,c,x,y,z)=>shape(new THREE.BoxGeometry(w,h,d),c,x,y,z);
const roomCache=new Map();
function drawRoom(){if(!renderer||theme==='park'){refreshRoomMotion();return;}const halfW=6,halfH=halfW/Math.max(.1,host.clientWidth/host.clientHeight);camera.left=-halfW;camera.right=halfW;camera.top=halfH;camera.bottom=-halfH;camera.updateProjectionMatrix();roomMoves=[];roomAmbient.intensity=night?1.35:3;roomSun.intensity=night?.9:2.4;roomSun.color.set(night?0xffb467:0xffedce);if(room)scene.remove(room);const cached=roomCache.get(night);if(cached){room=cached.room;roomMoves=cached.moves;scene.add(room);renderer.paint(scene,camera,host);refreshRoomMotion();return;}room=new THREE.Group();scene.add(room);
 if(theme==='house'){box(14,8,.18,night?0x384255:0xe8d7b7,0,1,-2.5);box(14,.1,8,night?0x84604b:0xc3a77b,0,-2.15,0);for(let i=0;i<13;i++)box(.025,.025,8,0xa68e68,-6+i,-2.07,0);box(14,.12,.1,0xc09f73,0,-1.35,-2.3);
 // A framed window, curtains, an armchair and a little reading lamp.
 box(2.8,2.6,.18,0xf7ebce,-3.2,1.1,-2.15);box(2.5,2.3,.06,night?0x334757:0xb1cbb7,-3.2,1.1,-2);if(night){const moon=shape(new THREE.SphereGeometry(.26,20,12),0xffeac0,-3.8,1.75,-1.94);moon.material.emissive.set(0xffe0a5);moon.material.emissiveIntensity=.8;for(let i=0;i<12;i++){const star=shape(new THREE.SphereGeometry(.018,6,4),0xfff8dc,-4.25+(i*0.37)%2, .2+(i*.43)%1.9,-1.93);star.material.emissive.set(0xfff8dc);}}
 box(.09,2.3,.1,0xf9efd6,-3.2,1.1,-1.9);box(2.5,.09,.1,0xf9efd6,-3.2,1.1,-1.9);const curtains=[box(.45,2.8,.15,0xd0a675,-4.7,1.1,-1.8),box(.45,2.8,.15,0xd0a675,-1.7,1.1,-1.8)];roomMoves.push(t=>curtains.forEach((curtain,i)=>{curtain.rotation.z=Math.sin(t*.6+i)*.018;curtain.scale.x=1+Math.sin(t*.7+i)*.035;}));
 box(2.2,1,.8,0xb8b085,-3.3,-1.1,-.7);box(2.2,.5,1.4,0xc7be96,-3.3,-1.4,-.25);for(const x of [-4.45,-2.15])box(.25,.75,1.4,0xaea776,x,-1.15,-.25);box(.95,.5,.28,0xe5d4aa,-3.3,-.87,-.08);box(.07,2.8,.07,0x82785d,-5,-.7,-.5);const shade=shape(new THREE.ConeGeometry(.6,.7,24,1,true),0xf3dfad,-5,.9,-.5);if(night){shade.material.emissive.set(0xffb95c);shade.material.emissiveIntensity=.6;const lamp=new THREE.PointLight(0xffbb64,12,8,2);lamp.position.set(-5,.65,0);room.add(lamp);const fireLight=new THREE.PointLight(0xff8e40,15,8,2);fireLight.position.set(-4,-1,2);room.add(fireLight);roomMoves.push(t=>fireLight.intensity=14+Math.sin(t*2)*1.1+Math.sin(t*3.7)*.5);}shape(new THREE.CylinderGeometry(.7,.7,.05,36),0xc59862,-3.5,-2,1);
 }else{box(14,.1,8,night?0x668476:0xb8cfa3,0,-2.15,0);for(const [x,z] of [[-4,-1],[-1,-2],[4,-2]]){box(.24,2.1,.25,0x997758,x,-1,z);shape(new THREE.IcosahedronGeometry(1.1,1),night?0x526e60:0x89a46f,x,.6,z);}box(3,.18,1,0xc59d73,-3.3,-.6,0);for(const x of [-4.4,-2.2])box(.14,1.5,.14,0xa3815c,x,-1.3,0);for(let i=0;i<7;i++){const flag=shape(new THREE.ConeGeometry(.3,.5,3),[0xd18c67,0xdbbb72,0x8fa87b][i%3],-5+i*.85,2.4-Math.sin(i/6*Math.PI)*.5,-.5);flag.rotation.z=Math.PI;} }
 const fern=shape(new THREE.ConeGeometry(.4,1.1,7),0x788d60,-5.1,-1.3,1.5);shape(new THREE.CylinderGeometry(.28,.2,.5,12),0xb78162,-5.1,-1.8,1.5);
 roomCache.set(night,{room,moves:roomMoves});renderer.paint(scene,camera,host);refreshRoomMotion();}
// A room has a slower rhythm than the carnival, but shares its pause rules.
refreshRoomMotion=()=>{
 cancelAnimationFrame(roomFrame);roomPrevious=0;
 if(!renderer||theme!=='house'||document.body.dataset.motion==='paused')return;
 function frame(time){
  if(theme!=='house'||document.hidden||document.body.dataset.motion==='paused')return;
  const delta=roomPrevious?Math.min((time-roomPrevious)/1000,.05):0;roomPrevious=time;roomTime+=delta;
  roomMoves.forEach(move=>move(roomTime));renderer.paint(scene,camera,host);roomFrame=requestAnimationFrame(frame);
 }
 roomFrame=requestAnimationFrame(frame);
};
initRoom();

// A shareable local preview link can open straight into the park.
if(new URLSearchParams(location.search).get('theme')==='park')changeTheme('park');

if(new URLSearchParams(location.search).get('night')==='1')$('light').click();

const journey=createJourney({onOpen(){journeyActive=true;document.querySelector('.bookcase').inert=true;document.body.dataset.journey='true';syncMotion();if(theme==='park')ensurePark().then(p=>p.setJourney(0));},onState(state){sceneMusic.state(state);if(theme==='park')park?.setJourney(state.qi);},onClose(){journeyActive=false;document.querySelector('.bookcase').inert=false;delete document.body.dataset.journey;park?.setJourney(null);syncMotion();drawRoom();if(adventureOpener?.isConnected)adventureOpener.focus();}});
addEventListener('pagehide',event=>{if(event.persisted)return;cancelAnimationFrame(roomFrame);park?.dispose();journey.dispose();sceneMusic.dispose();},{once:true});
