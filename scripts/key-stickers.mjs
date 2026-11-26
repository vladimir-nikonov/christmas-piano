// Builds the printable key-sticker sheet (src/print/key-stickers.pdf) that parent settings offer for download:
// one A4 page of colour stickers for every white key of a 61-key keyboard (C2..C7), each note named in all app
// languages and marked with its octave dots, plus a diagram of where to stick them.
// Colours, names, octave dots and the game's key range come from src/core/music.js, so the stickers match the game.
// Run: node scripts/key-stickers.mjs   (uses the installed Google Chrome; set CHROME_PATH to use another binary)
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import { NOTE_COLORS, NOTE_NATIVE, STICKER_LOW, STICKER_HIGH, KEY_LO, KEY_HI, octaveDots } from '../src/core/music.js';

const OUT = fileURLToPath(new URL('../src/print/key-stickers.pdf', import.meta.url));
const WHITE = [0, 2, 4, 5, 7, 9, 11];                       // pitch classes of C D E F G A B
const names = lang => WHITE.map(pc => NOTE_NATIVE[lang][pc]);
const RU = names('ru'), UK = names('uk'), ES = names('es'), EN = names('en'), PL = names('pl');
const C = NOTE_COLORS;
const pair = (a, b) => a === b ? a : `${a} / ${b}`;
const dots = d => '<span class="dots">' + '●'.repeat(d) + '</span>';
const whites = []; for (let m = STICKER_LOW; m <= STICKER_HIGH; m++) if (WHITE.includes(m % 12)) whites.push(m);
const idx = m => WHITE.indexOf(m % 12);
const sci = m => EN[idx(m)] + (Math.floor(m / 12) - 1);   // 60 = C4

// One sticker, 18 x 28 mm: Russian / Ukrainian, Spanish, English / Polish, then the octave dots.
const sticker = m => { const i = idx(m);
  return `<div class="w" style="background:${C[i]}"><b>${pair(RU[i], UK[i])}</b><b>${ES[i]}</b><b class="l">${pair(EN[i], PL[i])}</b>${dots(octaveDots(m))}</div>`; };
const rows = [];
for (let o = 0; o < 5; o++){
  const ms = whites.slice(o * 7, o * 7 + 7); if (o === 4) ms.push(whites[35]);
  const note = ms.includes(KEY_LO) ? ' <em>← the game plays here</em>' : ms[0] === KEY_HI ? ' <em>← the game also uses this first C</em>' : '';
  rows.push(`<div class="oct"><span class="lab">${dots(octaveDots(ms[0]))} ${sci(ms[0])}–${sci(ms[6])}${o === 4 ? ` + ${sci(ms[7])}` : ''}${note}</span><div class="row">${ms.map(sticker).join('')}</div></div>`);
}

