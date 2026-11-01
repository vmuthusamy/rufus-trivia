import {sound} from './scene-sound.js';
import {sceneMood} from './scene-mood.js';

export function createSceneMusic() {
 const bar=document.createElement('div');bar.className='sound-bar';
 bar.innerHTML=`<button id="music-toggle" aria-pressed="false">♫ Music</button><span class="sound-caption"><b id="music-mood"></b><small id="music-status">Off · tap Music to listen</small></span><label class="sound-volume">Volume <input id="music-volume" aria-label="Music volume" type="range" min="0" max="100" value="35"></label>`;
 document.querySelector('.welcome').before(bar);
 const button=bar.querySelector('button'),label=bar.querySelector('#music-mood'),status=bar.querySelector('#music-status'),volume=bar.querySelector('input');
 let enabled=false,working=false,setting='house',night=false,reading=false,lastCue='';
 sound.init({sfx:false,music:false});
 function update() {
  const mood=sceneMood(setting,night);sound.setTrack(mood.track);sound.mood(reading?'game':'menu');sound.setIntensity(0);
  const playing=enabled&&!document.hidden;
  sound.setMusic(playing);sound.setSfx(playing);
  button.setAttribute('aria-pressed',String(enabled));
  label.textContent=mood.name;bar.title=mood.description;
  status.textContent=!enabled?'Off · tap Music to listen':document.hidden?'Paused while away':reading?'Playing softly while you think':'Playing · matched to the scene';
 }
 button.onclick=async()=>{
  if(working)return;working=true;
  try {
   if(!enabled){if(!sound.available || !await sound.unlock()){status.textContent='Sound unavailable in this browser';return;}}
   enabled=!enabled;update();
  }catch{enabled=false;update();status.textContent='Could not start audio. Tap Music to retry.';}
  finally{working=false;}
 };
 volume.oninput=()=>sound.setVolume(Number(volume.value)/100);
 const visibility=()=>update();document.addEventListener('visibilitychange',visibility);
 update();
 return {
  setScene(value,dark){setting=value;night=dark;update();},
  setReading(value){reading=value;update();},
  state(state){
   reading=state.phase==='question'||state.phase==='countdown';update();
   const key=state.round+':'+state.qi+':'+state.phase;
   if(key!==lastCue&&state.event!=='rejoin'&&state.phase==='reveal'&&state.mine?.correct&&enabled&&!document.hidden)sound.play('correct');
   lastCue=key;
  },
  dispose(){document.removeEventListener('visibilitychange',visibility);sound.dispose();}
 };
}
