// Video cards: the record buttons and the panel that plays the finished card and saves it as a file.
//   home .qrec      arms recording: the next game is filmed from its count-in to the end card
//   HUD #btnRec     starts or stops filming during a game
//   .qvcard         (home, results) opens the last card while one is kept in memory
//   #vcard          panel: watch, Save (a file in Downloads), Send (share sheet, where the browser has one), Delete

import { $ } from '../../dom.js';
import { tx } from '../../i18n/index.js';
import { supported, arm, isArmed, isRecording, start, stop, getCard, deleteCard, cardFileName, onRecChange } from '../../record/recorder.js';
import { icon } from '../icons.js';

const label = (b, key) => { b.dataset.ta = key; b.setAttribute('aria-label', tx(key)); b.title = tx(key); };
let shownUrl = null, savedT = 0;

export function updateRec(){
  const ok = supported(), card = getCard(), rec = isRecording(), armed = isArmed();
  document.querySelectorAll('.qrec').forEach(b => {
    b.hidden = !ok; label(b, armed ? 'recArmOff' : 'recArm');
    b.setAttribute('aria-pressed', armed); b.classList.toggle('armed', armed);
    b.innerHTML = icon('rec', { fill: armed });
  });
  const h = $('#btnRec');
  h.hidden = !ok; label(h, rec ? 'recStop' : 'recStart');
  h.classList.toggle('live', rec); h.setAttribute('aria-pressed', rec);
  h.innerHTML = icon(rec ? 'stop' : 'rec', { fill: true });
  document.querySelectorAll('.qvcard').forEach(b => { b.hidden = !card || rec; label(b, 'vcardOpen'); if (!b.firstChild) b.innerHTML = icon('film'); });
  if (!$('#vcard').hidden && !card) closeCard();
}
onRecChange(updateRec);

export function openCard(){
  const c = getCard(); if (!c) return;
  const v = $('#vcVideo');
  if (shownUrl !== c.url){ v.src = c.url; shownUrl = c.url; }
  $('#btnVcShare').hidden = !canShare(c);
  $('#vcMsg').textContent = '';
  $('#vcard').hidden = false;
}
function closeCard(){ const v = $('#vcVideo'); try { v.pause(); } catch(e){ /* ignore */ } $('#vcard').hidden = true; }
function file(c){ try { return new File([c.blob], cardFileName(c), { type: c.type }); } catch(e){ return null; } }
function canShare(c){ try { const f = file(c); return !!(f && navigator.canShare && navigator.canShare({ files: [f] })); } catch(e){ return false; } }
function say(key){ clearTimeout(savedT); $('#vcMsg').textContent = tx(key); savedT = setTimeout(() => { $('#vcMsg').textContent = ''; }, 4000); }

function saveCard(){
  const c = getCard(); if (!c) return;
  try {
    const a = document.createElement('a'); a.href = c.url; a.download = cardFileName(c); a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    say('vcardSaved');
  } catch(e){ say('vcardSaveFail'); }
}
async function shareCard(){
  const c = getCard(), f = c && file(c); if (!f) return;
  try { await navigator.share({ files: [f], title: tx('title') }); }
  catch(e){ if (e && e.name !== 'AbortError') say('vcardSaveFail'); }
}

document.addEventListener('click', e => {
  if (e.target.closest('.qrec')) arm(!isArmed());
  else if (e.target.closest('.qvcard')) openCard();
});
$('#btnRec').onclick = () => { if (isRecording()) stop(); else start(); };
$('#btnVcSave').onclick = saveCard;
$('#btnVcShare').onclick = shareCard;
$('#btnVcClose').onclick = closeCard;
$('#btnVcDelete').onclick = () => { closeCard(); shownUrl = null; $('#vcVideo').removeAttribute('src'); deleteCard(); };
export const isCardOpen = () => !$('#vcard').hidden;
export { closeCard };
updateRec();
