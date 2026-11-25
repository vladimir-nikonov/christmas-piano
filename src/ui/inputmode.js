// Input mode of this device: a real piano heard by the microphone, or the screen and computer keyboard.
// Stored as device.touch (true = no microphone); the quick button on home and in the paused game HUD switches it.

import { dev, save } from '../data/storage.js';
import { $ } from '../dom.js';
import { state } from '../game/game.js';
import { tx } from '../i18n/index.js';
import { startMic } from '../input/mic.js';
import { icon } from './icons.js';

export function updateInputMode(){
  const scr = !!dev().touch;
  document.querySelectorAll('.qinput').forEach(b => {
    b.dataset.ta = scr ? 'inScreen' : 'inMic';
    b.setAttribute('aria-label', tx(b.dataset.ta)); b.title = tx(b.dataset.ta);
    b.setAttribute('aria-pressed', scr);
    b.innerHTML = icon(scr ? 'keys' : 'mic');
  });
  $('#micPill').hidden = scr || state !== 'playing';
}
export function setScreenInput(on){
  dev().touch = !!on; save();
  if (!on && state === 'playing') startMic();
  updateInputMode();
}
document.addEventListener('click', e => { if (e.target.closest('.qinput')) setScreenInput(!dev().touch); });
