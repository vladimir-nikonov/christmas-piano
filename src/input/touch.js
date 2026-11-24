// Touch input on the drawn keyboard (parent setting "Screen taps").

import { tone } from '../audio/synth.js';
import { dev } from '../data/storage.js';
import { onPlayed } from '../game/game.js';
import { cv, LO, HI, isBlack, keys, kbTop, kbH } from '../ui/canvas.js';

cv.addEventListener('pointerdown', e => {
  if (!dev().touch || e.clientY < kbTop) return;
  let hit = null;
  for (let m = LO; m <= HI; m++) if (isBlack(m)){ const k = keys[m]; if (e.clientX >= k.x && e.clientX <= k.x + k.w && e.clientY <= kbTop + kbH * 0.58) hit = m; }
  if (hit == null) for (let m = LO; m <= HI; m++) if (!isBlack(m)){ const k = keys[m]; if (e.clientX >= k.x && e.clientX <= k.x + k.w) hit = m; }
  if (hit != null){ tone(hit, 0.4); onPlayed(hit, performance.now(), 'touch'); }
});
