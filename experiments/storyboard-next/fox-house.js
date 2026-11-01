import {createHouse} from './house-stage.js';
import {houseRooms} from './house-rooms.js';
import {createSceneMusic} from './scene-music.js';
import {getRenderer} from './stage.js';
import {createJourney} from './journey.js';
import {books} from './fox-house-data.js';
import {rides} from './park-data.js';
import {createPark} from './park-stage.js';
import {spriteSVG} from './sprites.js';
const $=id=>document.getElementById(id);
const sceneMusic=createSceneMusic();
let home;let refreshRoomMotion=()=>{},journeyActive=false,adventureOpener=null;let parkPromise;
function ensurePark(){if(!parkPromise)parkPromise=createPark($('park-map'),selectBook).then(api=>{park=api;park.select(selected.id);park.setActive(theme==='park');park.setNight(night);syncMotion();return api;});return parkPromise;}

let atlasMode='countries';const atlasModes={countries:'Country Maps',capitals:'Capital Quest',states:'US State Explorer',flags:'Flag Frenzy'};
let selected=books[1],theme='house',night=false,step=0,answered=false,stop=0,park;
// The chair belongs to Rufus's button, so it rocks together with him.
const chair=document.createElementNS('http://www.w3.org/2000/svg','svg');chair.setAttribute('viewBox','0 0 190 210');chair.setAttribute('aria-hidden','true');chair.classList.add('rocking-chair');chair.innerHTML='<rect x="32" y="20" width="126" height="126" rx="18" fill="#956342" stroke="#c69969" stroke-width="8"/><path d="M56 32v105M82 28v110M108 28v110M134 32v105" stroke="#c39462" stroke-width="7"/><rect x="25" y="123" width="140" height="28" rx="10" fill="#718b7d" stroke="#bd946b" stroke-width="5"/><path d="M38 146l-8 44M152 146l8 44M17 110h37M136 110h37" stroke="#c59968" stroke-width="10" stroke-linecap="round"/><path d="M10 187q85 32 170 0" stroke="#cda471" stroke-width="10" fill="none" stroke-linecap="round"/>';$('rufus').prepend(chair);
$('brand-fox').innerHTML=spriteSVG('rufus');$('rufus-sprite').innerHTML=spriteSVG('rufus');
const progress=document.createElement('div');progress.id='journey-progress';progress.className='ride-progress';$('dialog-copy').after(progress);
const shelves=$('shelves');for(let row=0;row<3;row++){const shelf=document.createElement('div');shelf.className='shelf';for(const book of books.slice(row*2,row*2+2)){const button=document.createElement('button');button.className='book';button.dataset.book=book.id;button.style.setProperty('--book',book.color);button.setAttribute('aria-label',`Choose ${book.label}`);button.innerHTML=`<span class="book-cover"><span class="book-icon" aria-hidden="true">${book.icon}</span><span class="spine-title">${book.short}</span></span><span class="category">${book.label}</span>`;button.onclick=()=>selectBook(book.id);shelf.append(button);}shelves.append(shelf);}
function currentStory(){return theme==='park'?{...selected,...rides[selected.id]}:selected;}
function selectBook(id){selected=books.find(book=>book.id===id);const b=currentStory();document.querySelectorAll('[data-book]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.book===id)));$('category-tag').textContent=id==='flags'?'GEOGRAPHY':theme==='park'?b.kind:selected.label.toUpperCase();$('bookmark').textContent=String(books.indexOf(selected)+1).padStart(2,'0');$('guide-art').innerHTML=spriteSVG(selected.guide);$('guide-name').textContent='YOUR GUIDE · '+selected.guideName.toUpperCase();$('adventure-title').textContent=theme==='park'?b.name:b.title;$('adventure-description').textContent=b.description;$('role-name').textContent=b.role;$('quick-open').textContent=theme==='park'?'Ride '+b.short+' →':'Open '+selected.short+' →';$('open-book').textContent=theme==='park'?'Board this ride →':'Open this book →';document.querySelector('.invite>small').textContent=selected.id==='animals'?'Real solo game · 15 seconds per question · 3 hearts':theme==='park'?'3 sample stops · no timer':'Sample story · no timer';if(id==='animals'){$('guide-art').innerHTML=spriteSVG('rufus')+spriteSVG('fiery');$('guide-name').textContent='YOUR GUIDES · RUFUS & FIERY';$('adventure-description').textContent='Explore fox facts, dinosaur discoveries and wild animals with Rufus or Fiery.';if(theme==='house')$('adventure-title').textContent='The wildlife notebook';$('open-book').textContent=theme==='park'?'Play Animal Kingdom →':'Open Animal Kingdom →';}
 $('atlas-options').hidden=id!=='flags';if(id==='flags'){$('open-book').textContent='Play '+atlasModes[atlasMode]+' →';$('quick-open').textContent='Play '+atlasModes[atlasMode]+' →';$('adventure-description').textContent='Countries, capital cities, US states or flags. Choose your next destination.';}document.querySelector('.invite>small').textContent='Real solo game · 15 seconds per question · 3 hearts';
 $('greeting').textContent=`${selected.guideName} has an adventure in ${selected.short} for you!`;park?.select(id);home?.select(id);document.querySelectorAll('[data-room-choice]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.roomChoice===id)));if(theme==='house'){const r=houseRooms.find(r=>r.id===id);$('adventure-title').textContent=r.name;$('adventure-description').textContent=r.description;$('quick-open').textContent='Play '+(id==='flags'?atlasModes[atlasMode]:selected.short)+' →';$('open-book').textContent='Play '+(id==='flags'?atlasModes[atlasMode]:selected.label)+' →';}}
document.querySelectorAll('[data-story]').forEach(el=>el.onclick=()=>{selectBook(el.dataset.story);openAdventure();});
const greetings=['I’ve saved you a cozy spot. Which book shall we open?','Every book has a little world inside. Try pulling one from the shelf!','You can be a detective, an explorer, or our picnic planner.','Take your time. We learn something even when we try a different answer.'];let hello=0;$('rufus').onclick=()=>{$('greeting').textContent=greetings[(hello++)%greetings.length];};
function changeTheme(value){theme=value;const url=new URL(location.href);if(theme==='park')url.searchParams.set('theme','park');else url.searchParams.delete('theme');history.replaceState(null,'',url);document.body.dataset.setting=theme;const isPark=theme==='park';if(isPark)ensurePark();document.querySelectorAll('[data-theme]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.theme===theme)));$('park-world').hidden=!isPark;$('watch-ride').hidden=!isPark;document.querySelector('.bookcase').hidden=true;$('house-world').hidden=isPark;document.querySelector('h1').textContent=isPark?'Your next adventure is a ride away.':'Welcome to the Fox House.';document.querySelector('.welcome>div>p:last-child').textContent=isPark?'Choose a ride. Rufus will meet you at the entrance.':'Which room shall we explore today?';$('setting-label').textContent=isPark?'THE CARNIVAL MAP':'RUFUS’S FOX HOUSE';$('theme-description').textContent=isPark?'Safari boats, a space coaster and carnival rides. Every ride connects to the real trivia game.':'Six cozy rooms, each with a different adventure.';$('home-label').textContent=isPark?'Your next stop awaits':'Make yourself at home';document.querySelector('.house').setAttribute('aria-label',isPark?'Interactive Rufus theme park':'Interactive Fox House');document.querySelector('.adventure-section').hidden=true;selectBook(selected.id);park?.setActive(isPark);park?.setNight(night);updateAtmosphere();drawRoom();}
document.querySelectorAll('[data-theme]').forEach(el=>el.onclick=()=>changeTheme(el.dataset.theme));
$('light').onclick=()=>{night=!night;const url=new URL(location.href);if(night)url.searchParams.set('night','1');else url.searchParams.delete('night');history.replaceState(null,'',url);document.body.dataset.night=String(night);$('light').textContent=night?'☾ Evening':'☀ Daytime';$('light').setAttribute('aria-pressed',String(night));park?.setNight(night);updateAtmosphere();drawRoom();};

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

function openAdventure(){adventureOpener=document.activeElement;{const topic=selected.id==='flags'?atlasMode:selected.id;journey.open(theme,topic,selected.id==='flags'?atlasModes[atlasMode]:selected.label);return;}step=0;stop=0;answered=false;renderAdventure();$('adventure').showModal();$('continue').focus();}
function renderAdventure(){const b=currentStory(),isPark=theme==='park',q=isPark?b.stops[stop]:selected;$('dialog-category').textContent=isPark?b.name.toUpperCase():b.label.toUpperCase();$('dialog-step').textContent=isPark?(step===0?'BOARDING':step===1?`STOP ${stop+1} OF 3`:'BACK AT THE GATE'):['YOUR MISSION','TRY A QUESTION','YOUR DISCOVERY'][step];$('dialog-fox').innerHTML=spriteSVG(selected.guide);$('dialog-title').textContent=step===0?(isPark?b.name:b.title):step===1?(isPark?q.name:'What do you think?'):(isPark?'What a ride!':'A discovery for your notebook');$('dialog-copy').textContent=step===0?b.description:step===1?q.question:b.ending;$('pretend').textContent=step===0?'Try a little pretend: '+b.pretend:'';$('answer-note').textContent=step===2?(isPark?'You explored all three stops. Every answer helped us discover something.':b.fact):'';$('choices').replaceChildren();progress.replaceChildren();if(isPark)b.stops.forEach((item,i)=>{const node=document.createElement('span');node.textContent=(i+1)+' · '+item.name;node.className=step===2||i<stop?'done':step===1&&i===stop?'current':'';progress.append(node);});$('back-home').hidden=step===2;$('back-home').textContent=isPark?'Back to the park':'Back to the bookshelf';$('continue').hidden=step===1;$('continue').textContent=step===0?(isPark?'All aboard →':'Let’s begin →'):(isPark?'Explore another ride →':'Back to the bookshelf →');if(step===1){q.choices.forEach((choice,i)=>{const button=document.createElement('button');button.textContent=choice;button.onclick=()=>{if(answered)return;answered=true;$('answer-note').textContent=(i===q.answer?'You found it! ':'Let’s discover it together. ')+q.fact;for(const el of $('choices').children)el.disabled=true;$('continue').hidden=false;$('continue').textContent=isPark?(stop<2?'Next stop →':'Return to the gate →'):'Finish our little story →';$('continue').focus();};$('choices').append(button);});}}
$('watch-ride').onclick=()=>{park?.focus();document.querySelector('.house').scrollIntoView({behavior:motionOn?'smooth':'instant',block:'start'});};
$('open-book').onclick=openAdventure;$('quick-open').onclick=openAdventure;$('continue').onclick=()=>{if(step===2){$('adventure').close();return;}if(theme==='park'&&step===1&&stop<2){stop++;answered=false;}else step++;renderAdventure();if(step===1)$('choices').firstElementChild.focus();else $('continue').focus();};$('back-home').onclick=()=>{$('adventure').close();};$('adventure').addEventListener('close',()=>{if(adventureOpener?.isConnected)adventureOpener.focus();});
document.querySelectorAll('[data-atlas]').forEach(button=>button.onclick=()=>{atlasMode=button.dataset.atlas;document.querySelectorAll('[data-atlas]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));selectBook('flags');});
selectBook('animals');$('greeting').innerHTML='I’ve saved you a cozy spot.<br>Which book shall we open?';

// House and park borrow the same renderer. Only the visible setting animates.
function drawRoom(){home?.setActive(theme==='house');home?.setNight(night);}
refreshRoomMotion=()=>home?.setMotion(document.body.dataset.motion!=='paused');
createHouse($('house-map'),id=>{selectBook(id);enterRoom(id);}).then(api=>{home=api;home.select(selected.id);drawRoom();syncMotion();}).catch(()=>{$('graphics-note').hidden=false;});
function enterRoom(id){const r=houseRooms.find(r=>r.id===id);home?.select(id,true);$('house-room-name').textContent=r.name;$('house-room-copy').textContent=r.description;$('all-rooms').hidden=false;document.querySelector('.house').dataset.room=id;}
$('all-rooms').onclick=()=>{home?.overview();$('house-room-name').textContent='A little house. Six places to play.';$('house-room-copy').textContent='Tap a room and follow Rufus inside.';$('all-rooms').hidden=true;delete document.querySelector('.house').dataset.room;};
for(const r of houseRooms){const button=document.createElement('button');button.dataset.roomChoice=r.id;button.innerHTML=`<span>${r.icon}</span><b>${r.name}</b><small>${r.topic}</small>`;button.onclick=()=>{selectBook(r.id);enterRoom(r.id);};$('room-tabs').append(button);}

// A shareable local preview link can open straight into the park.
changeTheme(new URLSearchParams(location.search).get('theme')==='park'?'park':'house');

if(new URLSearchParams(location.search).get('night')==='1')$('light').click();

const journey=createJourney({onOpen(){journeyActive=true;if(theme==='house')enterRoom(selected.id);$('house-world').inert=true;document.querySelector('.bookcase').inert=true;document.body.dataset.journey='true';syncMotion();if(theme==='park')ensurePark().then(p=>p.setJourney(0,selected.id));},onState(state){sceneMusic.state(state);if(theme==='park')park?.setJourney(state.qi,selected.id);},onClose(){journeyActive=false;$('house-world').inert=false;document.querySelector('.bookcase').inert=false;delete document.body.dataset.journey;park?.setJourney(null);syncMotion();drawRoom();if(adventureOpener?.isConnected)adventureOpener.focus();}});
addEventListener('pagehide',event=>{if(event.persisted)return;home?.dispose();park?.dispose();journey.dispose();sceneMusic.dispose();},{once:true});
