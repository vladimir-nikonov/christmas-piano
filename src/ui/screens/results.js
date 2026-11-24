// Results screen shown after a game.

import { LEVELS } from '../../core/levels.js';
import { NOTE_COLORS } from '../../core/music.js';
import { unlocked } from '../../data/storage.js';
import { $, showOnly } from '../../dom.js';
import { burst } from '../../game/game.js';
import { tx } from '../../i18n/index.js';
import { blockSVG } from '../art.js';
import { W, H } from '../canvas.js';
import { icon } from '../icons.js';
import { histHTML } from './home.js';

/* ================= Results screen ================= */
export function showResults({ p, pr, key, song, level, metric, stars, record, levelUp }){
  const o = p.opts;
  $('#resStars').innerHTML = [0,1,2].map(i => '<span style="animation-delay:' + (i * 0.15) + 's">' + icon('star', { fill: i < stars, cls: i < stars ? '' : 'off' }) + '</span>').join('');
  $('#resPct').textContent = metric + '%';
  const lu = $('#resLevelUp'); lu.hidden = !levelUp;
  if (levelUp) lu.innerHTML = '<span class="blk">' + blockSVG(pr.level) + '</span><span>+1</span>';
  $('#resXp').innerHTML = (!levelUp && level === pr.level && pr.level < LEVELS.length - 1)
    ? '<span class="blk">' + blockSVG(pr.level + 1) + '</span><span class="pips"><i class="' + (pr.streak > 0 ? 'on' : '') + '"></i><i></i></span>' + (o.lockLevels ? icon('lock') : '') : '';
  $('#resHist').innerHTML = histHTML(p, key, true) + (record ? '<span class="rec">' + tx('record') + '</span>' : '');
  $('#btnNext').hidden = !(level < LEVELS.length - 1 && unlocked(p, level + 1, song));
  showOnly('#results');
  if (stars) for (let i = 0; i < 4; i++) setTimeout(() => burst(W * (0.2 + Math.random() * 0.6), H * 0.4, NOTE_COLORS[(i * 2) % 7], 30), i * 180);
}
