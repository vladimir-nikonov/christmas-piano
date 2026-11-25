// Current theme (TH), switching themes, theme preview cards.

import { invalidateBg } from './canvas.js';
import { THEMES } from './theme-data.js';
import { THEME_WORLDS } from './theme-worlds.js';

export let TH = THEMES.pixel;
// Key of the current theme ('pixel', 'plastic', 'winter', 'anime'): picks the note and keyboard style
export let THK = 'pixel';
export function applyTheme(key){
  TH = THEMES[key] || THEMES.pixel; THK = THEMES[key] ? key : 'pixel';
  document.documentElement.dataset.theme = THEMES[key] ? key : 'pixel';
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = TH.bg;
  invalidateBg();
}
// Preview of a theme for the picker: the artist's picture of the theme's world, as inline SVG.
// Ids get a per-copy suffix: the same picture can be on the page twice, and a gradient referenced from a hidden copy would not paint.
let pvSeq = 0;
export function themePreview(key){
  const th = THEME_WORLDS[key] ? key : 'pixel', n = ++pvSeq;
  return THEME_WORLDS[th].replace(/(id="|url\(#)([\w-]+)/g, '$1$2-' + n).replace('<svg', '<svg class="pv pv-' + th + '" aria-hidden="true"');
}
