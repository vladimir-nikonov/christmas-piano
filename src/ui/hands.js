// Fingering hint switch in the game HUD, like the subtitles button of a video player: shows or hides the hand
// on the keys. Stored per player as opts.hands (on by default).

import { opts, save } from '../data/storage.js';
import { tx } from '../i18n/index.js';
import { icon } from './icons.js';

export function updateHandsBtn(){
  const on = opts().hands !== false;
  document.querySelectorAll('.qhands').forEach(b => {
    b.dataset.ta = on ? 'handsOff' : 'handsOn';
    b.setAttribute('aria-label', tx(b.dataset.ta)); b.title = tx(b.dataset.ta);
    b.setAttribute('aria-pressed', on);
    b.innerHTML = icon(on ? 'hand' : 'hand-off');
  });
}
export function setHands(on){ opts().hands = !!on; save(); updateHandsBtn(); }
document.addEventListener('click', e => { if (e.target.closest('.qhands')) setHands(opts().hands === false); });
