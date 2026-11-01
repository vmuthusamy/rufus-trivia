import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {geographyTopics} from './geography.js';
import {states} from './states.js';
import {buildGame,publicQuestion} from '../../src/shared/game.js';
import {TOPICS} from '../../src/shared/topics/index.js';

test('experiment import does not change the production menu',()=>assert.equal(TOPICS.length,5));
test('all 50 states have anonymous, nonempty map assets',()=>{assert.equal(states.length,50);assert.equal(new Set(states.map(s=>s.name)).size,50);for(const state of states){assert(!state.img.toLowerCase().includes(state.name.toLowerCase()));const svg=readFileSync(new URL('../storyboard-next'+state.img,import.meta.url),'utf8');assert(svg.includes('<path d="M'));assert(!svg.replace('Alaska and Hawaii shown as insets','').includes(state.name));}});
for(const topic of geographyTopics){test(topic.id+': valid, deterministic questions and private answers',()=>{for(const levelSetting of ['easy','medium','hard'])for(let seed=0;seed<10;seed++){const options={seed:'map-'+seed,count:30,levelSetting};const game=buildGame(topic,options);assert.deepEqual(game,buildGame(topic,options));for(const q of game){assert.equal(q.choices.length,4);assert(q.answer>=0&&q.answer<4);assert(q.fact);assert.equal(new Set(q.choices.map(c=>c.label||c.img)).size,4);const pub=publicQuestion(q);for(const key of ['answer','key','fact','learn','reveal'])assert(!(key in pub));if(q.media?.kind==='map')assert(q.media.img);}}});}
