// Stroked 24x24 icons from the theme art pack, as inline SVG.

import { PACK_ICONS } from './pack-art.js';

// Icon paths from the theme art pack (24x24, one stroked path each; caps, joins and width come from the theme)
export const ICON = PACK_ICONS;
const ROT = { back:['arrow-down', 90], next:['arrow-down', -90] };
export function icon(name, opt){
  opt = opt || {};
  const [base, rot] = ROT[name] || [name, 0];
  const g = '<path d="' + ICON[base] + '"/>';
  return '<svg class="i' + (opt.fill ? ' fill' : '') + (opt.cls ? ' ' + opt.cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (rot ? '<g transform="rotate(' + rot + ' 12 12)">' + g + '</g>' : g) + '</svg>';
}
export function hydrateIcons(){ document.querySelectorAll('[data-icon]').forEach(el => { if (el.dataset.done) return; el.dataset.done = 1; el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon, { fill: !!el.dataset.fill })); }); }
