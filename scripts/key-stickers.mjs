// Builds the printable key-sticker sheet (src/print/key-stickers.pdf) that parent settings offer for download:
// one A4 page of colour stickers for the white keys of three octaves (C3..C6), every note named in all app languages,
// plus a diagram of where to stick them. Colours and names come from src/core/music.js, so the stickers match the game.
// Run: node scripts/key-stickers.mjs   (uses the installed Google Chrome; set CHROME_PATH to use another binary)
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import { NOTE_COLORS, NOTE_NATIVE } from '../src/core/music.js';

const OUT = fileURLToPath(new URL('../src/print/key-stickers.pdf', import.meta.url));
const WHITE = [0, 2, 4, 5, 7, 9, 11];                       // pitch classes of C D E F G A B
const names = lang => WHITE.map(pc => NOTE_NATIVE[lang][pc]);
const RU = names('ru'), UK = names('uk'), ES = names('es'), EN = names('en'), PL = names('pl');
const C = NOTE_COLORS;
const pair = (a, b) => a === b ? a : `${a} / ${b}`;
const dots = d => '<span class="dots">' + '●'.repeat(d) + '</span>';

// One sticker, 18 x 28 mm: Russian / Ukrainian, Spanish, English / Polish, then the octave dots.
const sticker = (i, d) => `<div class="w" style="background:${C[i]}">
  <b>${pair(RU[i], UK[i])}</b><b>${ES[i]}</b><b class="l">${pair(EN[i], PL[i])}</b>${dots(d)}</div>`;
const OCT = ['Lower octave', 'Middle octave (the one the app plays)', 'Upper octave'];
const stickers = OCT.map((t, k) => `<h2>${dots(k + 1)} ${t}</h2><div class="row">${WHITE.map((_, i) => sticker(i, k + 1)).join('')}${k === 2 ? sticker(0, 4) : ''}</div>`).join('');

