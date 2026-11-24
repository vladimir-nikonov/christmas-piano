// Results screen shown after a game.

import { LEVELS } from '../../core/levels.js';
import { unlocked } from '../../data/storage.js';
import { $ } from '../../dom.js';
import { burst, keyFor, G } from '../../game/game.js';
import { tx } from '../../i18n/index.js';
import { blockSVG } from '../art.js';
import { W, keys, hitY } from '../canvas.js';
import { icon } from '../icons.js';
import { TH } from '../theme.js';
import { histHTML } from './home.js';

const reducedMotion = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

// Exactly one primary action, chosen from the outcome:
//   new level opened -> play it (Home and Replay are secondary)
//   otherwise        -> replay  (Home; Next level as a small icon only with 2-3 stars and the next level unlocked)
// The last level has no next level, so there it is always "play again".
export function resultActions({ stars, levelUp, nextOpen }){
  return { main: levelUp ? 'next' : 'again', again: levelUp, next: !levelUp && stars >= 2 && nextOpen };
}

/* ================= Results screen ================= */
export function showResults({ p, pr, key, song, level, metric, stars, record, levelUp }){
  const o = p.opts;
  const nextOpen = level < LEVELS.length - 1 && unlocked(p, level + 1, song);
  const act = resultActions({ stars, levelUp, nextOpen });
  const calm = reducedMotion();
  clearFly();
  $('#resStars').innerHTML = [0,1,2].map(i => '<span' + (i < stars && !calm ? ' class="wait"' : '') + '>' + icon('star', { fill: i < stars, cls: i < stars ? '' : 'off' }) + '</span>').join('');
  $('#resPct').textContent = metric + '%';
  const lu = $('#resLevelUp'); lu.hidden = !levelUp;
  if (levelUp) lu.innerHTML = '<span class="blk">' + blockSVG(pr.level) + '<span class="lk">' + icon('lock') + '</span></span>';
  $('#resXp').innerHTML = (!levelUp && level === pr.level && pr.level < LEVELS.length - 1)
    ? '<span class="blk">' + blockSVG(pr.level + 1) + '</span><span class="pips"><i class="' + (pr.streak > 0 ? 'on' : '') + '"></i><i></i></span>' + (o.lockLevels ? icon('lock') : '') : '';
  $('#resHist').innerHTML = histHTML(p, key, true) + (record ? '<span class="rec">' + tx('record') + '</span>' : '');
  $('#btnAgain').hidden = !act.again;
  $('#btnNext').hidden = !act.next;
  const main = $('#btnMain'), ta = act.main === 'next' ? 'playNew' : 'again';
  main.dataset.go = act.main; main.dataset.ta = ta; main.setAttribute('aria-label', tx(ta));
  main.classList.toggle('lvl', act.main === 'next');
  main.innerHTML = act.main === 'next' ? '<span class="blk">' + blockSVG(level + 1) + '</span>' + icon('play', { fill: true }) : icon('retry');
  if (stars && !calm) celebrate();
}

// The last note turns into particles, and one star per earned star flies from it up to the star row (under 1 s).
function celebrate(){
  const last = G && G.notes[G.notes.length - 1], k = last && keys[keyFor(last.midi)];
  const x = k ? k.x + k.w / 2 : W / 2, y = hitY;
  burst(x, y, TH.reward, 30);
  const layer = document.createElement('div'); layer.className = 'flylayer'; $('#results').appendChild(layer);
  $('#resStars').querySelectorAll('span.wait').forEach((slot, i) => {
    const show = () => slot.classList.remove('wait');
    const r = slot.getBoundingClientRect(), s = r.width || 60;
    const el = document.createElement('div'); el.className = 'fly'; el.innerHTML = icon('star', { fill: true });
    el.style.cssText = 'left:' + (x - s / 2) + 'px;top:' + (y - s / 2) + 'px;width:' + s + 'px;height:' + s + 'px';
    layer.appendChild(el);
    if (!el.animate){ show(); return; }
    const dx = r.left - (x - s / 2), dy = r.top - (y - s / 2);
    const a = el.animate([
      { transform: 'translate(0,0) scale(.4)', opacity: 0.4 },
      { transform: 'translate(' + dx * 0.5 + 'px,' + (dy * 0.5 - 60) + 'px) scale(1.2)', opacity: 1, offset: 0.6 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(1)', opacity: 1 }
    ], { duration: 600, delay: i * 120, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' });
    a.onfinish = () => { show(); el.remove(); };
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
