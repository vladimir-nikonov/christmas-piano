// Level progress as one connected path: the levels stand left to right, joined by links that are filled up to the
// level being worked on. Under the row, the selected level's gauge runs from nothing to the goal (three stars =
// the next level opens), between that level's block and the next one's; a soft beam of the theme's light joins the
// selected tile's edges to the gauge's edges, so it is clear whose progress it shows. Levels not selected are dimmed.
// The three star marks stand under the gauge line at the star thresholds; the child reads stars, never a number.
// Each theme draws the same parts its own way (styles.css, [data-path]):
//   xp     pixel    a dotted pixel road, a segmented XP bar, a stepped dashed beam
//   tube   plastic  a soft thick tube, a glossy tube gauge, a soft beam with no edges
//   trail  winter   a footprint trail as links and as the gauge, a snowman walking along it, a frosty white beam
//   beam   anime    thin glowing lines, a glowing beam gauge with a sparkle at its tip, a light beam with glowing edges
// A perfect game (100%) shows one star with a pulsing halo instead of three.

import { LEVELS, STAR_AT, GOAL, PERFECT, starsFor, goalPart } from '../core/levels.js';
import { bestKey, PART_KEYS } from '../core/songs.js';
import { blockSVG } from './art.js';
import { icon } from './icons.js';

export const PATH_STYLE = { pixel: 'xp', plastic: 'tube', winter: 'trail', anime: 'beam' };
const MARKS = STAR_AT.map(t => t / GOAL);

// Best result of a level over the song lengths a parent may have set: stars (from the best % where it is
// known, so results from before the star thresholds changed count by today's rule) and the best %.
export function levelBest(p, song, level){
  let stars = 0, top = 0;
  PART_KEYS.forEach(k => {
    const key = bestKey(song, level, k), t = +(p.top && p.top[key]) || 0;
    top = Math.max(top, t); stars = Math.max(stars, Math.min(3, +(p.best && p.best[key]) || 0), starsFor(t));
  });
  return { stars, top, perfect: top >= PERFECT };
}

// Three stars, or one star with a halo after a perfect game.
export function starsHTML(n, perfect){
  if (perfect) return '<span class="perfect">' + icon('star', { fill: true }) + '</span>';
  return [0,1,2].map(i => icon('star', { fill: i < n, cls: i < n ? '' : 'off' })).join('');
}

const SNOWMAN = '<svg class="walker snow" viewBox="0 0 24 32" aria-hidden="true"><circle cx="12" cy="23" r="8" fill="#fff"/><circle cx="12" cy="11" r="6" fill="#fff"/>' +
  '<rect x="6" y="2" width="12" height="4" rx="1" fill="var(--accent-dark)"/><circle cx="10" cy="10" r="1" fill="#234"/><circle cx="14" cy="10" r="1" fill="#234"/><path d="M12 12l4 1.2-4 .6z" fill="#F29B4B"/></svg>';
const SPARK = '<svg class="walker spark" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1l2.6 8.4L23 12l-8.4 2.6L12 23l-2.6-8.4L1 12l8.4-2.6z" fill="#fff"/></svg>';
const WALKER = { trail: SNOWMAN, beam: SPARK };

// The gauge: a fill to `f` (0..1 of the goal) with the three star marks under it; kind = how the theme draws it.
export function gaugeHTML(kind, f){
  return '<span class="gauge g-' + kind + (f >= 1 ? ' full' : '') + '" style="--f:' + f.toFixed(3) + '"><i class="fill"></i>' + (WALKER[kind] || '') +
    MARKS.map((m, i) => '<span class="mk' + (f >= m ? ' on' : '') + (i === 2 ? ' goal' : '') + '" style="--at:' + m.toFixed(3) + '">' + icon('star', { fill: f >= m }) + '</span>').join('') + '</span>';
}

// The link between level i and i+1: done when both are behind the level being worked on, otherwise todo.
export function linkHTML(i, cur){
  const done = i < cur;
  return '<span class="link ' + (done ? 'done' : 'todo') + '" style="--f:' + (done ? 1 : 0) + '" aria-hidden="true"><i class="fill"></i></span>';
}

// The gauge row: this level's block, the gauge, the next level's block (grey while it is locked) or a star on the top level.
export function xpHTML(theme, level, f, nextOpen){
  const kind = PATH_STYLE[theme] || 'xp', last = level >= LEVELS.length - 1;
  const end = last ? icon('star', { fill: true }) : blockSVG(level + 1, theme);
  return '<span class="xpend">' + blockSVG(level, theme) + '</span>' + gaugeHTML(kind, f) + '<span class="xpend to' + (last || nextOpen ? '' : ' locked') + '">' + end + '</span>';
}

// The beam from the selected tile's bottom edge to the gauge's top edge: t and g are the two boxes
// ({ left, right, top, bottom }) in the path box's own coordinates.
export function beamSVG(t, g){
  const n = v => v.toFixed(1), tl = n(t.left + 6), tr = n(t.right - 6), ty = n(t.bottom), gl = n(g.left), gr = n(g.right), gy = n(g.top);
  return '<svg class="cnbeam" aria-hidden="true"><defs><linearGradient id="cnfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="f0"/><stop offset="1" class="f1"/></linearGradient></defs>' +
    '<polygon points="' + tl + ',' + ty + ' ' + tr + ',' + ty + ' ' + gr + ',' + gy + ' ' + gl + ',' + gy + '" fill="url(#cnfill)"/>' +
    '<line class="edge" x1="' + tl + '" y1="' + ty + '" x2="' + gl + '" y2="' + gy + '"/><line class="edge" x1="' + tr + '" y1="' + ty + '" x2="' + gr + '" y2="' + gy + '"/></svg>';
}
export { goalPart };
