import {mapQuestion,MAP_COUNT} from '../../src/shared/topics/maps.js';
import {capitalQuestion,CAPITAL_COUNT} from '../../src/shared/topics/capitals.js';
import {MAPS} from '../../src/shared/data/maps.js';
import {pickFresh,mixIn} from '../../src/shared/kit.js';
import {states} from './states.js';
const common={color:'#579b96',music:'city',orbit:['🌍','🧭','🎈']};
export const geographyTopics=[
 {...common,id:'countries',title:'Country Maps',emoji:'🌍',blurb:'Find countries on real maps.',size:MAP_COUNT,next:mapQuestion},
 {...common,id:'capitals',title:'Capital Quest',emoji:'🏙️',blurb:'Connect capital cities with their countries.',size:CAPITAL_COUNT,next(ctx){const q=capitalQuestion(ctx);const code=q.key.slice(2);if(MAPS[code]&&!['il','ps'].includes(code))q.media={kind:'map',img:MAPS[code].img,caption:'Highlighted country'};return q;}},
 {...common,id:'states',title:'US State Explorer',emoji:'🗺️',blurb:'Find the 50 states on a US map.',size:50,next({rng,level,used,avoid,missed}){
  const keyOf=s=>'us_'+s.id;
  const easy=new Set(['California','Texas','Florida','Alaska','Hawaii','New York','Washington','Michigan','Colorado','Arizona']);
  const pool=level===1?states.filter(s=>easy.has(s.name)):states;
  const chosen=pickFresh(rng,pool,{used,avoid,missed,keyOf});
  const wrong=rng.shuffle(states.filter(s=>s.id!==chosen.id)).slice(0,3);
  const {items,answer}=mixIn(rng,chosen,wrong);
  return {key:keyOf(chosen),level,eyebrow:'US state explorer',prompt:chosen.tiny?'Which state is circled in orange?':'Which US state is orange?',media:{kind:'map',img:chosen.img},choices:items.map(s=>({label:s.name})),answer,reveal:items.map(s=>({label:s.name})),fact:chosen.name+' is the highlighted state. Alaska and Hawaii appear as insets on this map.',learn:{label:chosen.name,img:chosen.img}};
 }}
];
