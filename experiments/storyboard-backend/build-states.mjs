import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {feature} from 'topojson-client';
import {geoAlbersUsa,geoPath} from 'd3-geo';
const atlas=JSON.parse(readFileSync(new URL('./states-10m.json',import.meta.url)));
const all=feature(atlas,atlas.objects.states).features.filter(f=>+f.id<60 && +f.id!==11);
if(all.length!==50)throw Error('Expected the 50 states; DC and territories are not states.');
const projection=geoAlbersUsa().fitExtent([[20,15],[580,350]],{type:'FeatureCollection',features:all});
const path=geoPath(projection).digits(2),dir=new URL('../storyboard-next/state-maps/',import.meta.url);mkdirSync(dir,{recursive:true});
const data=[];
for(const state of all){
 const file=createHash('sha256').update('rufus-atlas-v1:'+state.id).digest('hex').slice(0,16)+'.svg';
 const [x,y]=path.centroid(state);const tiny=path.area(state)<160;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 380"><rect width="600" height="380" rx="14" fill="#f4f0df"/>${all.map(f=>`<path d="${path(f)}" fill="${f.id===state.id?'#e27836':'#9bb7b0'}" stroke="#fff9e9" stroke-width="1.1"/>`).join('')}${tiny?`<circle cx="${x}" cy="${y}" r="9" fill="none" stroke="#c66428" stroke-width="2"/>`:''}<text x="20" y="372" fill="#4c625c" font-family="sans-serif" font-size="11">Alaska and Hawaii shown as insets · not to the same scale</text></svg>`;
 writeFileSync(new URL(file,dir),svg);data.push({id:state.id,name:state.properties.name,img:'/state-maps/'+file,tiny});
}
writeFileSync(new URL('./states.js',import.meta.url),'// Generated from us-atlas 3.0.1 / US Census 2017 boundaries. Run build-states.mjs.\nexport const states='+JSON.stringify(data)+';\n');
console.log('Built '+data.length+' state maps.');
