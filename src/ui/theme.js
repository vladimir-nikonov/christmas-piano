// Current theme (TH), switching themes, theme preview cards.

import { avatarSVG, SPLASH_CAST } from './art.js';
import { invalidateBg } from './canvas.js';
import { THEMES } from './theme-data.js';

export let TH = THEMES.pixel;
// Key of the current theme ('pixel', 'plastic', 'winter', 'anime'): picks the note and keyboard style
export let THK = 'pixel';
export function applyTheme(key){
  TH = THEMES[key] || THEMES.pixel; THK = THEMES[key] ? key : 'pixel';
  document.documentElement.dataset.theme = THEMES[key] ? key : 'pixel';
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = TH.bg;
  invalidateBg();
}
// Small preview of a theme for the picker: a miniature of its splash screen (mascots and falling effects), as SVG
let pvSeq = 0;
export function themePreview(key){
  const t = THEMES[key] || THEMES.pixel, th = THEMES[key] ? key : 'pixel', g = 'tsg' + (++pvSeq);
  let s = '<svg class="pv" viewBox="0 0 160 100" aria-hidden="true"><defs><radialGradient id="' + g + '" cx="50%" cy="0%" r="90%"><stop offset="0" stop-color="' + t.border + '"/><stop offset=".75" stop-color="' + t.bg + '"/></radialGradient></defs>' +
    '<rect width="160" height="100" fill="url(#' + g + ')"/>';
  for (let i = 0; i < 12; i++){
    const x = (i * 37 + 9) % 156, y = (i * 29 + 7) % 92;
    if (t.fx === 'squares') s += '<rect x="' + x + '" y="' + y + '" width="4" height="4" fill="' + t.reward + '" opacity=".8"/>';
    else if (t.fx === 'bubbles') s += '<circle cx="' + x + '" cy="' + y + '" r="3.5" fill="none" stroke="' + t.accent + '" stroke-width="1.4" opacity=".7"/>';
    else if (t.fx === 'snow') s += '<circle cx="' + x + '" cy="' + y + '" r="1.8" fill="#fff" opacity=".75"/>';
    else s += '<rect x="' + x + '" y="' + y + '" width="4" height="4" transform="rotate(45 ' + (x + 2) + ' ' + (y + 2) + ')" fill="' + (i % 3 ? t.accent : t.reward) + '"/>';
  }
  // Mascots: the middle one is bigger, like on the splash screen
  [[0, 12, 44, 40], [1, 54, 30, 52], [2, 108, 44, 40]].forEach(([n, x, y, sz]) => {
    s += '<rect x="' + (x + 3) + '" y="' + (y + sz - 2) + '" width="' + (sz - 6) + '" height="4" rx="2" fill="#000" opacity=".25"/>' +
      avatarSVG(SPLASH_CAST[th][n], sz, th).replace('<svg ', '<svg x="' + x + '" y="' + y + '" ');
  });
  s += '<rect x="44" y="12" width="72" height="7" rx="3.5" fill="' + t.reward + '" opacity=".9"/>';
  return s + '</svg>';
}
