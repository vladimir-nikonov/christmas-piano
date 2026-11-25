// Stroked 24x24 icons from the theme art pack, as inline SVG.

import { PACK_ICONS } from './pack-art.js';

// Icons the app needs that the theme art pack does not have yet (same format: 24x24, one stroked path).
// eye: the home Listen button, which plays the song by itself so the kid can watch and hear it first.
// minus / speed: the playback speed column in the game (slower, and the speedometer next to 1×).
const APP_ICONS = {
  minus: 'M3 12H21',
  speed: 'M3 18A9 9 0 1 1 21 18M12 15L17 9M12 15A1 1 0 1 0 12.01 15',
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
