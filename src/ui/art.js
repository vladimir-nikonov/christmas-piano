// Pixel-art avatars and level blocks, generated as SVG.

import { LEVELS } from '../core/levels.js';
import { THEMES } from './theme-data.js';

const themeKey = () => (typeof document !== 'undefined' && THEMES[document.documentElement.dataset.theme]) ? document.documentElement.dataset.theme : 'pixel';

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
// Eye centres (8x8 grid units) for the anime costume, and iris colours per character type
const AV_EYES = {
  kid:[[2,4.5],[6,4.5]], bow:[[2,4.5],[6,4.5]], cat:[[2,4.5],[6,4.5]], robot:[[2,4],[6,4]], panda:[[2,4],[6,4]],
  frog:[[2,1.5],[6,1.5]], alien:[[2,4],[6,4]], snow:[[1.5,4.5],[6.5,4.5]]
};
const AV_IRIS = { cat:'g', robot:'c', frog:'k', alien:'p' };
const WINTER_KNIT = ['#d64545', '#3f7fd6', '#2f9e6b', '#c2410c', '#8b5cf6'];
let avSeq = 0;
// Each avatar keeps its character and colours in every theme; the theme adds a costume:
// pixel = plain pixel art, plastic = glossy toy with headphones, winter = knitted hat and scarf, anime = big sparkly eyes.
export function avatarSVG(i, size, theme){
  const idx = i % AVATARS.length, a = AVATARS[idx], rows = AV_ROWS[a.t], th = THEMES[theme] ? theme : themeKey(), T = THEMES[th];
  const S = 10, soft = th === 'plastic' || th === 'anime', id = 'av' + (++avSeq);
  let body = '';
  rows.forEach((row, y) => { let x = 0; while (x < 8){ const ch = row[x]; if (ch === '.'){ x++; continue; } let x2 = x; while (x2 < 8 && row[x2] === ch) x2++;
    body += '<rect x="' + x * S + '" y="' + y * S + '" width="' + (x2 - x) * S + '" height="' + (soft ? S + 0.6 : S) + '" fill="' + (a.c[ch] || '#000') + '"/>'; x = x2; } });
  let bg, pre = '', post = '';
  if (th === 'plastic'){
    bg = '<circle cx="40" cy="40" r="40" fill="' + T.border + '" opacity=".55"/>';
    pre = '<clipPath id="' + id + '"><rect x="4" y="6" width="72" height="72" rx="22"/></clipPath>';
    body = '<g clip-path="url(#' + id + ')">' + body + '<rect x="4" y="58" width="72" height="22" fill="rgba(0,0,0,.14)"/><ellipse cx="28" cy="20" rx="20" ry="9" fill="#fff" opacity=".38"/></g>';
    post = (a.t === 'frog' ? '' : '<path d="M7 38Q7 1 40 1Q73 1 73 38" fill="none" stroke="' + T.accentDark + '" stroke-width="7" stroke-linecap="round"/>') +
      '<rect x="0" y="32" width="14" height="24" rx="7" fill="' + T.accent + '"/><rect x="66" y="32" width="14" height="24" rx="7" fill="' + T.accent + '"/>' +
      '<rect x="3" y="36" width="4" height="10" rx="2" fill="#fff" opacity=".5"/><rect x="69" y="36" width="4" height="10" rx="2" fill="#fff" opacity=".5"/>';
  } else if (th === 'winter'){
    const knit = WINTER_KNIT[idx % WINTER_KNIT.length];
    bg = '<rect width="80" height="80" fill="#0d2a35"/><circle cx="10" cy="12" r="2" fill="#fff" opacity=".7"/><circle cx="70" cy="62" r="2" fill="#fff" opacity=".6"/><circle cx="66" cy="20" r="1.5" fill="#fff" opacity=".5"/>';
    if (a.t === 'frog') post += '<circle cx="7" cy="44" r="9" fill="' + knit + '"/><circle cx="73" cy="44" r="9" fill="' + knit + '"/><circle cx="7" cy="44" r="6" fill="#f5efe6"/><circle cx="73" cy="44" r="6" fill="#f5efe6"/>';
    else if (a.t !== 'snow') post += '<path d="M10 24Q10 3 40 3Q70 3 70 24Z" fill="' + knit + '"/><path d="M22 8V22M32 5V22M48 5V22M58 8V22" stroke="rgba(0,0,0,.18)" stroke-width="3"/>' +
      '<rect x="6" y="18" width="68" height="9" rx="3" fill="#f5efe6"/><circle cx="40" cy="4" r="6.5" fill="#f5efe6"/>';
    post += '<rect x="2" y="70" width="76" height="10" rx="3" fill="' + knit + '"/><rect x="54" y="70" width="11" height="10" fill="rgba(0,0,0,.18)"/>' +
      '<path d="M14 70V80M26 70V80M38 70V80" stroke="#f5efe6" stroke-width="3" opacity=".8"/>';
  } else if (th === 'anime'){
    bg = '<defs><radialGradient id="' + id + 'g"><stop offset="0" stop-color="' + T.accent + '" stop-opacity=".55"/><stop offset="1" stop-color="' + T.panel + '"/></radialGradient></defs><rect width="80" height="80" fill="url(#' + id + 'g)"/>';
    pre = '<clipPath id="' + id + '"><rect x="3" y="3" width="74" height="74" rx="16"/></clipPath>';
    body = '<g clip-path="url(#' + id + ')">' + body + '</g>';
    const iris = a.c[AV_IRIS[a.t]] || a.c.e || '#7c5cff', small = a.t === 'snow' ? 0.8 : 1;
    AV_EYES[a.t].forEach(([ex, ey]) => { const cx = ex * S, cy = ey * S, rx = 7.5 * small, ry = 9.5 * small;
      post += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="#241a45"/>' +
        '<ellipse cx="' + cx + '" cy="' + (cy + 1.5 * small) + '" rx="' + rx * 0.72 + '" ry="' + ry * 0.66 + '" fill="' + iris + '"/>' +
        '<circle cx="' + (cx - 2.6 * small) + '" cy="' + (cy - 3.6 * small) + '" r="' + 2.8 * small + '" fill="#fff"/><circle cx="' + (cx + 2.4 * small) + '" cy="' + (cy + 3 * small) + '" r="' + 1.4 * small + '" fill="#fff"/>' +
        '<ellipse cx="' + cx + '" cy="' + (cy + ry + 4) + '" rx="6" ry="2.6" fill="#ff8fb8" opacity=".6"/>'; });
    post += '<path d="M68 4L70 10L76 12L70 14L68 20L66 14L60 12L66 10Z" fill="' + T.reward + '"/>';
  } else {
    bg = '<rect width="80" height="80" fill="rgba(0,0,0,.25)"/>';
  }
  return '<svg class="av av-' + th + '" viewBox="0 0 80 80" width="' + size + '" height="' + size + '"' + (soft ? '' : ' shape-rendering="crispEdges"') + ' aria-hidden="true">' + pre + bg + body + post + '</svg>';
}
// Splash mascots: three characters per theme
export const SPLASH_CAST = { pixel:[0, 4, 5], plastic:[6, 7, 1], winter:[9, 3, 2], anime:[8, 4, 1] };
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
