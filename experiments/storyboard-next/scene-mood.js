// The room and its lighting choose the music, never the answer or score.
export function sceneMood(setting, night) {
 if (setting === 'park') return night
  ? {track:'parkNight',name:'Lanterns after dark',description:'Soft bells beneath the carnival lights'}
  : {track:'parkDay',name:'Wonder Park parade',description:'A playful melody for a day of rides'};
 return night
  ? {track:'roomNight',name:'By the fireplace',description:'A warm, slow melody for the fox den'}
  : {track:'roomDay',name:'A day at Fox House',description:'Gentle, bouncy notes for exploring the house'};
}
