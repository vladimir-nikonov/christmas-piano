// Level progress as one connected path: the levels stand left to right, joined by links that fill as the child
// climbs, and the level being worked on shows a gauge from nothing to the goal (three stars = the next level opens).
// The gauge carries three star marks (the star thresholds); the child reads stars, never a number.
// Each theme draws the same path its own way (styles.css, [data-theme]):
//   pixel    world map: square tiles, a dotted pixel road and an XP bar under the row, from this level's block to the next
//   plastic  bubble caterpillar: a thick soft tube between the tiles and a ring around the current block
//   winter   a snowy trail: the trail to the next level is the gauge, a snowman walks along it
//   anime    a constellation: thin glowing lines and one shared bar under all levels; its part between the current
//            level and the next one is the gauge
// On the winter and anime paths the link from the current level is wider, so the gauge has room.
// A perfect game (100%) shows one star with a pulsing halo instead of three.

import { LEVELS, STAR_AT, GOAL, PERFECT, starsFor, goalPart } from '../core/levels.js';
import { bestKey, PART_KEYS } from '../core/songs.js';
import { blockSVG } from './art.js';
import { icon } from './icons.js';

export const PATH_STYLE = { pixel: 'xp', plastic: 'ring', winter: 'trail', anime: 'bar' };
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

// The gauge: a fill to `f` (0..1 of the goal) with the three star marks; kind = how the theme draws it.
export function gaugeHTML(kind, f, extra){
  return '<span class="gauge g-' + kind + (f >= 1 ? ' full' : '') + '" style="--f:' + f.toFixed(3) + '">' + (extra || '') + '<i class="fill"></i>' +
    MARKS.map((m, i) => '<span class="mk' + (f >= m ? ' on' : '') + (i === 2 ? ' goal' : '') + '" style="--at:' + m.toFixed(3) + '">' + icon('star', { fill: f >= m }) + '</span>').join('') + '</span>';
}

const SNOWMAN = '<svg class="walker" viewBox="0 0 24 32" aria-hidden="true"><circle cx="12" cy="23" r="8" fill="#fff"/><circle cx="12" cy="11" r="6" fill="#fff"/>' +
  '<rect x="6" y="2" width="12" height="4" rx="1" fill="var(--accent-dark)"/><circle cx="10" cy="10" r="1" fill="#234"/><circle cx="14" cy="10" r="1" fill="#234"/><path d="M12 12l4 1.2-4 .6z" fill="#F29B4B"/></svg>';

// The link between level i and i+1: done (both behind), cur (from the current level to the next: fills with the
// best result; on the winter trail it is the gauge itself) or todo.
export function linkHTML(i, cur, f, kind){
  const st = i < cur ? 'done' : i === cur ? 'cur' : 'todo', ff = st === 'done' ? 1 : st === 'cur' ? f : 0;
  const inner = st === 'cur' && kind === 'trail' ? gaugeHTML('trail', f, SNOWMAN) : '<i class="fill"></i>';
  const bar = kind !== 'bar' ? '' : st === 'cur' ? gaugeHTML('bar', f) : barHTML(ff);
  return '<span class="link ' + st + '" style="--f:' + ff.toFixed(3) + '" aria-hidden="true">' + inner + bar + '</span>';
}
// One piece of the anime theme's shared bar (under a tile, or a link other than the current one).
export const barHTML = f => '<span class="seg" style="--f:' + f.toFixed(3) + '"><i class="fill"></i></span>';

// The XP bar under the row (pixel theme): this level's block, the gauge, the next level's block (or a star on the top level).
export function xpHTML(theme, cur, f){
  const end = cur < LEVELS.length - 1 ? blockSVG(cur + 1, theme) : icon('star', { fill: true });
  return '<span class="xpend">' + blockSVG(cur, theme) + '</span>' + gaugeHTML('xp', f) + '<span class="xpend to' + (f >= 1 ? '' : ' locked') + '">' + end + '</span>';
}
export { goalPart };
