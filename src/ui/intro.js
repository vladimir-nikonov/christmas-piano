// How-to-play intro for a new player: not slides to read but the first note to play.
// A note falls down its lane and waits on the line above a small keyboard (C D E F G); its key pulses under an arrow.
// Tapping that key (or D on the computer keyboard) plays it: the note bursts, three stars pop up and the
// "Let's play" button appears. Another key just wobbles softly and the right one pulses again, as in the game.

import { tone } from '../audio/synth.js';
import { midiForCode } from '../core/keymap.js';
import { PC_COLOR } from '../core/music.js';
import { icon } from './icons.js';
import { noteName } from './labels.js';

export const FIRST_KEYS = [60, 62, 64, 65, 67];
export const FIRST_NOTE = 64;

// Builds the scene in box and returns a function that removes its listeners. onDone runs once, on the right note.
export function mountFirstNote(box, onDone){
  const at = FIRST_KEYS.indexOf(FIRST_NOTE), col = PC_COLOR[FIRST_NOTE % 12];
  box.innerHTML =
    '<div class="fn" style="--fn-at:' + at + ';--fn-n:' + FIRST_KEYS.length + ';--fn-col:' + col + '">' +
      '<div class="fnfield" aria-hidden="true"><div class="fnnote"><span></span></div><div class="fnline"></div>' +
        '<div class="fnarrow">' + icon('arrow-down') + '</div><div class="fnstars">' + [0, 1, 2].map(() => icon('star', { fill: true })).join('') + '</div></div>' +
      '<div class="fnkeys">' + FIRST_KEYS.map(m => '<button class="b fnkey' + (m === FIRST_NOTE ? ' target' : '') + '" data-m="' + m + '"><span class="tab" style="background:' + PC_COLOR[m % 12] + '"></span></button>').join('') + '</div>' +
    '</div>';
  const fn = box.firstChild;
  fn.querySelector('.fnnote span').textContent = noteName(FIRST_NOTE);
  fn.querySelectorAll('.fnkey').forEach(b => { const m = +b.dataset.m; b.querySelector('.tab').textContent = noteName(m); b.setAttribute('aria-label', noteName(m)); });
  let done = false;
  const play = m => {
    if (done) return;
    tone(m, 0.5);
    const key = fn.querySelector('.fnkey[data-m="' + m + '"]');
    if (m === FIRST_NOTE){
      done = true; fn.classList.add('done'); key.classList.add('hit');
      onDone();
    } else if (key){
      key.classList.remove('soft'); void key.offsetWidth; key.classList.add('soft');
      fn.classList.remove('nudge'); void fn.offsetWidth; fn.classList.add('nudge');
    }
  };
  fn.querySelectorAll('.fnkey').forEach(b => { b.onpointerdown = e => { e.preventDefault(); play(+b.dataset.m); }; });
  const onKey = e => {
    if (box.closest('[hidden]') || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const m = midiForCode(e.code); if (m == null) return;
    e.preventDefault(); play(m);
  };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}
