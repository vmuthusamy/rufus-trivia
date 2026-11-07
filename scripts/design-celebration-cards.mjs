// Author the new cards in the shared prototype, then run npm run build:cards.
// These are original SVG scenes using the game's existing character sprites.
import fs from 'node:fs';
import { spriteSVG } from '../public/js/sprites.js';
const file = new URL('../experiments/cards-and-coins/prototype.html', import.meta.url);
let html = fs.readFileSync(file, 'utf8');
const D = JSON.parse(html.match(/^const D = (.*);$/m)[1]);
const rect = (x,y,w,h,c,rx=0) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${c}"/>`;
const text = (x,y,s,size=20,c='#fff3ce') => `<text x="${x}" y="${y}" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="${size}" fill="${c}">${s}</text>`;
const fox = (who,x,y,w=95) => spriteSVG(who).replace('<svg ', `<svg x="${x}" y="${y}" width="${w}" height="${w}" `);
const circle = (x,y,r,c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
const star = (x,y,r=7,c='#ffe295') => `<path d="M${x} ${y-r} L${x+2} ${y-2} ${x+r} ${y} ${x+2} ${y+2} ${x} ${y+r} ${x-2} ${y+2} ${x-r} ${y} ${x-2} ${y-2}Z" fill="${c}"/>`;
const stars = Array.from({length:18},(_,i)=>star(12+(i*61)%278,16+(i*37)%125,3+i%3)).join('');
const lamp = (x,y,s=1) => `<g transform="translate(${x} ${y}) scale(${s})">${circle(0,-7,17,'#ffcb6818')}<path d="M-14 0 Q0 19 14 0Z" fill="#e67b42"/><path d="M0 1 Q-9 -10 0 -20 Q9 -8 0 1" fill="#ffcc60"/><path d="M0 0 Q-4 -5 0 -12 Q4 -5 0 0" fill="#fff5bb"/></g>`;
const rangoli = (x,y,r=48) => `<g transform="translate(${x} ${y})">${Array.from({length:12},(_,i)=>`<ellipse cy="-${r*.58}" rx="${r*.20}" ry="${r*.43}" transform="rotate(${i*30})" fill="${i%2?'#ffb839':'#eb5ca6'}"/>`).join('')}${circle(0,0,r*.30,'#57d6c0')}${star(0,0,r*.20)}</g>`;
const lights = `<path d="M0 12 Q150 85 300 12" fill="none" stroke="#e6a954" stroke-width="2"/>${Array.from({length:11},(_,i)=>circle(i*30,12+30*Math.sin(i*Math.PI/10),4,i%2?'#ffb44e':'#f5cbe9')).join('')}`;
const sparkler = (x,y) => `<path d="M${x+18} ${y+76}L${x} ${y}" stroke="#e8c4a5" stroke-width="3"/>${Array.from({length:12},(_,i)=>{const a=i*Math.PI/6;return `<path d="M${x+Math.cos(a)*9} ${y+Math.sin(a)*9}L${x+Math.cos(a)*22} ${y+Math.sin(a)*22}" stroke="${i%2?'#ffda76':'#fff3d4'}" stroke-width="2"/>`;}).join('')}${star(x,y,8)}`;
// Distant sky fireworks: quiet illustrated bursts, with no flashing or explosion sounds.
const firework = (x,y,r,c) => `<g class="rc-firework">${Array.from({length:14},(_,i)=>{const a=i*Math.PI/7;return `<path d="M${x+Math.cos(a)*r*.38} ${y+Math.sin(a)*r*.38}L${x+Math.cos(a)*r} ${y+Math.sin(a)*r}" stroke="${c}" stroke-width="2" stroke-linecap="round"/>${circle(x+Math.cos(a)*r*1.14,y+Math.sin(a)*r*1.14,1.7,'#fff0c5')}`;}).join('')}${star(x,y,4,c)}</g>`;
const fireworks = firework(51,76,31,'#ffba65')+firework(247,74,32,'#87e6e1')+firework(149,36,18,'#f3a1de');
const family = (y=162) => ['rufus','marthina','renard','fiery','felix'].map((who,i)=>fox(who,8+i*56,y+(i%2)*16,63)).join('');
const scene = (body,bg='#22164b',floor='#51315e') => `<svg class="scene" viewBox="0 0 300 310" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${rect(0,0,300,310,bg)}${stars}${rect(0,238,300,72,floor)}${body}</svg>`;
function add(id,pack,name,rarity,story,art) { D.CARDS[id]={pack,name,rarity,story}; D.ART[id]=art; }
add('family_stage','char','The Family Encore','legendary','All five friends take a bow after their very own moonlit show.',scene(
  `${rect(0,0,34,240,'#ae315c')}${rect(266,0,34,240,'#ae315c')}${lights}${circle(150,100,43,'#ffdc87')}${text(150,109,'★',42,'#a25064')}${rect(12,247,276,16,'#bb775f')}${family(156)}${text(150,290,'THE FAMILY ENCORE',15)}`));
// Reuse the same embedded flag pictures as the existing country cards; never quiz URLs.
const flagIds=['f_in','f_jp','f_br','f_ca','f_ke'];
const flags=flagIds.map((id,i)=>{ const src=D.ART[id].match(/<img[^>]+src="([^"]+)"/)[1]; return `<image href="${src}" x="${15+i*56}" y="82" width="44" height="32"/>`; }).join('');
add('world_parade','flag','The Friendship Flag Parade','legendary','Five friends carry flags together in a parade of friendship. Every country belongs.',scene(
 `${lights}${flags}${family(145)}${text(150,56,'AROUND THE WORLD',16)}${text(150,283,'TOGETHER',20)}`,'#123c58','#296b72'));
add('ad_treehouse','adventure','The Secret Treehouse','legendary','A treehouse big enough for stories, snacks and all five friends.',scene(
 `${rect(39,40,22,270,'#744a36')}${rect(245,30,19,280,'#744a36')}${circle(45,55,65,'#376e55')}${circle(245,50,77,'#458365')}${rect(42,105,218,127,'#bd7954')}${rect(52,118,198,100,'#513f43')}<path d="M23 108L150 48 279 108Z" fill="#d99c60"/>${rect(30,225,240,14,'#e3b376')}${family(155)}${rect(140,239,8,71,'#dba66e')}${rect(175,239,8,71,'#dba66e')}${[250,267,284].map(y=>rect(140,y,43,5,'#f4cd92')).join('')}`,'#b9daba','#547b59'));
add('ma_carnival','math','The Number Carnival','legendary','The family builds a carnival from shapes, numbers and a little teamwork.',scene(
 `<path d="M24 128L150 43 276 128Z" fill="#f5c669"/><path d="M70 128L150 43 230 128Z" fill="#cd4a72"/>${rect(29,128,242,117,'#874064')}${rect(45,142,210,89,'#392753')}${text(150,111,'1 + 2 = 3',25)}${family(159)}${circle(42,273,13,'#5ed3bd')}${rect(85,261,26,26,'#f6c765')}<path d="M235 256L253 286H217Z" fill="#ed8bad"/>`));
add('sp_voyage','space','The Starlight Crew','legendary','Rufus and friends share an imaginary voyage past a glittering ringed planet.',scene(
 `${circle(218,72,35,'#e7a066')}<ellipse cx="218" cy="72" rx="64" ry="12" fill="none" stroke="#f6d7a4" stroke-width="9" transform="rotate(-20 218 72)"/>${rect(10,139,280,120,'#7486aa',55)}${rect(22,151,256,89,'#17243c',40)}${family(164)}${rect(45,255,210,15,'#c7dddf',6)}${text(91,78,'✦',45)}${text(150,291,'STARLIGHT CREW',17)}`,'#101d40','#24375c'));
add('di_lamps','diwali','Renard’s Row of Diyas','common','Renard decorates the courtyard with a glowing row of little lamps.',scene(`${lights}${fox('renard',89,122,126)}${[30,90,150,210,270].map(x=>lamp(x,272,1.2)).join('')}`));
add('di_sweets','diwali','Martina’s Sweet Sharing','rare','Martina brings a tray of sweets to share with friends during Diwali.',scene(`${lights}${fox('marthina',85,102,132)}${rect(47,237,206,12,'#e9b56b',5)}${rect(62,249,8,61,'#a6674b')}${rect(231,249,8,61,'#a6674b')}${[77,112,147,182,217].map((x,i)=>circle(x,226,13,i%2?'#ffe3a5':'#e9a14b')).join('')}${lamp(32,278)}${lamp(271,278)}`,'#45203f','#82435b'));
add('di_rangoli','diwali','Fiery’s Rainbow Rangoli','epic','Fiery helps make a colourful rangoli to welcome everyone to the celebration.',scene(`${lights}${fox('fiery',91,105,117)}${rangoli(150,260,47)}${lamp(43,272)}${lamp(258,272)}`,'#25314f','#446473'));
add('di_lanterns','diwali','Felix’s Lantern Courtyard','epic','Felix hangs bright lanterns above the courtyard, ready for an evening with friends.',scene(`${lights}${[48,150,252].map((x,i)=>`<path d="M${x} 0V${73+i%2*26}" stroke="#ffdfab"/><path d="M${x} ${48+i%2*26}l22 22-22 22-22-22Z" fill="${i%2?'#f584b6':'#ffbb62'}"/>${rect(x-1,92+i%2*26,2,22,'#ffdfab')}`).join('')}${fox('felix',84,149,132)}${lamp(48,283)}${lamp(251,283)}`));
add('di_sparkler','diwali','Rufus’s Sparkler Evening','divine','Rufus lights up an imaginary Diwali evening with sparklers and a huge grin.',scene(`${lights}${fireworks}${fox('rufus',86,137,136)}${sparkler(82,126)}${sparkler(225,125)}${rangoli(150,287,22)}${lamp(34,283)}${lamp(270,283)}`,'#201e4d','#603c66'));
add('di_family','diwali','The Family Festival of Lights','legendary','The whole Rufus family celebrates Diwali together with rangoli, glowing lamps, sweets and laughter.',scene(`${lights}${fireworks}${rangoli(150,110,35)}${family(160)}${[26,88,150,212,274].map(x=>lamp(x,280)).join('')}${text(150,144,'HAPPY DIWALI',16)}`,'#361c4f','#85415e'));
D.PACK_ART.diwali=scene(`${lights}${rangoli(150,105,58)}${fox('rufus',87,142,130)}${lamp(45,282)}${lamp(256,282)}`);
html=html.replace(/^const D = .*;$/m,`const D = ${JSON.stringify(D)};`);
fs.writeFileSync(file,html);
console.log('Authored five Legendary scenes and six Diwali cards.');
