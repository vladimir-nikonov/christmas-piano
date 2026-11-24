// Stroked 24x24 icons from the theme pack, as inline SVG.

// Icon paths from the theme pack (24x24, stroked; caps/joins come from the theme)
export const ICON = {
  'arrow-down':'M12 3V20M4 12L12 20L20 12', check:'M4 12L9 18L21 5', cross:'M5 5L19 19M19 5L5 19',
  fullscreen:'M3 9V3H9M15 3H21V9M21 15V21H15M9 21H3V15', 'fullscreen-exit':'M9 3V9H3M15 3V9H21M21 15H15V21M9 21V15H3',
  camera:'M2 7H15V18H2ZM15 11L22 7V18L15 14',
  gear:'M12 2V5M12 19V22M2 12H5M19 12H22M5 5L7 7M17 17L19 19M5 19L7 17M17 7L19 5M12 6A6 6 0 1 0 12 18A6 6 0 1 0 12 6',
  keys:'M3 4H21V20H3ZM9 13V20M15 13V20M7 4V13H11V4M13 4V13H17V4',
  home:'M3 11L12 3L21 11V21H15V14H9V21H3Z', lock:'M6 10V7A6 6 0 0 1 18 7V10M4 10H20V22H4Z',
  mic:'M9 4Q12 1 15 4V12Q12 16 9 12ZM5 11Q5 19 12 19Q19 19 19 11M12 19V23',
  music:'M10 18V4L21 2V16M10 18A4 3 0 1 1 2 18A4 3 0 1 1 10 18M21 16A4 3 0 1 1 13 16A4 3 0 1 1 21 16',
  pause:'M8 4V20M16 4V20', pencil:'M4 20L5 15L16 4L20 8L9 19ZM5 15L9 19M13 7L17 11', play:'M8 4L21 12L8 20Z', plus:'M12 3V21M3 12H21', retry:'M4 9A9 9 0 1 1 5 18M4 3V9H10',
  speaker:'M3 9H7L12 4V20L7 15H3ZM16 8Q22 12 16 16', star:'M12 2L15 9L22 9L17 14L19 22L12 17L5 22L7 14L2 9L9 9Z'
};
const ROT = { back:['arrow-down', 90], next:['arrow-down', -90] };
export function icon(name, opt){
  opt = opt || {};
  const [base, rot] = ROT[name] || [name, 0];
  const g = '<path d="' + ICON[base] + '"/>';
  return '<svg class="i' + (opt.fill ? ' fill' : '') + (opt.cls ? ' ' + opt.cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (rot ? '<g transform="rotate(' + rot + ' 12 12)">' + g + '</g>' : g) + '</svg>';
}
export function hydrateIcons(){ document.querySelectorAll('[data-icon]').forEach(el => { if (el.dataset.done) return; el.dataset.done = 1; el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon, { fill: !!el.dataset.fill })); }); }
