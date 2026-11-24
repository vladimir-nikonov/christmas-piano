// Language selection and the quick language/theme picker.

import { db, save, P } from '../data/storage.js';
import { $ } from '../dom.js';
import { state } from '../game/game.js';
import { LANGS, I18N, detectLang, LANG, tx, useLang } from '../i18n/index.js';
import { resetHeard } from '../input/mic.js';
import { invalidateBg } from './canvas.js';
import { renderHome } from './screens/home.js';
import { openProfiles, pickTheme, wizAt, wizStep, renderMe } from './screens/profiles.js';
import { settingsOpen, openSettings } from './screens/settings.js';
import { THEMES, THEME_KEYS } from './theme-data.js';
import { updateInputMode } from './inputmode.js';
import { applyTheme, themePreview } from './theme.js';

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
  if (state === 'home') renderHome(); else if (state === 'profiles') openProfiles(); else if (state === 'newp') wizStep(wizAt); else if (state === 'me') renderMe();
  if (settingsOpen) openSettings();
  if (!$('#pop').hidden) renderPop();
}
export function updateQuick(){
  const L = LANGS.find(x => x.id === LANG) || LANGS[0];
  document.querySelectorAll('.qlang').forEach(b => { b.innerHTML = '<span class="code"></span>'; b.firstChild.textContent = L.code; });
  const p = P(), th = state === 'newp' ? pickTheme : (p ? p.theme : 'pixel');
  document.querySelectorAll('.qtheme').forEach(b => b.innerHTML = themePreview(th));
  updateInputMode();
}
function renderPop(){
  const box = $('#popLangs'); box.textContent = '';
  LANGS.forEach(L => { const b = document.createElement('button'); b.className = 'b chip'; b.setAttribute('aria-pressed', L.id === LANG); b.setAttribute('lang', L.id);
    b.innerHTML = '<span class="code"></span><span class="nm"></span>'; b.querySelector('.code').textContent = L.code; b.querySelector('.nm').textContent = L.name;
    b.onclick = () => setLang(L.id); box.appendChild(b); });
  const tb = $('#popThemes'); tb.textContent = ''; const p = P();
  tb.hidden = state === 'newp' || !p;
  if (!tb.hidden) THEME_KEYS.forEach(k => { const th = THEMES[k], b = document.createElement('button'); b.className = 'b tcard'; b.setAttribute('aria-pressed', k === p.theme); b.setAttribute('aria-label', tx('theme') + ' ' + th.name);
    b.style.background = th.panel; b.style.borderColor = th.border; b.style.color = th.text; b.style.borderRadius = Math.min(th.radius, 20) + 'px'; b.style.fontFamily = th.font + ', system-ui, sans-serif';
    b.innerHTML = themePreview(k) + '<span class="nm"></span>'; b.querySelector('.nm').textContent = th.name;
    b.onclick = () => { p.theme = k; save(); applyTheme(k); invalidateBg(); updateQuick(); renderPop(); if (state === 'home') renderHome(); else if (state === 'me') renderMe(); };
    tb.appendChild(b); });
}
function openPop(){ renderPop(); $('#pop').hidden = false; }
document.addEventListener('click', e => { const q = e.target.closest('.qlang, .qtheme'); if (q) openPop(); });
$('#btnPopClose').onclick = () => { $('#pop').hidden = true; };
$('#pop').addEventListener('click', e => { if (e.target.id === 'pop') $('#pop').hidden = true; });
