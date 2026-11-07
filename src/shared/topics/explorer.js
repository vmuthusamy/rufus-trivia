// The old geography makers return in a new category, with US states and even subject rotation.
import { capitalQuestion, CAPITAL_COUNT } from './capitals.js';
import { landmarkQuestion, LANDMARK_COUNT } from './landmarks.js';
import { mapQuestion, MAP_COUNT } from './maps.js';
import { stateQuestion, STATE_COUNT } from './us-states.js';
import { balancedNext } from '../question-rotation.js';
const parts=[{prefix:'c_',next:capitalQuestion},{prefix:'l_',next:landmarkQuestion},{prefix:'m_',next:mapQuestion},{prefix:'u_',next:stateQuestion}];
export default {
  id:'explorer',title:'World Explorer',emoji:'🌎',color:'#38bdf8',music:'city',
  blurb:'Landmarks, capitals, countries on maps and all 50 US states.',
  orbit:['🗽','🗼','🌎','🧭','🏛️'],
  size:CAPITAL_COUNT+LANDMARK_COUNT+MAP_COUNT+STATE_COUNT,
  next:ctx=>balancedNext(ctx,parts),
};
