// Player list, new player wizard and the child's own page.

import { DEF_OPTS, db, save, P, freshProg } from '../../data/storage.js';
import { E, dispatch } from '../../core/flow.js';
import { $ } from '../../dom.js';
import { LANGS, LANG, tx } from '../../i18n/index.js';
import { AVATARS, avatarSVG, blockSVG } from '../art.js';
import { px, invalidateBg } from '../canvas.js';
import { icon } from '../icons.js';
import { updateQuick, setLang } from '../lang.js';
import { flagSVG } from '../flags.js';
import { INTRO } from '../intro.js';
import { goHome } from './home.js';
import { THEMES, THEME_KEYS } from '../theme-data.js';
import { applyTheme, themePreview } from '../theme.js';
import { expandFrom } from '../themefx.js';

export function openProfiles(){ if (dispatch(E.PROFILES)) renderProfiles(); }
export function renderProfiles(){
  const box = $('#ptiles'); box.textContent = '';
  db.profiles.forEach(p => {
    const t = THEMES[p.theme], b = document.createElement('button'); b.className = 'b ptile'; b.setAttribute('aria-label', p.name || tx('who'));
    b.style.background = t.panel; b.style.borderColor = t.border; b.style.color = t.text; b.style.borderRadius = t.radius + 'px'; b.style.fontFamily = t.font + ', system-ui, sans-serif'; b.style.boxShadow = '0 ' + px(5) + 'px 0 ' + t.accentDark;
    b.innerHTML = avatarSVG(p.avatar, px(96), p.theme) + '<span class="nm"></span><span class="meta"><span style="display:block;width:' + px(28) + 'px;height:' + px(28) + 'px;border-radius:3px;overflow:hidden">' + blockSVG(p.level, p.theme) + '</span></span>';
    b.querySelector('.nm').textContent = p.name || ' ';
    b.onclick = () => { db.current = p.id; save(); goHome(); };
    box.appendChild(b);
  });
  const add = document.createElement('button'); add.className = 'b ptile add'; add.setAttribute('aria-label', tx('newPlayer'));
  add.innerHTML = icon('plus'); add.onclick = openNewProfile; box.appendChild(add);
}
// New player wizard: 1) language and theme, 2) avatar and name (the player is created here), 3) the how-to-play intro.
export let pickAv = 0, pickTheme = 'pixel', wizAt = 1;
let introAt = 0;
export function openNewProfile(){
  if (!dispatch(E.NEW_PLAYER)) return;
  const used = new Set(db.profiles.map(p => p.avatar));
  pickAv = AVATARS.findIndex((_, i) => !used.has(i)); if (pickAv < 0) pickAv = 0;
  pickTheme = 'pixel'; applyTheme(pickTheme);
  $('#newName').value = '';
  wizStep(1);
}
const press = (box, on) => box.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === on));
export function wizStep(n){
  wizAt = n;
  [1, 2, 3].forEach(i => { $('#step' + i).hidden = n !== i; $('#st' + i).className = i <= n ? 'on' : ''; });
  $('#btnNewBack').hidden = n === 3 || (n === 1 && !db.profiles.length);
  if (n === 1){
    const lb = $('#langPick'); lb.textContent = '';
    LANGS.forEach(L => { const b = document.createElement('button'); b.className = 'b chip lchip'; b.setAttribute('aria-pressed', L.id === LANG); b.setAttribute('lang', L.id);
      b.innerHTML = flagSVG(L.id) + '<span class="nm"></span>'; b.querySelector('.nm').textContent = L.name;
      b.onclick = () => setLang(L.id); lb.appendChild(b); });
    const box = $('#themePick'); box.textContent = '';
    THEME_KEYS.forEach(k => { const t = THEMES[k], b = document.createElement('button'); b.className = 'b tcard'; b.setAttribute('aria-pressed', k === pickTheme); b.setAttribute('aria-label', tx('theme') + ' ' + t.name);
      b.style.background = t.panel; b.style.borderColor = t.border; b.style.color = t.text; b.style.borderRadius = t.radius + 'px'; b.style.fontFamily = t.font + ', system-ui, sans-serif'; b.style.boxShadow = '0 ' + px(5) + 'px 0 ' + t.accentDark;
      b.innerHTML = themePreview(k) + '<span class="nm"></span>'; b.querySelector('.nm').textContent = t.name;
      b.onclick = () => { pickTheme = k; applyTheme(k); press(box, b); };
      box.appendChild(b); });
  } else if (n === 2){
    const box = $('#avpick'); box.textContent = '';
    AVATARS.forEach((_, i) => { const b = document.createElement('button'); b.className = 'b' + (i === pickAv ? ' on' : ''); b.setAttribute('aria-pressed', i === pickAv); b.setAttribute('aria-label', tx('avatar') + ' ' + (i + 1));
      b.innerHTML = avatarSVG(i, px(84), pickTheme);
      b.onclick = () => { pickAv = i; press(box, b); box.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); }; box.appendChild(b); });
  } else renderIntro();
}
function renderIntro(){
  const [tk, xk, pic] = INTRO[introAt], last = introAt === INTRO.length - 1;
  $('#introPic').innerHTML = pic();
  $('#introTitle').textContent = tx(tk); $('#introText').textContent = tx(xk);
  $('#introDots').innerHTML = INTRO.map((_, i) => '<i class="' + (i === introAt ? 'on' : '') + '"></i>').join('');
  $('#btnIntroSkip').hidden = last;
  const go = $('#btnIntroNext');
  go.innerHTML = last ? icon('play', { fill: true }) + '<span></span>' : icon('next');
  if (last) go.querySelector('span').textContent = tx('introGo');
  go.classList.toggle('wide', last);
  go.setAttribute('aria-label', last ? tx('introGo') : tx('next'));
}
// The intro again on its own (from parent settings), for the current player; it ends on home like the first time.
export function openIntro(){
  const p = P(); if (!p || !dispatch(E.NEW_PLAYER)) return false;
  pickTheme = p.theme; applyTheme(p.theme); updateQuick();
  introAt = 0; wizStep(3); return true;
}
$('#btnLookNext').onclick = () => wizStep(2);
$('#newName').addEventListener('keydown', e => { if (e.key === 'Enter') $('#btnNewOk').click(); });
$('#btnNewOk').onclick = () => {
  const p = { id: 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1e4), name: $('#newName').value.trim(), avatar: pickAv, theme: pickTheme, lang: LANG, level:0, streak:0, prog: freshProg(), best:{}, hist:{}, top:{}, sel:{ level:0, part:'short' }, opts: Object.assign({}, DEF_OPTS) };
  db.profiles.push(p); db.current = p.id; save();
  $('#newName').blur(); introAt = 0; wizStep(3);
};
$('#btnIntroNext').onclick = () => { if (introAt < INTRO.length - 1){ introAt++; renderIntro(); } else goHome(); };
$('#btnIntroSkip').onclick = () => goHome();
// Back: intro -> home (the player already exists), name -> look, look -> player list
$('#btnNewBack').onclick = () => { if (wizAt === 3) goHome(); else if (wizAt === 2) wizStep(1); else { if (P()) applyTheme(P().theme); openProfiles(); } };
$('#btnWho').onclick = openProfiles;
// Spatial: the player list expands from the avatar. The capture listener reads the avatar's place before the
// handler hides home; the second listener runs after it and animates only if the list really opened.
let whoRect = null;
$('#btnWho').addEventListener('click', e => { whoRect = e.currentTarget.getBoundingClientRect(); }, true);
$('#btnWho').addEventListener('click', () => { const r = whoRect; whoRect = null; if (!$('#profiles').hidden) expandFrom($('#profiles .panel'), r); });
// Close the player list: the cross or a tap on the picture around it.
$('#btnProfClose').onclick = goHome;
$('#profiles').addEventListener('click', e => { if (e.target.id === 'profiles') goHome(); });

