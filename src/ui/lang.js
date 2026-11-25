// Language selection and the quick pickers: the language button opens only languages, the theme button only themes.

import { db, save, P } from '../data/storage.js';
import { $ } from '../dom.js';
import { S, is } from '../core/flow.js';
import { state } from '../game/game.js';
import { LANGS, I18N, detectLang, LANG, tx, useLang } from '../i18n/index.js';
import { resetHeard } from '../input/mic.js';
import { invalidateBg } from './canvas.js';
import { renderHome } from './screens/home.js';
import { renderProfiles, pickTheme, wizAt, wizStep, renderMe } from './screens/profiles.js';
import { renderSettings } from './screens/settings.js';
import { THEMES, THEME_KEYS } from './theme-data.js';
import { updateInputMode } from './inputmode.js';
import { updateCamera } from './camwin.js';
import { updateRec } from './screens/vcard.js';
import { applyTheme, themePreview } from './theme.js';
import { flagSVG } from './flags.js';

/* Language: browser default -> profile choice */
// A child's own choice wins; otherwise the browser language. Before any player exists, the last choice on this device.
function wantedLang(){ const p = P(); if (p) return I18N[p.lang] ? p.lang : detectLang(); return I18N[db.lang] ? db.lang : detectLang(); }
export function translateDom(){
  document.documentElement.lang = LANG === 'uk' ? 'uk' : LANG;
  document.title = tx('title');
  document.querySelectorAll('[data-t]').forEach(el => el.textContent = tx(el.dataset.t));
  document.querySelectorAll('[data-ta]').forEach(el => el.setAttribute('aria-label', tx(el.dataset.ta)));
  document.querySelectorAll('[data-tp]').forEach(el => el.setAttribute('placeholder', tx(el.dataset.tp)));
  resetHeard();
  updateQuick();
}
export function syncLang(){ const w = wantedLang(); if (w !== LANG) useLang(w); translateDom(); }
export function setLang(code){
  if (!I18N[code]) return;
  useLang(code); db.lang = code; const p = P(); if (p && state !== 'newp') p.lang = code; save();
  translateDom();
  if (state === 'home') renderHome(); else if (state === 'profiles') renderProfiles(); else if (state === 'newp') wizStep(wizAt); else if (state === 'me') renderMe();
  if (is(S.SETTINGS)) renderSettings();
  if (!$('#pop').hidden) renderPop();
}
export function updateQuick(){
  const L = LANGS.find(x => x.id === LANG) || LANGS[0];
  document.querySelectorAll('.qlang').forEach(b => { b.innerHTML = flagSVG(L.id); });
  const p = P(), th = state === 'newp' ? pickTheme : (p ? p.theme : 'pixel');
  document.querySelectorAll('.qtheme').forEach(b => b.innerHTML = themePreview(th));
  updateInputMode();
  updateCamera();
  updateRec();
}
let popMode = 'lang';
function renderPop(){
  const isLang = popMode === 'lang', p = P();
  $('#popTitle').textContent = tx(isLang ? 'language' : 'theme');
  const box = $('#popLangs'), tb = $('#popThemes');
  box.textContent = ''; tb.textContent = '';
  box.hidden = !isLang; tb.hidden = isLang;
  if (isLang) LANGS.forEach(L => { const b = document.createElement('button'); b.className = 'b chip'; b.setAttribute('aria-pressed', L.id === LANG); b.setAttribute('lang', L.id);
    b.innerHTML = flagSVG(L.id) + '<span class="nm"></span>'; b.querySelector('.nm').textContent = L.name;
    b.onclick = () => setLang(L.id); box.appendChild(b); });
  else if (p) THEME_KEYS.forEach(k => { const th = THEMES[k], b = document.createElement('button'); b.className = 'b tcard'; b.setAttribute('aria-pressed', k === p.theme); b.setAttribute('aria-label', tx('theme') + ' ' + th.name);
    b.style.background = th.panel; b.style.borderColor = th.border; b.style.color = th.text; b.style.borderRadius = Math.min(th.radius, 20) + 'px'; b.style.fontFamily = th.font + ', system-ui, sans-serif';
    b.innerHTML = themePreview(k) + '<span class="nm"></span>'; b.querySelector('.nm').textContent = th.name;
    b.onclick = () => { p.theme = k; save(); applyTheme(k); invalidateBg(); updateQuick(); renderPop(); if (state === 'home') renderHome(); else if (state === 'me') renderMe(); };
    tb.appendChild(b); });
}
function openPop(mode){ popMode = mode; renderPop(); $('#pop').hidden = false; }
document.addEventListener('click', e => { const q = e.target.closest('.qlang, .qtheme'); if (q) openPop(q.classList.contains('qlang') ? 'lang' : 'theme'); });
$('#btnPopClose').onclick = () => { $('#pop').hidden = true; };
$('#pop').addEventListener('click', e => { if (e.target.id === 'pop') $('#pop').hidden = true; });