// Diagram: the whole keyboard from above, the stickers at the front edge of the white keys, the game's keys framed.
function diagram(){
  const N = whites.length, KW = 186 / N, KH = 30, X0 = 2, Y0 = 9;
  let s = '';
  whites.forEach((m, j) => {
    const x = X0 + j * KW, i = idx(m);
    s += `<rect x="${x}" y="${Y0}" width="${KW}" height="${KH}" fill="#fff" stroke="#182335" stroke-width=".25"/>`;
    s += `<rect x="${x + 0.8}" y="${Y0 + KH - 9}" width="${KW - 1.6}" height="7.5" rx=".4" fill="${C[i]}"/>`;
    s += `<text x="${x + KW / 2}" y="${Y0 + KH - 4.2}" font-size="2.2" font-weight="800" text-anchor="middle" fill="#182335">${EN[i]}</text>`;
  });
  // Black keys follow every white key except E and B.
  whites.forEach((m, j) => { if (j < N - 1 && m % 12 !== 4 && m % 12 !== 11) s += `<rect x="${X0 + (j + 1) * KW - 1.7}" y="${Y0}" width="3.4" height="18" rx=".4" fill="#1d2433"/>`; });
  for (let o = 0; o < 5; o++){
    const a = X0 + o * 7 * KW + 0.4, b = X0 + (o + 1) * 7 * KW - 0.4;
    s += `<path d="M${a} ${Y0 - 1} v-1.6 H${b} v1.6" fill="none" stroke="#555" stroke-width=".25"/><text x="${(a + b) / 2}" y="${Y0 - 3.6}" font-size="2.6" font-weight="700" text-anchor="middle" fill="#555">${'●'.repeat(o + 1)}</text>`;
  }
  const ga = X0 + whites.indexOf(KEY_LO) * KW, gb = X0 + (whites.indexOf(KEY_HI) + 1) * KW;
  s += `<rect x="${ga}" y="${Y0 - 0.2}" width="${gb - ga}" height="${KH + 0.4}" fill="none" stroke="#e0a100" stroke-width=".9" rx=".6"/>`;
  s += `<text x="${(ga + gb) / 2}" y="${Y0 + KH + 4.5}" font-size="2.8" font-weight="800" text-anchor="middle" fill="#182335">▲ middle C — the game plays from here to the next C</text>`;
  return `<svg class="dia" viewBox="0 0 190 ${Y0 + KH + 7}" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
}

const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Key stickers</title><style>
@page{size:A4;margin:9mm 10mm}
*{box-sizing:border-box}body{margin:0;font-family:-apple-system,"Helvetica Neue",Arial,sans-serif;color:#182335;-webkit-print-color-adjust:exact;print-color-adjust:exact}
svg{font-family:-apple-system,"Helvetica Neue",Arial,sans-serif}
h1{font-size:13pt;margin:0 0 1mm}p{font-size:8.5pt;margin:0 0 1.5mm;line-height:1.3}
h2{font-size:9.5pt;margin:3mm 0 1mm}
.oct{margin-top:1.8mm}.lab{display:block;font-size:8.5pt;font-weight:700;margin-bottom:.8mm}.lab .dots{font-size:6.5pt;color:#555}.lab em{font-style:normal;color:#b07d00}
.row{display:flex;flex-wrap:wrap;gap:2.5mm}
.w{width:18mm;height:28mm;border:0.2mm dashed #555;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.6mm;text-align:center}
.w b{font-size:9.5pt;font-weight:800;line-height:1.05;white-space:nowrap}.w b.l{font-size:9pt}
.dots{font-size:5pt;letter-spacing:.5mm;opacity:.8;margin-top:.6mm}
.dia{width:190mm;display:block;margin:1mm 0 0}.how{font-size:8.3pt;line-height:1.3;margin:1mm 0 0;padding-left:5mm}.how li{margin-bottom:.6mm}
.ruler{margin-top:3mm;width:100mm;height:4mm;border:0.3mm solid #182335;border-top:none;background:repeating-linear-gradient(90deg,#182335 0 0.3mm,transparent 0.3mm 10mm);font-size:7pt;position:relative}
.ruler span{position:absolute;left:102mm;top:0;white-space:nowrap}
</style><body>
<h1>Colour key stickers — 61-key keyboard (5 octaves)</h1>
<p>One sticker for every white key, C to C. Each names the note in every app language: Russian / Ukrainian, Spanish, English / Polish (Polish calls B “H”). The dots ● show the octave; the game shows the same dots on its keys. Print at 100 % scale (“Actual size”) and cut along the dashed lines.</p>
${rows.join('')}
<h2>Where to stick them</h2>${diagram()}
<ol class="how"><li>Start at the <b>lowest key on the left</b>: it is a C (the white key just left of a pair of black keys). Stick the ● row there, C D E F G A B, then ●● on the next octave, and so on; the last C on the right gets ●●●●●●.</li>
<li>Centre each sticker on the white key, about 3 mm from the front edge, below the black keys. The black keys get no stickers.</li>
<li>The game uses the <b>●●● octave from middle C</b> (the third C from the left) up to the next C ●●●●. Its keys show the same dots.</li></ol>
<div class="ruler"><span>← 100 mm: check the print scale</span></div></body></html>`;

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' });
const page = await browser.newPage();
await page.setContent(html);
await page.pdf({ path: OUT, format: 'A4', printBackground: true, preferCSSPageSize: true });
await browser.close();
console.log('wrote', OUT);