/* Child's own page: name, avatar, theme. Saved on every tap. */
export function openMe(){ if (!dispatch(E.ME)) return; renderMe(); updateQuick(); }
export function renderMe(){
  const p = P(); if (!p) return;
  $('#meAv').innerHTML = avatarSVG(p.avatar, px(96), p.theme);
  const nm = $('#meName'); if (document.activeElement !== nm) nm.value = p.name || '';
  nm.oninput = () => { p.name = nm.value.trim(); save(); };
  const av = $('#meAvPick'); av.textContent = '';
  AVATARS.forEach((_, i) => { const b = document.createElement('button'); b.className = 'b' + (i === p.avatar ? ' on' : ''); b.setAttribute('aria-pressed', i === p.avatar); b.setAttribute('aria-label', tx('avatar') + ' ' + (i + 1));
    b.innerHTML = avatarSVG(i, px(72), p.theme); b.onclick = () => { p.avatar = i; save(); renderMe(); }; av.appendChild(b); });
  const box = $('#meThemes'); box.textContent = '';
  THEME_KEYS.forEach(k => { const t = THEMES[k], b = document.createElement('button'); b.className = 'b tcard'; b.setAttribute('aria-pressed', k === p.theme); b.setAttribute('aria-label', tx('theme') + ' ' + t.name);
    b.style.background = t.panel; b.style.borderColor = t.border; b.style.color = t.text; b.style.borderRadius = t.radius + 'px'; b.style.fontFamily = t.font + ', system-ui, sans-serif'; b.style.boxShadow = '0 ' + px(5) + 'px 0 ' + t.accentDark;
    b.innerHTML = themePreview(k) + '<span class="nm"></span>'; b.querySelector('.nm').textContent = t.name;
    b.onclick = () => { p.theme = k; save(); applyTheme(k); invalidateBg(); updateQuick(); renderMe(); }; box.appendChild(b); });
}
$('#btnMe').onclick = openMe;
$('#btnMeBack').onclick = goHome;
$('#btnMeOk').onclick = goHome;
$('#me').addEventListener('click', e => { if (e.target.id === 'me') goHome(); });
$('#meName').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });
