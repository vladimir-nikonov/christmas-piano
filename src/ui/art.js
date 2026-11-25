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
// Material colours used by the non-pixel block styles: base, light, dark
const MAT = {
  wood:['#a0703c','#d3a56a','#5c3b1e'], stone:['#8a8f98','#bfc4cb','#575c64'], iron:['#c8ccd2','#f1f3f6','#868d97'],
  gold:['#f7c948','#fff1a6','#b8820f'], diamond:['#4fe0e8','#d8fcff','#178f9c']
};
let blkSeq = 0;
// Level blocks are drawn in the current theme's style:
// pixel = textured pixel cubes, plastic = glossy toy blocks with an emblem, winter = pixel cubes under snow, anime = faceted gems.
export function blockSVG(i, theme){
  const th = THEMES[theme] ? theme : themeKey(), mat = LEVELS[i].mat, [c, lt, dk] = MAT[mat] || MAT.diamond, id = 'bk' + (++blkSeq);
  if (th === 'plastic'){
    const emblem = {
      wood:'<path d="M28 34Q40 30 52 34M26 42Q40 38 54 42M28 50Q40 46 52 50" stroke="' + dk + '" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>',
      stone:'<circle cx="32" cy="36" r="4" fill="' + dk + '" opacity=".55"/><circle cx="48" cy="44" r="5" fill="' + dk + '" opacity=".55"/><circle cx="36" cy="51" r="3" fill="' + dk + '" opacity=".55"/>',
      iron:'<circle cx="26" cy="30" r="3.2" fill="' + dk + '"/><circle cx="54" cy="30" r="3.2" fill="' + dk + '"/><circle cx="26" cy="54" r="3.2" fill="' + dk + '"/><circle cx="54" cy="54" r="3.2" fill="' + dk + '"/>',
      gold:'<path d="M40 27L44 37L55 37L46 44L49 55L40 48L31 55L34 44L25 37L36 37Z" fill="' + lt + '" stroke="' + dk + '" stroke-width="2" stroke-linejoin="round"/>',
      diamond:'<path d="M40 26L44 38L56 42L44 46L40 58L36 46L24 42L36 38Z" fill="#fff" opacity=".9"/>'
    }[mat] || '';
    return '<svg class="block block-plastic" viewBox="0 0 80 80" aria-hidden="true"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + lt + '"/><stop offset=".55" stop-color="' + c + '"/><stop offset="1" stop-color="' + dk + '"/></linearGradient></defs>' +
      '<ellipse cx="40" cy="74" rx="30" ry="5" fill="rgba(0,0,0,.28)"/>' +
      '<rect x="6" y="10" width="68" height="62" rx="18" fill="' + dk + '"/><rect x="6" y="6" width="68" height="60" rx="18" fill="url(#' + id + ')"/>' +
      '<rect x="18" y="20" width="44" height="40" rx="12" fill="' + c + '" stroke="' + lt + '" stroke-width="2.5" opacity=".95"/>' + emblem +
      '<ellipse cx="30" cy="15" rx="17" ry="6" fill="#fff" opacity=".45"/></svg>';
  }
  if (th === 'anime'){
    return '<svg class="block block-anime" viewBox="0 0 80 80" aria-hidden="true"><defs><radialGradient id="' + id + '"><stop offset="0" stop-color="' + c + '" stop-opacity=".55"/><stop offset="1" stop-color="' + c + '" stop-opacity="0"/></radialGradient></defs>' +
      '<circle cx="40" cy="42" r="38" fill="url(#' + id + ')"/>' +
      '<path d="M40 5L74 40L40 75L6 40Z" fill="' + c + '"/>' +
      '<path d="M40 5L6 40L24 40L40 20Z" fill="' + lt + '"/><path d="M40 5L74 40L56 40L40 20Z" fill="' + c + '"/>' +
      '<path d="M6 40L40 75L40 58L24 40Z" fill="' + dk + '" opacity=".75"/><path d="M74 40L40 75L40 58L56 40Z" fill="' + dk + '"/>' +
      '<path d="M40 20L56 40L40 58L24 40Z" fill="' + lt + '" opacity=".85"/><path d="M40 20L48 30L40 40L32 30Z" fill="#fff" opacity=".55"/>' +
      '<path d="M40 5L74 40L40 75L6 40Z" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M64 10L66 16L72 18L66 20L64 26L62 20L56 18L62 16Z" fill="#fff"/></svg>';
  }
  const grid = pixelBlock(i);
  if (th === 'winter'){
    return '<svg class="block block-winter" viewBox="0 0 80 80" aria-hidden="true"><g transform="scale(10)" shape-rendering="crispEdges">' + grid + '</g>' +
      '<rect width="80" height="80" fill="#cdf3ff" opacity=".12"/>' +
      '<path d="M0 0H80V14Q74 20 68 14Q62 22 54 15Q48 21 40 15Q32 23 24 15Q16 21 10 14Q4 19 0 13Z" fill="#f4fbff"/>' +
      '<path d="M0 10Q4 15 10 10Q16 17 24 11Q32 19 40 11Q48 17 54 11Q62 18 68 10Q74 16 80 10V14Q74 20 68 14Q62 22 54 15Q48 21 40 15Q32 23 24 15Q16 21 10 14Q4 19 0 13Z" fill="#bfe6f5"/>' +
      '<path d="M14 18L17 30L20 18ZM44 19L46 27L48 19ZM60 18L63 34L66 17Z" fill="#dff6ff" opacity=".9"/>' +
      '<circle cx="12" cy="6" r="1.6" fill="#fff"/><circle cx="66" cy="5" r="1.4" fill="#fff"/></svg>';
  }
  return '<svg class="block block-pixel" viewBox="0 0 8 8" preserveAspectRatio="none" shape-rendering="crispEdges" aria-hidden="true">' + grid + '</svg>';
}
// The original textured pixel cube (8x8 grid) used by the pixel and winter styles
function pixelBlock(i){
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
  return px.join('') +
    '<rect width="8" height=".5" fill="rgba(255,255,255,.35)"/><rect width=".5" height="8" fill="rgba(255,255,255,.25)"/><rect y="7.5" width="8" height=".5" fill="rgba(0,0,0,.35)"/><rect x="7.5" width=".5" height="8" fill="rgba(0,0,0,.3)"/>';
}

/* ================= Song length: a sheet of lines ================= */
// The played part is drawn as thick lines in the text colour, the rest as thin muted lines,
// so the picture says "this much of the song is played" without reading.
const SHEET_ON = { short:1, half:2, full:4 }, SHEET_W = [64, 72, 58, 68];
export function sheetSVG(part){
  const on = SHEET_ON[part] || 4;
  return '<svg class="sheet-ico" viewBox="0 0 96 80" aria-hidden="true"><rect x="4" y="3" width="88" height="74" rx="8" fill="none" stroke="currentColor" stroke-opacity=".45" stroke-width="3"/>' +
    SHEET_W.map((w, i) => '<line x1="16" x2="' + (16 + w) + '" y1="' + (19 + i * 14) + '" y2="' + (19 + i * 14) + '" stroke="currentColor" stroke-linecap="round" ' +
      (i < on ? 'stroke-width="7"' : 'stroke-width="2.5" stroke-opacity=".35"') + '/>').join('') + '</svg>';
}
