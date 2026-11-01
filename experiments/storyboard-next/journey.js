import {openGame} from '/js/net.js';
import {store} from '/js/store.js';
import {spriteSVG,SPRITES} from './sprites.js';
import {stickerChanges, stopLabel, secondsLeft} from './journey-state.js';

// This adapter knows no answers. It renders public GameRoom messages.
export function createJourney({onOpen, onState, onClose}) {
 const panel = document.getElementById('journey');
 panel.innerHTML = `
  <div class="expedition-top"><span>ANIMAL KINGDOM</span><span id="connection">Local game</span></div>
  <div class="expedition-guide"><span id="companion-art">${spriteSVG('rufus')}</span><span><b id="expedition-name">Rufus’s river expedition</b><small id="traveller">Your discovery notebook</small></span></div>
  <div id="companion-picker" class="companion-picker" role="group" aria-label="Choose your companion"><button data-companion="rufus" aria-pressed="true">${spriteSVG('rufus')} Rufus</button><button data-companion="fiery" aria-pressed="false">${spriteSVG('fiery')} Fiery</button></div>
  <div class="expedition-stats" id="game-stats" hidden><b id="stop-label"></b><span id="score"></span><span id="hearts"></span></div>
  <div class="river-route" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
  <p class="eyebrow" id="question-kind">ALL ABOARD</p>
  <h2 id="journey-title" tabindex="-1">Explore with Rufus</h2>
  <p id="journey-copy">Real animal questions from Rufus Trivia. You have 3 hearts and 15 seconds per question. Every answer takes you to the next discovery.</p>
  <div id="question-media"></div>
  <div class="question-clock" id="clock-wrap" hidden><span id="clock-label">Time to answer</span><b id="question-clock"></b></div>
  <div id="live-choices" class="live-choices"></div>
  <div id="discovery" role="status"></div>
  <div id="sticker-news" role="status"></div>
  <button class="primary" id="journey-next">Begin expedition →</button>
  <button class="text-button" id="journey-exit">Back to exploring</button>
  <details class="passport"><summary>My sticker notebook <span id="sticker-count">0</span></summary><div id="sticker-album"></div><p>Saved by the local game server. Your online collection is unchanged.</p></details>
  <small class="local-note">Local playtest · original solo rules</small>`;
 const $ = id => panel.querySelector('#'+id);
 const mixTopics=['flags','animals','culture','science','math'];
 let preparing;
 function recent(){if(topic!=='mix')return {avoid:store.seen(player.id,topic),missed:store.missed(player.id,topic)};return {avoid:mixTopics.flatMap(id=>store.seen(player.id,id).slice(-60).map(key=>id+'-'+key)),missed:mixTopics.flatMap(id=>store.missed(player.id,id).slice(-20).map(key=>id+'-'+key))};}
 let companion='rufus',setting='park',topic='animals',topicTitle='Animal Kingdom';
 function showCompanion(){
  const name=companion==='fiery'?'Fiery':'Rufus';
  panel.dataset.companion=companion;
  $('companion-art').innerHTML=spriteSVG(companion);
  $('expedition-name').textContent=name+'’s '+topicTitle+' adventure';
  panel.querySelectorAll('[data-companion]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.companion===companion)));
  if(!state)$('journey-title').textContent='Explore with '+name;
 }
 panel.querySelectorAll('[data-companion]').forEach(button=>button.onclick=()=>{companion=button.dataset.companion;showCompanion();});
 let meta, player, connection, state, offset=0, connected=false, pending=false;
 let known=null, active=false, busy=false, previousPhase='', timer;
 const savedKey=()=> 'rufus_storyboard_next_run_'+topic;
 const saved = () => {try{return JSON.parse(localStorage.getItem(savedKey()));}catch{return null;}};
 const save = value => {try{if(value)localStorage.setItem(savedKey(),JSON.stringify(value));else localStorage.removeItem(savedKey());}catch{}};
 function status(text) { $('connection').textContent=text; }
 function error(text) { $('discovery').textContent=text; }
 function updateAlbum(ids, celebrate=true) {
  const change=stickerChanges(known,ids);known=change.owned;
  $('sticker-count').textContent=known.size;
  const album=$('sticker-album');album.replaceChildren();
  for(const item of meta?.stickers || []) {
   if(item.retired&&!known.has(item.id))continue;
   const card=document.createElement('div');card.className='sticker '+(known.has(item.id)?'owned':'locked');
   const art=document.createElement('span');art.textContent=known.has(item.id)?item.emoji:'·';
   const label=document.createElement('b');label.textContent=item.name;
   const reason=document.createElement('small');reason.textContent=known.has(item.id)?'Collected':item.how;
   card.append(art,label,reason);album.append(card);
  }
  if(celebrate && change.fresh.length) {
   $('sticker-news').textContent=change.fresh.map(id=>{const item=meta.stickers.find(s=>s.id===id);return item?`${item.emoji} New sticker: ${item.name}`:'';}).filter(Boolean).join(' · ');
  }
 }
 async function post(url,body) {
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const result=await response.json();if(!response.ok)throw Error(result.error || 'The local game could not connect.');return result;
 }
 function prepare() {
  if(!preparing)preparing=loadProfile().catch(error=>{preparing=null;throw error;});return preparing;
 }
 async function loadProfile() {
  const response=await fetch('/api/meta');if(!response.ok)throw Error('Start the local trivia server to play.');
  meta=await response.json();
  // Reuse the existing profile and collection storage patterns on this local origin.
  player=store.active();
  if(!player){player={id:store.newId(),adj:meta.names.adjectives[0],animal:(meta.names.animals.find(([name])=>name==='Fox') || meta.names.animals[0])[0],color:meta.names.colors[0]};store.saveProfile(player);}
  const collection=await post('/api/stickers',{player});
  updateAlbum(collection.stickers,false);
 }
 function refreshClock() {
  if(!state)return;
  const seconds=secondsLeft(state,Date.now(),offset);
  $('question-clock').textContent=seconds+'s';
  $('clock-label').textContent=state.phase==='reveal'?'Next discovery in':state.phase==='countdown'?'Setting off in':'Time to answer';
  // Time is only a display. The server owns timeout and decides when to advance.
  if(state.phase==='question')for(const button of $('live-choices').children)button.disabled=!connected||pending||!!state.mine||seconds===0;
 }
 function send(message) {
  if(!connected||!connection?.send(message)){error('Reconnecting… wait for the game before trying again.');return false;}return true;
 }
 function render(next) {
  $('companion-picker').hidden=true;
  state=next;offset=next.serverNow-Date.now();pending=false;
  const phaseKey=next.phase+':'+next.qi;
  const changed=phaseKey!==previousPhase;previousPhase=phaseKey;
  const me=next.players.find(p=>p.id===next.me);
  $('traveller').textContent=me?.name || 'Your discovery notebook';
  $('game-stats').hidden=false;$('stop-label').textContent=stopLabel(next);
  $('score').textContent=(me?.score || 0)+' points';$('hearts').textContent=(me?.lives ?? 3)+' hearts';
  panel.querySelectorAll('.river-route i').forEach((dot,i)=>dot.className=i===Math.max(0,next.qi)%5?'here':'');
  onState(next);updateAlbum(next.myStickers);
  $('live-choices').replaceChildren();$('question-media').replaceChildren();
  $('journey-copy').textContent='';$('discovery').textContent='';
  $('clock-wrap').hidden=!['question','reveal','countdown'].includes(next.phase);
  $('journey-next').hidden=true;$('journey-exit').textContent='Finish expedition';
  if(next.phase==='countdown'){
   $('question-kind').textContent='SETTING OFF';$('journey-title').textContent=(companion==='fiery'?'Fiery':'Rufus')+' is ready. Are you?';
  } else if(next.phase==='question'||next.phase==='reveal'){
   const question=next.question;
   $('question-kind').textContent=question.eyebrow || 'LOOK CLOSER';$('journey-title').textContent=question.prompt;
   const media=question.media;
   if(media?.kind==='story'&&SPRITES[media.who]){const art=document.createElement('div');art.className='question-character';art.innerHTML=spriteSVG(media.who);const place=document.createElement('small');place.textContent=media.place || '';art.append(place);$('question-media').append(art);}
   else if(media?.img){const img=new Image();img.src=media.img;img.alt=media.caption || 'Question picture';$('question-media').append(img);}
   else if(media?.text){$('question-media').textContent=media.text;}
   question.choices.forEach((choice,index)=>{
    const button=document.createElement('button');button.className='live-choice';
    if(choice.emoji){const emoji=document.createElement('span');emoji.textContent=choice.emoji;button.append(emoji);}
    if(choice.img){const img=new Image();img.src=choice.img;img.alt='';button.append(img);}
    const label=next.phase==='reveal'?(next.reveal.labels?.[index]?.label || choice.label):choice.label;button.append(document.createTextNode(label || 'Map '+String.fromCharCode(65+index)));if(!choice.label && choice.img)button.classList.add('map-choice');
    button.disabled=next.phase!=='question'||!!next.mine||!connected;
    if(next.phase==='reveal'&&index===next.reveal.answer){button.classList.add('correct');button.append(document.createTextNode(' ✓'));}
    else if(next.mine?.choice===index){button.classList.add('chosen');button.append(document.createTextNode(' · Your choice'));}
    button.onclick=()=>{if(state.phase!=='question'||pending)return;if(send({t:'answer',q:state.qi,choice:index})){pending=true;refreshClock();}};
    $('live-choices').append(button);
   });
   if(next.phase==='reveal'){
    $('discovery').textContent=(next.mine?.correct?'You found it! ':next.mine?.timeout?'Here’s our discovery. ':'Now we know. ')+next.reveal.fact;
    $('journey-next').hidden=false;$('journey-next').textContent='Next discovery →';
    const key=next.reveal.key;if(key){const split=key.indexOf('-');const [source,ownKey]=topic==='mix'?[key.slice(0,split),key.slice(split+1)]:[topic,key];store.remember(player.id,source,ownKey,!!next.mine?.correct);}
   }
  } else if(next.phase==='final'){
   save(null);$('question-kind').textContent='BACK FROM EXPLORING';$('journey-title').textContent='Your discovery notebook';
   $('journey-copy').textContent=`${next.final?.asked || 0} ${next.final?.asked === 1 ? "question" : "questions"} explored · ${me?.correct || 0} correct · ${me?.score || 0} points. Come back for another expedition.`;
   $('journey-next').hidden=false;$('journey-next').textContent='Explore again →';$('journey-exit').textContent='Back to exploring';
   for(const learned of next.final?.learned || []){const entry=document.createElement('p');entry.textContent=typeof learned==='string'?learned:learned.fact || '';if(entry.textContent)$('discovery').append(entry);}
  }
  refreshClock();
  if(changed && ['question','final'].includes(next.phase))$('journey-title').focus({preventScroll:true});
 }
 function connect(id) {
  connection?.close();known=null;previousPhase='';status('Connecting…');
  connection=openGame('/api/solo/'+id+'/ws',{
   hello:()=>({t:'hello',player,showcase:player.pins || [],...recent()}),
   onMessage(message){if(message.t==='state')render(message);else if(message.t==='error')error(message.message || message.error || 'The game could not continue.');else if(message.t==='replaced'){error('This game was opened in another tab. Return to exploring here.');state=null;$('journey-exit').textContent='Back to exploring';}},
   onStatus(value){connected=value==='open';if(value==='reconnecting'||value==='ended')known=null;status(connected?'Connected · local game':value==='ended'?'Game disconnected':'Reconnecting…');refreshClock();}
  });
 }
 async function start() {
  if(busy)return;busy=true;$('journey-next').disabled=true;error('');
  try{
   await prepare();let run=saved();
   if(run?.playerId===player.id){const result=await fetch('/api/solo/'+run.id);const info=await result.json();if(!info.exists||info.phase==='final')run=null;}else run=null;
   if(!active)return;
   if(!run){const created=await post('/api/solo',{topic,player,...(topic==='mix'?{mix:mixTopics}:{})});run={id:created.id,playerId:player.id};save(run);}
   if(active)connect(run.id);
  }catch(e){error(e.message);$('journey-next').textContent='Try connecting again';}
  finally{busy=false;$('journey-next').disabled=false;}
 }
 function close() {active=false;busy=false;connection?.close();connection=null;clearInterval(timer);panel.hidden=true;onClose();}
 $('journey-next').onclick=()=>{if(state?.phase==='reveal'){send({t:'next'});return;}if(state?.phase==='final')state=null;start();};
 $('journey-exit').onclick=()=>{if(state&&state.phase!=='final'){send({t:'quit'});}else close();};
 return {
  open(world='park',chosenTopic='animals',title='Animal Kingdom'){
   setting=world;topic=chosenTopic;topicTitle=title;panel.querySelector('.expedition-top>span').textContent=title.toUpperCase();
   if(active)return;active=true;state=null;previousPhase='';panel.hidden=false;onOpen();
   $('companion-picker').hidden=false;showCompanion();$('journey-copy').textContent=topic==='animals'?'The same Animal Kingdom questions you know—including Rufus’s Fox Facts and Fiery’s Dino Dig. 3 hearts · 15 seconds per question.':topicTitle+' with your fox friends. 3 hearts · 15 seconds per question.';
   $('question-kind').textContent='ALL ABOARD';$('live-choices').replaceChildren();$('question-media').replaceChildren();$('discovery').textContent='';$('sticker-news').textContent='';$('game-stats').hidden=true;$('clock-wrap').hidden=true;
   $('journey-next').disabled=false;$('journey-next').hidden=false;$('journey-next').textContent=saved()?'Resume expedition →':'Begin expedition →';$('journey-exit').textContent='Back to exploring';
   prepare().catch(e=>error(e.message));timer=setInterval(refreshClock,250);
   panel.scrollIntoView({behavior:'instant',block:'nearest'});$('journey-next').focus({preventScroll:true});
  },
  dispose(){connection?.close();clearInterval(timer);}
 };
}
