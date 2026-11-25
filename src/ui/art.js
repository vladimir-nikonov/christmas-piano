// Avatars and level blocks from the theme art pack (src/ui/pack-art.js, made by scripts/import-pack.mjs).

import { THEMES } from './theme-data.js';
import { PACK_AVATARS, PACK_BLOCKS } from './pack-art.js';

const themeKey = () => (typeof document !== 'undefined' && THEMES[document.documentElement.dataset.theme]) ? document.documentElement.dataset.theme : 'pixel';
const themeOf = theme => THEMES[theme] ? theme : themeKey();

/* ================= Avatars & level blocks ================= */
// The avatar index is stored in the kids' profiles and backups, so this order must never change.
export const AVATARS = ['kid', 'bow', 'kid2', 'bow2', 'cat', 'robot', 'panda', 'frog', 'alien', 'snow'].map(t => ({ t }));
// Each character keeps its look in every theme; the theme gives it a costume.
export function avatarSVG(i, size, theme){
  const th = themeOf(theme), svg = PACK_AVATARS[th][i % AVATARS.length];
  return svg.replace('<svg', '<svg class="av av-' + th + '" width="' + size + '" height="' + size + '" aria-hidden="true"');
}
// Splash mascots: three characters per theme
export const SPLASH_CAST = { pixel:[0, 4, 5], plastic:[6, 7, 1], winter:[9, 3, 2], anime:[8, 4, 1] };
// Level blocks in the theme's style: pixel cubes, toy blocks, snowy cubes, crystals.
export function blockSVG(i, theme){
  const th = themeOf(theme);
  return PACK_BLOCKS[th][i].replace('<svg', '<svg class="block block-' + th + '" aria-hidden="true"');
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