// Diagram: the 22 white keys C3..C6 seen from above with the stickers at the front edge, and one key close up.
function diagram(){
  const KW = 8.4, KH = 44, X0 = 4, Y0 = 8, NW = 22;
  let s = '';
  for (let j = 0; j < NW; j++){
    const x = X0 + j * KW, i = j % 7, oct = Math.floor(j / 7);
    s += `<rect x="${x}" y="${Y0}" width="${KW}" height="${KH}" fill="#fff" stroke="#182335" stroke-width=".3"/>`;
    s += `<rect x="${x + 1.4}" y="${Y0 + KH - 12}" width="${KW - 2.8}" height="9" rx=".6" fill="${C[i]}"/>`;
    s += `<text x="${x + KW / 2}" y="${Y0 + KH - 6.3}" font-size="2.6" font-weight="800" text-anchor="middle" fill="#182335">${EN[i]}</text>`;
    s += `<text x="${x + KW / 2}" y="${Y0 + KH - 4}" font-size="1.6" text-anchor="middle" fill="#182335">${'●'.repeat(j === NW - 1 ? 4 : oct + 1)}</text>`;
  }
  // Black keys sit after C, D, F, G, A (not after E and B).
  for (let j = 0; j < NW - 1; j++) if (j % 7 !== 2 && j % 7 !== 6) s += `<rect x="${X0 + (j + 1) * KW - 2.6}" y="${Y0}" width="5.2" height="27" rx=".5" fill="#1d2433"/>`;
  const mc = X0 + 7 * KW + KW / 2;
  s += `<path d="M${mc} ${Y0 + KH + 1.5} l-1.6 3 h3.2 z" fill="${C[0]}"/>`;
  s += `<text x="${mc}" y="${Y0 + KH + 8}" font-size="3" font-weight="800" text-anchor="middle" fill="#182335">Middle C ●●</text>`;
  ['● C3–B3', '●● C4–B4', '●●● C5–B5'].forEach((t, o) => {
    const a = X0 + o * 7 * KW + 0.5, b = X0 + (o + 1) * 7 * KW - 0.5;
    s += `<path d="M${a} ${Y0 - 1} v-2 H${b} v2" fill="none" stroke="#555" stroke-width=".3"/><text x="${(a + b) / 2}" y="${Y0 - 4}" font-size="2.8" font-weight="700" text-anchor="middle" fill="#555">${t}</text>`;
  });
  const kx = 202, kw = 22.5, kh = 60, ky = Y0;
  s += `<text x="${kx + kw / 2}" y="${ky - 2}" font-size="2.8" font-weight="700" text-anchor="middle" fill="#555">close-up</text>`;
  s += `<rect x="${kx}" y="${ky}" width="${kw}" height="${kh}" fill="#fff" stroke="#182335" stroke-width=".3"/>`;
  s += `<rect x="${kx + kw - 5.5}" y="${ky}" width="11" height="${kh * 0.62}" fill="#1d2433"/>`;
  s += `<rect x="${kx + (kw - 18) / 2}" y="${ky + kh - 31}" width="18" height="28" fill="${C[0]}"/>`;
  s += `<text x="${kx + kw / 2}" y="${ky + kh - 16}" font-size="3.5" font-weight="800" text-anchor="middle" fill="#182335">${EN[0]}</text>`;
  s += `<path d="M${kx + kw + 1.5} ${ky + kh - 3} v3 M${kx + kw + 0.5} ${ky + kh - 3} h2 M${kx + kw + 0.5} ${ky + kh} h2" stroke="#555" stroke-width=".3"/><text x="${kx + kw + 3}" y="${ky + kh - 0.6}" font-size="2.4" fill="#555">≈3 mm</text>`;
  s += `<text x="${kx + kw / 2}" y="${ky + kh + 4}" font-size="2.4" text-anchor="middle" fill="#555">key edge ↓</text>`;
  return `<svg class="dia" viewBox="0 0 240 ${ky + kh + 6}" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
}

const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Key stickers</title><style>
@page{size:A4;margin:10mm}
*{box-sizing:border-box}body{margin:0;font-family:-apple-system,"Helvetica Neue",Arial,sans-serif;color:#182335;-webkit-print-color-adjust:exact;print-color-adjust:exact}
svg{font-family:-apple-system,"Helvetica Neue",Arial,sans-serif}
h1{font-size:14pt;margin:0 0 1mm}p{font-size:9pt;margin:0 0 2mm;line-height:1.35}
h2{font-size:9.5pt;margin:4mm 0 1.5mm}h2 .dots{font-size:7pt;color:#555}
.row{display:flex;flex-wrap:wrap;gap:3mm}
.w{width:18mm;height:28mm;border:0.2mm dashed #555;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.6mm;text-align:center}
.w b{font-size:9.5pt;font-weight:800;line-height:1.05;white-space:nowrap}.w b.l{font-size:9pt}
.dots{font-size:5pt;letter-spacing:.6mm;opacity:.8;margin-top:.6mm}
.dia{width:190mm;display:block;margin:1mm 0}.how{font-size:8.5pt;line-height:1.35;margin:1mm 0 0;padding-left:5mm}.how li{margin-bottom:.8mm}
.ruler{margin-top:5mm;width:100mm;height:5mm;border:0.3mm solid #182335;border-top:none;background:repeating-linear-gradient(90deg,#182335 0 0.3mm,transparent 0.3mm 10mm);font-size:7pt;position:relative}
.ruler span{position:absolute;left:102mm;top:0;white-space:nowrap}
</style><body>
<h1>Colour key stickers — 3 octaves</h1>
<p>Each sticker names the note in every app language: Russian / Ukrainian, Spanish, English / Polish (Polish calls B “H”). Stickers are 18 × 28 mm, for the white keys only. The dots ● show the octave. Print at 100 % scale (“Actual size”) and cut along the dashed lines.</p>
${stickers}
<h2>Where to stick them</h2>${diagram()}
<ol class="how"><li>Find <b>C</b>: the white key just <b>left of a pair of black keys</b>. Middle C ●● is the C nearest the centre of the keyboard (on a 61-key keyboard, the third C from the left).</li>
<li>Put the ●● stickers on the white keys from middle C to the right: C D E F G A B. The ● stickers go on the octave to the left, the ●●● stickers on the octave to the right, and the last C ●●●● after them.</li>
<li>Centre each sticker on the white key, about 3 mm from the front edge, below the black keys. The black keys get no stickers.</li></ol>
<div class="ruler"><span>← 100 mm: check the print scale</span></div></body></html>`;

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' });
const page = await browser.newPage();
await page.setContent(html);
await page.pdf({ path: OUT, format: 'A4', printBackground: true, preferCSSPageSize: true });
await browser.close();
console.log('wrote', OUT);
