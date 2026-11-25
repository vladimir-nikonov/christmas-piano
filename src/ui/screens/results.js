// Results screen shown after a game.

import { LEVELS, PERFECT, goalPart } from '../../core/levels.js';
import { unlocked } from '../../data/storage.js';
import { $ } from '../../dom.js';
import { keyFor, G } from '../../game/game.js';
import { tx } from '../../i18n/index.js';
import { blockSVG } from '../art.js';
import { xpHTML } from '../progress.js';
import { W, keys, hitY } from '../canvas.js';
import { icon } from '../icons.js';
import { state, paused } from '../../game/game.js';
import { unlockFx, flyContent, flight, landFx, moveRight, fadeReset, particles } from '../themefx.js';

const reducedMotion = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

// Exactly one primary action, chosen from the outcome:
//   new level opened -> play it (Home and Replay are secondary)
//   otherwise        -> replay  (Home; Next level as a small icon only with 2-3 stars and the next level unlocked)
// The last level has no next level, so there it is always "play again".
export function resultActions({ stars, levelUp, nextOpen }){
  return { main: levelUp ? 'next' : 'again', again: levelUp, next: !levelUp && stars >= 2 && nextOpen };
}

/* ================= Results screen ================= */
// The child reads the stars; the % is a small caption, and the best % and past results live in the parent table.
export function showResults({ p, pr, song, level, metric, stars, levelUp }){
  const nextOpen = level < LEVELS.length - 1 && unlocked(p, level + 1, song);
  const act = resultActions({ stars, levelUp, nextOpen });
  const calm = reducedMotion();
  clearFly();
  // A perfect game: one star with a halo instead of three
  $('#resStars').innerHTML = metric >= PERFECT ? '<span class="perfect' + (calm ? '' : ' wait') + '">' + icon('star', { fill: true }) + '</span>'
    : [0,1,2].map(i => '<span' + (i < stars && !calm ? ' class="wait"' : '') + '>' + icon('star', { fill: i < stars, cls: i < stars ? '' : 'off' }) + '</span>').join('');
  $('#resPct').textContent = metric + '%';
  const lu = $('#resLevelUp'); lu.hidden = !levelUp;
  if (levelUp) lu.innerHTML = '<span class="blk">' + blockSVG(pr.level) + '<span class="lk">' + icon('lock') + '</span></span>';
  // Not there yet: how close this game came to the next level (the same gauge as on home, three stars at its end)
  $('#resXp').innerHTML = (!levelUp && level === pr.level && pr.level < LEVELS.length - 1) ? xpHTML(p.theme, level, goalPart(metric)) : '';
  $('#btnAgain').hidden = !act.again;
  $('#btnNext').hidden = !act.next;
  const main = $('#btnMain'), ta = act.main === 'next' ? 'playNew' : 'again';
  main.dataset.go = act.main; main.dataset.ta = ta; main.setAttribute('aria-label', tx(ta));
  main.classList.toggle('lvl', act.main === 'next');
  main.innerHTML = act.main === 'next' ? '<span class="blk">' + blockSVG(level + 1) + '</span>' + icon('play', { fill: true }) : icon('retry');
  // The new level block opens the theme's way (lock crumbles, pops, melts or shatters), with its particles
  if (levelUp) unlockFx(lu.querySelector('.blk'), calm ? null : rewardLayer());
  if (stars && !calm) celebrate();
}
// One layer per results visit for the reward effects; clearFly() stops and removes it.
function rewardLayer(){
  return $('#results .flylayer') || Object.assign($('#results').appendChild(document.createElement('div')), { className: 'flylayer' });
}

// The last note's place bursts into theme particles, and one star per earned star flies from it up to the star row (about 1 s).
function celebrate(){
  const last = G && G.notes[G.notes.length - 1], k = last && keys[keyFor(last.midi)];
  const x = k ? k.x + k.w / 2 : W / 2, y = hitY;
  const layer = rewardLayer();
  particles(layer, x, y); // on the results layer: the game field is covered by the theme picture
  $('#resStars').querySelectorAll('span.wait').forEach((slot, i) => {
    const show = () => slot.classList.remove('wait');
    const r = slot.getBoundingClientRect(), s = r.width || 60;
    const el = document.createElement('div'); el.className = 'fly'; el.innerHTML = flyContent();
    el.style.cssText = 'left:' + (x - s / 2) + 'px;top:' + (y - s / 2) + 'px;width:' + s + 'px;height:' + s + 'px';
    layer.appendChild(el);
    if (!el.animate){ show(); return; }
    const dx = r.left - (x - s / 2), dy = r.top - (y - s / 2);
    // The theme sets the flight's feel (pixel steps, toy spring, soft glide, energy turning into a star)
    const a = flight(el, dx, dy, i * 100);
    a.onfinish = () => { show(); el.remove(); if (!layer.dataset.skip) landFx(layer, r.left + s / 2, r.top + s / 2); };
    a.oncancel = show;
  });
}
function clearFly(){ document.querySelectorAll('#results .flylayer').forEach(l => { l.getAnimations({ subtree: true }).forEach(a => a.cancel()); l.remove(); }); }

// The primary button runs the chosen action; tapping it also skips the reward, since the results screen closes.
$('#btnMain').onclick = () => { clearFly(); $($('#btnMain').dataset.go === 'next' ? '#btnNext' : '#btnAgain').click(); };
// Leaving the results any other way also stops the reward, so no star flight keeps running behind the next screen.
['#btnHome', '#btnAgain', '#btnNext'].forEach(id => $(id).addEventListener('click', clearFly));
// Enter / Space on the results screen trigger the primary action (unless another results button has focus).
document.addEventListener('keydown', e => {
  if ((e.key !== 'Enter' && e.key !== ' ') || $('#results').hidden) return;
  const a = document.activeElement;
  if (a && a.tagName === 'BUTTON' && a.closest('#results')) return;
  e.preventDefault(); $('#btnMain').click();
});

// Skip the reward: a tap anywhere on the results (outside the buttons) jumps every effect to its end.
$('#results').addEventListener('pointerdown', e => {
  if (e.target.closest('button')) return;
  const l = $('#results .flylayer'); if (l){ l.dataset.skip = '1'; l.getAnimations({ subtree: true }).forEach(a => a.finish()); }
});
// Spatial transitions out of the results: Next level = the field arrives from the right; Replay = short fade and reset.
// Each runs only when the tap really started a new game (the handlers ignore taps outside the results / pause).
const field = () => [$('#stage'), $('#hud')];
let before = null;
['#btnNext', '#btnAgain', '#btnRestart'].forEach(id => {
  $(id).addEventListener('click', () => { before = { results: !$('#results').hidden, pause: paused }; }, true);
  $(id).addEventListener('click', () => {
    const was = before; before = null;
    if (!was || !(was.results || was.pause) || state !== 'playing' || !$('#results').hidden) return;
    if (id === '#btnNext') moveRight(field()); else fadeReset(field());
  });
});
