// Touch input on the drawn keyboard. Taps count in both input modes; with the microphone on they
// stay silent, because the speaker tone would be heard again as a second note.

import { tone } from '../audio/synth.js';
import { dev } from '../data/storage.js';
import { onPlayed } from '../game/game.js';
import { cv, LO, HI, isBlack, keys, kbTop, kbH } from '../ui/canvas.js';

cv.addEventListener('pointerdown', e => {
  if (e.clientY < kbTop) return;
  let hit = null;
  for (let m = LO; m <= HI; m++) if (isBlack(m)){ const k = keys[m]; if (e.clientX >= k.x && e.clientX <= k.x + k.w && e.clientY <= kbTop + kbH * 0.58) hit = m; }
  if (hit == null) for (let m = LO; m <= HI; m++) if (!isBlack(m)){ const k = keys[m]; if (e.clientX >= k.x && e.clientX <= k.x + k.w) hit = m; }
  if (hit != null){ if (dev().touch) tone(hit, 0.4); onPlayed(hit, performance.now(), 'touch'); }
});
