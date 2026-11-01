import test from 'node:test';
import assert from 'node:assert/strict';
import {sceneMood} from './scene-mood.js';
import {MUSIC} from './scene-sound.js';
test('four scene moods have playable original arrangements',()=>{
 const moods=[sceneMood('house',false),sceneMood('house',true),sceneMood('park',false),sceneMood('park',true)];
 assert.equal(new Set(moods.map(m=>m.track)).size,4);
 for(const mood of moods){const song=MUSIC[mood.track];assert(song.bpm>0);assert.equal(song.bass.length,16);assert(song.lead.every(bar=>bar.length===16));}
});
test('evening music is slower and gentler than daytime in each setting',()=>{
 for(const setting of ['house','park']){const day=MUSIC[sceneMood(setting,false).track],night=MUSIC[sceneMood(setting,true).track];assert(night.bpm<day.bpm);assert(night.bassVolume<day.bassVolume);assert.equal(night.leadWave,'sine');}
});
