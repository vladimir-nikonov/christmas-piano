// Computer keyboard input: A S D F G H J K play the white keys, W E T Y U the black keys; Escape pauses.

import { tone } from '../audio/synth.js';
import { midiForCode } from '../core/keymap.js';
import { dev } from '../data/storage.js';
import { $ } from '../dom.js';
import { state, paused, fx, onPlayed } from '../game/game.js';

const typing = el => el && (el.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName));
document.addEventListener('keydown', e => {
  if (state !== 'playing' || typing(e.target)) return;
  if (e.key === 'Escape' || e.key === 'Esc'){ if (!paused) $('#btnPause').click(); return; }
  if (paused || e.ctrlKey || e.metaKey || e.altKey) return;
  const m = midiForCode(e.code); if (m == null) return;
  e.preventDefault();
  if (e.repeat) return;
  fx.kbLetters = true;
  // With the microphone on, the speaker tone would be heard again as a second note.
  if (dev().touch) tone(m, 0.4);
  onPlayed(m, performance.now(), 'key');
});
