// Stroked 24x24 icons from the theme art pack, as inline SVG.

import { PACK_ICONS } from './pack-art.js';

// Icons the app needs that the theme art pack does not have yet (same format: 24x24, one stroked path).
// hand / hand-off: the game's switch for the fingering hint (crossed out when the hands are hidden), like a subtitles button.
// eye: the home Listen button, which plays the song by itself so the kid can watch and hear it first.
// rabbit (sitting) / turtle: the fast (top) and slow (bottom) ends of the playback speed slider in the game.
const APP_ICONS = {
  rabbit: 'M14 11.3Q16 15 15.5 21H8Q3 21 3 16Q3 11.5 8.5 11Q11 10.8 13 10.4M8.5 21Q11.5 20.5 11 17M12.7 8.5A2.8 2.8 0 1 0 18.3 8.5A2.8 2.8 0 1 0 12.7 8.5M13.6 6.3Q11 2 12.4 1.1Q14 0.5 15.5 5.7M17.1 6.4Q19.2 1.8 21.1 2.5Q22.1 4 18.4 7.4M3.4 14.4Q1.4 14.4 1.8 16.4',
  turtle: 'M2.5 16A7.5 6.5 0 0 1 17.5 16ZM6.5 16L8.5 11H11.5L13.5 16M16.5 13.5Q18 11 20.5 11.5Q22.5 12.5 21 14.5Q19.5 16 17.5 16M5 16V19H7.5V16M12.5 16V19H15V16M2.5 16L1 17.2M20 13H20.01',
  hand: 'M8 13V5.5A1.5 1.5 0 0 1 11 5.5V12M11 11V4A1.5 1.5 0 0 1 14 4V11M14 11V5A1.5 1.5 0 0 1 17 5V12M17 12V8A1.5 1.5 0 0 1 20 8V14A7 7 0 0 1 13 21H12A6 6 0 0 1 7 18.3L4.3 14.6A1.6 1.6 0 0 1 6.8 12.6L8 14',
  'hand-off': 'M8 13V5.5A1.5 1.5 0 0 1 11 5.5V12M11 11V4A1.5 1.5 0 0 1 14 4V11M14 11V5A1.5 1.5 0 0 1 17 5V12M17 12V8A1.5 1.5 0 0 1 20 8V14A7 7 0 0 1 13 21H12A6 6 0 0 1 7 18.3L4.3 14.6A1.6 1.6 0 0 1 6.8 12.6L8 14M3 3L21 21',
  eye: 'M2 12Q12 3 22 12Q12 21 2 12Z M12 8.5A3.5 3.5 0 1 0 12 15.5A3.5 3.5 0 1 0 12 8.5 M12 11.2A0.8 0.8 0 1 0 12 12.8A0.8 0.8 0 1 0 12 11.2'
};
// Icon paths from the theme art pack (24x24, one stroked path each; caps, joins and width come from the theme)
export const ICON = { ...PACK_ICONS, ...APP_ICONS };
const ROT = { back:['arrow-down', 90], next:['arrow-down', -90] };
export function icon(name, opt){
  opt = opt || {};
  const [base, rot] = ROT[name] || [name, 0];
  const g = '<path d="' + ICON[base] + '"/>';
  return '<svg class="i' + (opt.fill ? ' fill' : '') + (opt.cls ? ' ' + opt.cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (rot ? '<g transform="rotate(' + rot + ' 12 12)">' + g + '</g>' : g) + '</svg>';
}
export function hydrateIcons(){ document.querySelectorAll('[data-icon]').forEach(el => { if (el.dataset.done) return; el.dataset.done = 1; el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon, { fill: !!el.dataset.fill })); }); }
