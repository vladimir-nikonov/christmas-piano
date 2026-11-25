// Touch input on the drawn keyboard. A tap sounds the note and quiets the microphone for a moment, so the speaker
// tone is not heard again as a second note.

import { tone } from '../audio/synth.js';
import { quietMic } from './mic.js';
import { onPlayed } from '../game/game.js';
import { cv, LO, HI, isBlack, keys, kbTop, kbH } from '../ui/canvas.js';

cv.addEventListener('pointerdown', e => {
  if (e.clientY < kbTop) return;
  let hit = null;
  for (let m = LO; m <= HI; m++) if (isBlack(m)){ const k = keys[m]; if (e.clientX >= k.x && e.clientX <= k.x + k.w && e.clientY <= kbTop + kbH * 0.58) hit = m; }
  if (hit == null) for (let m = LO; m <= HI; m++) if (!isBlack(m)){ const k = keys[m]; if (e.clientX >= k.x && e.clientX <= k.x + k.w) hit = m; }
  if (hit != null){ const at = performance.now(); quietMic(hit, at); tone(hit, 0.4); onPlayed(hit, at, 'touch'); }
});
