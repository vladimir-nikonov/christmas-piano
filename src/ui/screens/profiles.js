// Player list, new player wizard and the child's own page.

import { DEF_OPTS, db, save, P, freshProg } from '../../data/storage.js';
import { $, showOnly } from '../../dom.js';
import { setState } from '../../game/game.js';
import { I18N, LANG, tx } from '../../i18n/index.js';
import { AVATARS, avatarSVG, blockSVG } from '../art.js';
import { px, invalidateBg } from '../canvas.js';
import { icon } from '../icons.js';
import { updateQuick } from '../lang.js';
import { goHome } from './home.js';
import { THEMES, THEME_KEYS } from '../theme-data.js';
import { applyTheme, themePreview } from '../theme.js';

export function openProfiles(){
  setState('profiles');
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
  showOnly('#profiles');
}
export let pickAv = 0, pickTheme = 'pixel', pickName = '', wizAt = 1;
export function openNewProfile(){
  setState('newp');
  const used = new Set(db.profiles.map(p => p.avatar));
  pickAv = AVATARS.findIndex((_, i) => !used.has(i)); if (pickAv < 0) pickAv = 0;
  pickTheme = 'pixel'; applyTheme(pickTheme);
  $('#newName').value = '';
  wizStep(1);
  showOnly('#newp');
}
export function wizStep(n){
  wizAt = n;
  $('#step1').hidden = n !== 1; $('#step2').hidden = n !== 2;
  $('#st2').className = n === 2 ? 'on' : '';
  $('#btnNewBack').hidden = n === 1 && !db.profiles.length;
  if (n === 1){
    const box = $('#avpick'); box.textContent = '';
    AVATARS.forEach((_, i) => { const b = document.createElement('button'); b.className = 'b' + (i === pickAv ? ' on' : ''); b.setAttribute('aria-pressed', i === pickAv); b.setAttribute('aria-label', tx('avatar') + ' ' + (i + 1));
      b.innerHTML = avatarSVG(i, px(84));
      b.onclick = () => { pickAv = i; box.querySelectorAll('button').forEach((x, j) => { x.setAttribute('aria-pressed', j === i); x.classList.toggle('on', j === i); }); }; box.appendChild(b); });
  } else {
    const box = $('#themePick'); box.textContent = '';
    THEME_KEYS.forEach(k => { const t = THEMES[k], b = document.createElement('button'); b.className = 'b tcard'; b.setAttribute('aria-pressed', k === pickTheme); b.setAttribute('aria-label', I18N[LANG].theme + ' ' + t.name);
      b.style.background = t.panel; b.style.borderColor = t.border; b.style.color = t.text; b.style.borderRadius = t.radius + 'px'; b.style.fontFamily = t.font + ', system-ui, sans-serif'; b.style.boxShadow = '0 ' + px(5) + 'px 0 ' + t.accentDark;
      b.innerHTML = themePreview(k) + '<span class="nm"></span>'; b.querySelector('.nm').textContent = t.name;
      b.onclick = () => { pickTheme = k; applyTheme(k); box.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); };
      box.appendChild(b); });
  }
}
$('#btnStep2').onclick = () => { pickName = $('#newName').value.trim(); wizStep(2); };
$('#newName').addEventListener('keydown', e => { if (e.key === 'Enter') $('#btnStep2').click(); });
$('#btnNewOk').onclick = () => {
  const p = { id: 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1e4), name: pickName, avatar: pickAv, theme: pickTheme, lang: LANG, level:0, streak:0, prog: freshProg(), best:{}, hist:{}, top:{}, sel:{ level:0, part:'short' }, opts: Object.assign({}, DEF_OPTS) };
  db.profiles.push(p); db.current = p.id; save(); goHome();
};
$('#btnNewBack').onclick = () => { if (wizAt === 2) wizStep(1); else { if (P()) applyTheme(P().theme); openProfiles(); } };
$('#btnWho').onclick = openProfiles;

/* Child's own page: name, avatar, theme. Saved on every tap. */
export function openMe(){ setState('me'); renderMe(); showOnly('#me'); updateQuick(); }
export function renderMe(){
  const p = P(); if (!p) return;
  $('#meAv').innerHTML = avatarSVG(p.avatar, px(96));
  const nm = $('#meName'); if (document.activeElement !== nm) nm.value = p.name || '';
  nm.oninput = () => { p.name = nm.value.trim(); save(); };
  const av = $('#meAvPick'); av.textContent = '';
  AVATARS.forEach((_, i) => { const b = document.createElement('button'); b.className = 'b' + (i === p.avatar ? ' on' : ''); b.setAttribute('aria-pressed', i === p.avatar); b.setAttribute('aria-label', tx('avatar') + ' ' + (i + 1));
    b.innerHTML = avatarSVG(i, px(72)); b.onclick = () => { p.avatar = i; save(); renderMe(); }; av.appendChild(b); });
  const box = $('#meThemes'); box.textContent = '';
  THEME_KEYS.forEach(k => { const t = THEMES[k], b = document.createElement('button'); b.className = 'b tcard'; b.setAttribute('aria-pressed', k === p.theme); b.setAttribute('aria-label', tx('theme') + ' ' + t.name);
    b.style.background = t.panel; b.style.borderColor = t.border; b.style.color = t.text; b.style.borderRadius = t.radius + 'px'; b.style.fontFamily = t.font + ', system-ui, sans-serif'; b.style.boxShadow = '0 ' + px(5) + 'px 0 ' + t.accentDark;
    b.innerHTML = themePreview(k) + '<span class="nm"></span>'; b.querySelector('.nm').textContent = t.name;
    b.onclick = () => { p.theme = k; save(); applyTheme(k); invalidateBg(); updateQuick(); renderMe(); }; box.appendChild(b); });
}
$('#btnMe').onclick = openMe;
$('#btnMeBack').onclick = goHome;
$('#btnMeOk').onclick = goHome;
$('#meName').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });
