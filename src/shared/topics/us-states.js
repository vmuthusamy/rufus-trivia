// One state is the freshness key, so changing question style doesn't immediately repeat it.
import { US_STATES } from '../data/us-states.js';
import { STATE_MAPS } from '../data/state-maps.js';
import { pickFresh, pickDistractors, mixIn } from '../kit.js';
export const STATE_COUNT=US_STATES.length;
const key=s=>'u_'+s.code;
export function stateQuestion({rng,level,used,avoid,missed}) {
  const s=pickFresh(rng,US_STATES,{used,avoid,missed,keyOf:key});
  const {items,answer}=mixIn(rng,s,pickDistractors(rng,s,US_STATES,US_STATES,3,key));
  const map=STATE_MAPS[s.code];
  const base={key:key(s),level,answer,eyebrow:'US state explorer',
    fact:`${s.capital} is the capital of ${s.name}, one of the 50 US states.`,
    learn:{label:`${s.name} · ${s.capital}`,img:map.img}};
  const mode=rng.int(4);
  if(mode===0) return {...base,mode:'stateCapital',prompt:`What is the capital of ${s.name}?`,media:{kind:'word',text:s.name,sub:'US state'},choices:items.map(x=>({label:x.capital}))};
  if(mode===1) return {...base,mode:'capitalState',prompt:`${s.capital} is the capital of which US state?`,media:{kind:'word',text:s.capital,sub:'State capital'},choices:items.map(x=>({label:x.name}))};
  if(mode===2) return {...base,mode:'nameState',prompt:map.tiny?'Which US state is highlighted inside the circle?':'Which US state is highlighted in orange?',media:{kind:'map',img:map.img},choices:items.map(x=>({label:x.name}))};
  return {...base,mode:'findState',prompt:`Which map highlights ${s.name}?`,media:{kind:'word',text:s.name,sub:'Find the US state'},choices:items.map(x=>({img:STATE_MAPS[x.code].img})),reveal:items.map(x=>({label:x.name,img:STATE_MAPS[x.code].img}))};
}
