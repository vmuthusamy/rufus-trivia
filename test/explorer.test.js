import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync,readFileSync } from 'node:fs';
import explorer from '../src/shared/topics/explorer.js';
import { TOPICS,canPlay } from '../src/shared/topics/index.js';
import { topicFor } from '../src/shared/topics/mix.js';
import { buildGame,publicQuestion } from '../src/shared/game.js';
import { US_STATES } from '../src/shared/data/us-states.js';
import { STATE_MAPS } from '../src/shared/data/state-maps.js';
import { stateQuestion } from '../src/shared/topics/us-states.js';
import { makeRng } from '../src/shared/rng.js';
import { stickersForAnswer } from '../src/shared/stickers.js';
const opts={count:20,levelSetting:'easy'};
test('World Explorer is new; old geography scores and retirement remain unchanged',()=>{
 assert.ok(canPlay('explorer'));assert.equal(canPlay('world'),false);
 assert.ok(TOPICS.find(t=>t.id==='explorer'));
});
test('every 20-question expedition has five questions from each subject',()=>{
 for(let seed=0;seed<80;seed++){
  const game=buildGame(explorer,{...opts,seed:'exp'+seed});
  for(const prefix of ['u_','l_','m_','c_']) assert.equal(game.filter(q=>q.key.startsWith(prefix)).length,5);
  assert.equal(new Set(game.map(q=>q.key)).size,20);
 }
});
test('twenty rematches widen the geography pool instead of repeating easy places',()=>{
 const avoid=new Set();let repeated=0;
 for(let i=0;i<20;i++){
  const game=buildGame(explorer,{...opts,seed:'rematch'+i,avoid});
  // All 50 states have been visited after ten games; they may be revisited after that.
  for(const q of game){if(avoid.has(q.key)&&!q.key.startsWith('u_')) repeated++;avoid.add(q.key);}
 }
 assert.equal(repeated,0);assert.ok(avoid.size>=350);
});
test('Mix rotates all six chosen topics evenly and remains deterministic',()=>{
 const ids=TOPICS.map(t=>t.id),t=topicFor('mix',ids);
 for(let seed=0;seed<20;seed++){
  const settings={seed:'all'+seed,count:24,levelSetting:'mixed'};
  const qs=buildGame(t,settings);
  assert.deepEqual(qs,buildGame(t,settings));
  for(const id of ids)assert.equal(qs.filter(q=>q.key.startsWith(id+'-')).length,4);
 }
});
test('50 state maps and four question styles keep answers private',()=>{
 assert.equal(US_STATES.length,50);assert.equal(new Set(US_STATES.map(s=>s.code)).size,50);
 assert.equal(US_STATES.some(s=>s.code==='dc'),false);
 const modes=new Set();
 for(const s of US_STATES){
  const map=STATE_MAPS[s.code];assert.match(map.img,/^\/u\/[a-f0-9]{10}\.svg$/);
  const path=new URL('../public'+map.img,import.meta.url);assert.ok(existsSync(path));
  assert.ok(!/<text|<title|id=/i.test(readFileSync(path,'utf8')));
 }
 for(let i=0;i<1000;i++){
  const q=stateQuestion({rng:makeRng('us'+i),level:1+i%3,used:new Set(),avoid:new Set()});
  const s=US_STATES.find(s=>'u_'+s.code===q.key);modes.add(q.mode);
  assert.equal(q.choices.length,4);assert.equal(new Set(q.choices.map(x=>x.label||x.img)).size,4);
  const expected=q.mode==='stateCapital'?s.capital:q.mode==='findState'?STATE_MAPS[s.code].img:s.name;
  assert.equal(q.choices[q.answer].label||q.choices[q.answer].img,expected);
  const pub=publicQuestion(q);assert.equal(pub.answer,undefined);assert.equal(pub.key,undefined);assert.equal(pub.fact,undefined);
 }
 assert.equal(modes.size,4);
});
test('Explorer achievements are awarded only for correct answers at their milestones',()=>{
 const award=(n,correct=true)=>stickersForAnswer({topic:'explorer',correct,streak:0,ms:5000,correctSoFar:n});
 assert.deepEqual(award(1),['explorer_first']);assert.deepEqual(award(5),['explorer_trail']);assert.deepEqual(award(15),['explorer_master']);
 assert.deepEqual(award(5,false),[]);assert.deepEqual(award(4),[]);
});
test('World Explorer also earns the same shared answer and finish achievements', async()=>{
 const {stickersForFinish}=await import('../src/shared/stickers.js');
 assert.deepEqual(stickersForAnswer({topic:'explorer',correct:true,streak:3,ms:1000,correctSoFar:3}),['streak3','speedy']);
 assert.deepEqual(stickersForFinish({kind:'room',rank:1,players:2,score:3000,correct:10,count:10}),['champion','perfect']);
});
test('math rematches respect recently seen questions too',async()=>{
 const math=(await import('../src/shared/topics/math.js')).default;
 const first=buildGame(math,{seed:'recent-math',count:30,levelSetting:'easy'});
 const avoid=new Set(first.map(q=>q.key));
 // Identical seed would reproduce the entire previous game if avoid were ignored.
 const next=buildGame(math,{seed:'recent-math',count:30,levelSetting:'easy',avoid});
 assert.equal(next.filter(q=>avoid.has(q.key)).length,0);
});
