// Current theme (TH), switching themes, theme preview cards.

import { NOTE_COLORS } from '../core/music.js';
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
// Small static preview of a theme for the picker (SVG)
export function themePreview(key){
  const t = THEMES[key], r = Math.min(t.radius, 14) * 0.5, NC = NOTE_COLORS;
  let s = '<svg class="pv" viewBox="0 0 160 100" aria-hidden="true"><rect width="160" height="100" fill="' + t.bg + '"/>';
  if (t.decor === 'glow') s += '<ellipse cx="80" cy="0" rx="110" ry="60" fill="' + t.border + '" opacity=".35"/>';
  else for (let i = 0; i < 14; i++) s += (t.decor === 'dots' ? '<rect x="' + ((i * 37) % 160) + '" y="' + ((i * 23) % 62) + '" width="2" height="2"' : '<circle cx="' + ((i * 37) % 160) + '" cy="' + ((i * 23) % 62) + '" r="1.3"') + ' fill="#fff" opacity=".55"/>';
  [[0,24,14],[2,44,10],[4,34,18],[2,62,8]].forEach(([k, y, h]) => { const x = 4 + k * 22.4; s += '<rect x="' + (x + 8) + '" y="' + (y - h - 8) + '" width="4" height="' + (h + 4) + '" fill="' + NC[k] + '" opacity=".6"/><rect x="' + x + '" y="' + (y - 9) + '" width="20" height="10" rx="' + r + '" fill="' + NC[k] + '"/>'; });
  s += '<rect x="0" y="65" width="160" height="2" fill="' + t.reward + '"/>';
  for (let i = 0; i < 7; i++) s += '<rect x="' + (3 + i * 22.4) + '" y="69" width="20.4" height="29" rx="' + Math.min(r, 3) + '" fill="#F5F5FA"/><rect x="' + (6 + i * 22.4) + '" y="90" width="14.4" height="5" rx="' + Math.min(r, 2) + '" fill="' + NC[i] + '"/>';
  s += '<rect x="112" y="6" width="42" height="16" rx="' + r + '" fill="' + t.accent + '"/><path d="M129 9L137 14L129 19Z" fill="' + t.bg + '"/>';
  return s + '</svg>';
}
