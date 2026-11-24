// Pixel-art avatars and level blocks, generated as SVG.

import { LEVELS } from '../core/levels.js';

/* ================= Avatars & level blocks (original pixel art) ================= */
const AV_ROWS = {
  kid:   ['hhhhhhhh','hhhhhhhh','hssssssh','ssssssss','swesswes','ssssssss','ssmmmmss','ssssssss'],
  bow:   ['hhhbbhhh','hhbbbbhh','hssssssh','hssssssh','swesswes','ssssssss','sssmmsss','hssssssh'],
  cat:   ['o......o','oo....oo','oooooooo','oooooooo','ogkoogko','ooowwooo','oowpwwoo','oooooooo'],
  robot: ['...rr...','...dd...','dddddddd','dccddccd','dccddccd','dddddddd','dkkkkkkd','dddddddd'],
  panda: ['kk....kk','kkwwwwkk','wwwwwwww','wkkwwkkw','wkwwwkkw','wwwkkwww','wwwwwwww','.wwwwww.'],
  frog:  ['.gg..gg.','gwkggwkg','gggggggg','gggggggg','gggggggg','gkggggkg','ggkkkkgg','.gggggg.'],
  alien: ['..pppp..','.pppppp.','pppppppp','pkkppkkp','pkkppkkp','pppppppp','.ppkkpp.','..pppp..'],
  snow:  ['..kkkk..','..kkkk..','.kkkkkk.','.wwwwww.','wkwwwwkw','wwwoowww','wwkkkkww','.wwwwww.']
};
export const AVATARS = [
  { t:'kid',   c:{ h:'#6b3e1f', s:'#f1c27d', w:'#fff', e:'#1e3a8a', m:'#b45252' } },
  { t:'bow',   c:{ h:'#f4d35e', s:'#ffd8b1', w:'#fff', e:'#15803d', m:'#e05780', b:'#ff4f9a' } },
  { t:'kid',   c:{ h:'#1f1f2e', s:'#c68642', w:'#fff', e:'#3b2a1a', m:'#7a2e2e' } },
  { t:'bow',   c:{ h:'#c0392b', s:'#ffe0c2', w:'#fff', e:'#1d4ed8', m:'#e05780', b:'#7c3aed' } },
  { t:'cat',   c:{ o:'#f59e0b', g:'#22c55e', k:'#14142b', w:'#fde68a', p:'#f472b6' } },
  { t:'robot', c:{ r:'#ef4444', d:'#94a3b8', c:'#22d3ee', k:'#334155' } },
  { t:'panda', c:{ k:'#1f2937', w:'#f8fafc' } },
  { t:'frog',  c:{ g:'#4ade80', w:'#fff', k:'#14532d' } },
  { t:'alien', c:{ p:'#a78bfa', k:'#1e1b4b' } },
  { t:'snow',  c:{ w:'#f1f5f9', k:'#1e293b', o:'#f97316' } }
];
export function avatarSVG(i, size){
  const a = AVATARS[i % AVATARS.length], rows = AV_ROWS[a.t]; let r = '';
  rows.forEach((row, y) => { let x = 0; while (x < 8){ const ch = row[x]; if (ch === '.'){ x++; continue; } let x2 = x; while (x2 < 8 && row[x2] === ch) x2++;
    r += '<rect x="' + x + '" y="' + y + '" width="' + (x2 - x) + '" height="1" fill="' + (a.c[ch] || '#000') + '"/>'; x = x2; } });
  return '<svg class="av" viewBox="0 0 8 8" width="' + size + '" height="' + size + '" shape-rendering="crispEdges" aria-hidden="true"><rect width="8" height="8" fill="rgba(0,0,0,.25)"/>' + r + '</svg>';
}
function rng(seed){ return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; }
export function blockSVG(i){
  const r = rng(97 + i * 31), px = [], pick = a => a[Math.floor(r() * a.length)];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++){
    let c;
    switch (LEVELS[i].mat){
      case 'wood':  c = (y % 3 === 2) ? '#5c3b1e' : ((x + (y > 3 ? 4 : 0)) % 8 === 0 ? '#6e4624' : pick(['#a0703c','#93653a','#b07a42'])); break;
      case 'stone': c = pick(['#8a8f98','#7b8089','#9aa0a8','#6c7179','#8a8f98']); break;
      case 'iron':  c = r() < .14 ? pick(['#e9d3b0','#d6b98d']) : pick(['#c8ccd2','#b7bcc4','#d8dbe0']); break;
      case 'gold':  c = r() < .12 ? '#fff3b0' : pick(['#f7c948','#efb42e','#ffd95e']); break;
      default:      c = r() < .14 ? '#e0fdff' : pick(['#4fe0e8','#2cc7d4','#6eeaf0']);
    }
    px.push('<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + c + '"/>');
  }
  return '<svg class="block" viewBox="0 0 8 8" preserveAspectRatio="none" shape-rendering="crispEdges" aria-hidden="true">' + px.join('') +
    '<rect width="8" height=".5" fill="rgba(255,255,255,.35)"/><rect width=".5" height="8" fill="rgba(255,255,255,.25)"/><rect y="7.5" width="8" height=".5" fill="rgba(0,0,0,.35)"/><rect x="7.5" width=".5" height="8" fill="rgba(0,0,0,.3)"/></svg>';
}
