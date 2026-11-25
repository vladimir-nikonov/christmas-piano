// Parent settings, backup export and restore.

import { LETTERS, NOTE_NATIVE } from '../../core/music.js';
import { BACKUP_FORMAT, BACKUP_EVERY, parseBackup } from '../../data/backup.js';
import { db, persisted, normalizeDB, save, askPersist, P, dev, setDB, freshProg, wipeDB, prog, unlocked, partFor, setPartFor } from '../../data/storage.js';
import { LEVELS } from '../../core/levels.js';
import { SONGS, SONG_KEYS, PART_KEYS, bestKey } from '../../core/songs.js';
import { $ } from '../../dom.js';
import { E, dispatch } from '../../core/flow.js';
import { LANGS, LANG, tx, fmtDate } from '../../i18n/index.js';
import { resetHeard } from '../../input/mic.js';
import { avatarSVG, blockSVG, sheetSVG } from '../art.js';
import { icon } from '../icons.js';
import { setScreenInput } from '../inputmode.js';
import { setLang } from '../lang.js';
import { goHome } from './home.js';
import { openMe, openIntro } from './profiles.js';

/* Parent settings: a panel over home (the navigation state Settings) */
const bindRange = (id, out, get, set, fmt) => { const el = $(id); el.value = get(); $(out).textContent = fmt(+el.value); el.oninput = () => { set(+el.value); $(out).textContent = fmt(+el.value); save(); }; };
// The player the panel is set up for. Any player can be chosen here; who plays on home does not change.
let target = null;
const sp = () => db.profiles.find(x => x === target) || P();
export function openSettings(){ if (!dispatch(E.SETTINGS)) return false; target = P(); renderSettings(); return true; }
export function renderSettings(){
  const p = sp();
  renderPlayerPick(p); renderLenTable(p);
  bindRange('#sTempo', '#oTempo', () => p.opts.tempo, v => p.opts.tempo = v, v => v + '%');
  bindRange('#sTol', '#oTol', () => p.opts.tolMs, v => p.opts.tolMs = v, v => v ? '±' + v + ' ' + tx('ms') : tx('sTolLevel'));
  bindRange('#sLat', '#oLat', () => dev().latency, v => dev().latency = v, v => v + ' ' + tx('ms'));
  bindRange('#sSens', '#oSens', () => dev().sens, v => dev().sens = v, v => tx('sSensFmt').replace('{n}', v));
  const sl = $('#sLabels'); sl.textContent = '';
  [['native', (NOTE_NATIVE[LANG] || LETTERS).filter((_, i) => [0,2,4].includes(i)).join(' ')], ['letters', tx('lLetters') + ' · C D E'], ['none', tx('lNone')]].forEach(([v, txt]) => { const o = document.createElement('option'); o.value = v; o.textContent = txt; sl.appendChild(o); });
  const lg = $('#sLang'); lg.textContent = '';
  LANGS.forEach(L => { const o = document.createElement('option'); o.value = L.id; o.textContent = L.name; lg.appendChild(o); });
  lg.value = LANG; lg.onchange = e => setLang(e.target.value);
  $('#sLabels').value = p.opts.labels; $('#sLabels').onchange = e => { p.opts.labels = e.target.value; resetHeard(); save(); };
  [['#sHint','hint'],['#sOct','anyOct'],['#sLock','lockLevels']].forEach(([id, k]) => { $(id).checked = !!p.opts[k]; $(id).onchange = e => { p.opts[k] = e.target.checked; save(); }; });
  $('#sTouch').checked = dev().touch; $('#sTouch').onchange = e => setScreenInput(e.target.checked);
  armButton('#btnReset', tx('sReset'), () => { p.level = 0; p.streak = 0; p.prog = freshProg(); p.best = {}; p.hist = {}; p.top = {}; p.sel.level = 0; save(); });
  armButton('#btnDelete', tx('sDelete'), () => { db.profiles = db.profiles.filter(x => x.id !== p.id); if (!db.profiles.some(x => x.id === db.current)) db.current = db.profiles[0] ? db.profiles[0].id : null; save(); goHome(); });
  renderBackupInfo(); $('#restoreAsk').hidden = true; $('#wipeAsk').hidden = true;
}
function renderPlayerPick(p){
  const box = $('#sPick'); box.textContent = '';
  db.profiles.forEach(x => {
    const b = document.createElement('button'); b.className = 'b txtbtn who'; b.setAttribute('aria-pressed', x === p);
    b.innerHTML = avatarSVG(x.avatar, 28, x.theme) + '<span></span>'; b.lastChild.textContent = x.name || tx('noName');
    b.onclick = () => { target = x; renderSettings(); };
    box.appendChild(b);
  });
}
// Songs as rows, levels as cells. A cell shows the length that level plays (sheet icon), the best stars and
// best % for that length; the current level is outlined, locked levels are dimmed. Tapping a cell cycles the length.
const starRow = on => [0,1,2].map(i => icon('star', { fill: i < on, cls: i < on ? '' : 'off' })).join('');
function renderLenTable(p){
  const t = $('#sLen');
  let h = '<thead><tr><th></th>' + LEVELS.map((L, i) => '<th scope="col"><span class="blk" role="img" aria-label="' + tx('levels')[i] + '">' + blockSVG(i, p.theme) + '</span></th>').join('') + '</tr></thead><tbody>';
  SONG_KEYS.forEach(song => {
    const pr = prog(p, song);
    h += '<tr><th scope="row"></th>' + LEVELS.map((L, i) => {
      const part = partFor(p, song, i), key = bestKey(song, i, part), stars = p.best[key] || 0, top = p.top[key];
      const cls = 'b lencell' + (i === pr.level ? ' cur' : '') + (unlocked(p, i, song) ? '' : ' locked') + (part !== L.part ? ' changed' : '');
      return '<td><button class="' + cls + '" data-song="' + song + '" data-level="' + i + '" data-part="' + part + '">' +
        '<span class="len">' + sheetSVG(part) + '</span><span class="cstars">' + starRow(stars) + '</span><span class="cpct">' + (top ? top + '%' : '—') + '</span></button></td>';
    }).join('') + '</tr>';
  });
  t.innerHTML = h + '</tbody>';
  t.querySelectorAll('tbody tr').forEach((tr, r) => { tr.firstChild.textContent = SONGS[SONG_KEYS[r]].title(); });
  t.querySelectorAll('.lencell').forEach(b => {
    const song = b.dataset.song, i = +b.dataset.level, pr = prog(p, song), part = b.dataset.part, top = p.top[bestKey(song, i, part)];
    b.setAttribute('aria-label', SONGS[song].title() + ', ' + tx('levels')[i] + ': ' + tx('parts')[PART_KEYS.indexOf(part)] +
      (i === pr.level ? ', ' + tx('sLenCur') : '') + (top ? ', ' + tx('best') + ' ' + top + '%' : ''));
    b.onclick = () => { setPartFor(p, song, i, PART_KEYS[(PART_KEYS.indexOf(part) + 1) % PART_KEYS.length]); save(); renderLenTable(p); t.querySelector('[data-song="' + song + '"][data-level="' + i + '"]').focus(); };
  });
  $('#btnLenReset').hidden = !Object.keys(p.len || {}).length;
  $('#btnLenReset').onclick = () => { p.len = {}; save(); renderLenTable(p); };
}
/* Backup: export / import JSON, weekly reminder */
function renderBackupInfo(){
  const el = $('#backupInfo'); if (!el) return;
  el.textContent = (db.backupAt ? tx('bLast').replace('{d}', fmtDate(db.backupAt)) : tx('bNever')) + (persisted ? tx('bKept') : tx('bMayClear'));
}
const backupDue = () => db.profiles.length > 0 && Date.now() - Math.max(+db.backupAt || 0, +db.remindFrom || 0) > BACKUP_EVERY;
export function updateBackupNag(){ const b = $('#btnBackupNag'); if (b) b.hidden = !backupDue(); }
function exportBackup(){
  const data = { format: BACKUP_FORMAT, version: 1, exportedAt: new Date().toISOString(), profiles: db.profiles, current: db.current, device: db.device };
  try {
    const d = new Date(), pad = n => String(n).padStart(2, '0');
    const name = 'snezhnye-noty-' + d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + '.json';
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = name; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => { try { URL.revokeObjectURL(url); } catch(e){} }, 30000);
    db.backupAt = Date.now(); save(); askPersist().then(renderBackupInfo); renderBackupInfo(); updateBackupNag();
    return true;
  } catch(e){ $('#backupInfo').textContent = tx('bSaveFail') + (e && e.message || e); return false; }
}
let pendingRestore = null;
$('#btnBackup').onclick = exportBackup;
$('#btnRestore').onclick = () => { $('#restoreFile').value = ''; $('#restoreFile').click(); };
$('#restoreFile').onchange = e => {
  const f = e.target.files && e.target.files[0]; if (!f) return;
  const ask = $('#restoreAsk'), txt = $('#restoreText');
  const fail = m => { pendingRestore = null; txt.textContent = m; $('#btnRestoreYes').hidden = true; ask.hidden = false; };
  if (f.size > 2e6) return fail(tx('eBig'));
  const rd = new FileReader();
  rd.onerror = () => fail(tx('eRead'));
  rd.onload = () => {
    const r = parseBackup(String(rd.result || ''));
    if (r.error) return fail(r.error);
    pendingRestore = r.db;
    const names = r.db.profiles.map(p => p.name || tx('noName')).join(', ');
    txt.textContent = tx('restoreQ').replace('{n}', r.db.profiles.length).replace('{names}', names).replace('{date}', r.db.exportedAt ? tx('restoreDate').replace('{d}', fmtDate(r.db.exportedAt)) : '');
    $('#btnRestoreYes').hidden = false; ask.hidden = false;
  };
  try { rd.readAsText(f); } catch(err){ fail(tx('eRead')); }
};
$('#btnRestoreNo').onclick = () => { pendingRestore = null; $('#restoreAsk').hidden = true; };
$('#btnRestoreYes').onclick = async () => {
  if (!pendingRestore) return;
  const keepDevice = db.device, keepRemind = db.remindFrom;
  setDB(normalizeDB({ profiles: pendingRestore.profiles, current: pendingRestore.current, device: keepDevice, backupAt: Date.now(), remindFrom: keepRemind || Date.now() }));
  pendingRestore = null; $('#restoreAsk').hidden = true;
  await save();
  goHome();
};
$('#btnBackupNag').onclick = () => { if (!openSettings()) return; const r = $('#btnBackup'); if (r && r.scrollIntoView) r.scrollIntoView({ block: 'center' }); };
function armButton(sel, label, action){
  const b = $(sel); let armed = false, tm = 0; b.textContent = label;
  b.onclick = () => { if (!armed){ armed = true; b.textContent = tx('sConfirm'); tm = setTimeout(() => { armed = false; b.textContent = label; }, 3000); return; }
    clearTimeout(tm); armed = false; action(); b.textContent = tx('sDoneMsg'); setTimeout(() => b.textContent = label, 1500); };
}
/* Danger zone: erase all players and achievements. Asks with the player count and names first;
   the page reloads afterwards so language, input mode and screens start from scratch. */
$('#btnWipe').onclick = () => {
  const names = db.profiles.map(p => p.name || tx('noName')).join(', ');
  $('#wipeText').textContent = tx('sWipeQ').replace('{n}', db.profiles.length).replace('{names}', names || '—');
  $('#wipeAsk').hidden = false;
};
$('#btnWipeNo').onclick = () => { $('#wipeAsk').hidden = true; };
$('#btnWipeYes').onclick = async () => {
  $('#btnWipeYes').disabled = true;
  await wipeDB();
  location.reload();
};
// The child's page belongs to the player chosen in the panel, who then also becomes the one playing.
$('#btnKidPage').onclick = () => { const p = sp(); if (p && db.current !== p.id){ db.current = p.id; save(); } openMe(); };
$('#btnIntro').onclick = () => { const p = sp(); if (p && db.current !== p.id){ db.current = p.id; save(); } openIntro(); };
$('#btnSettings').onclick = () => { if (openSettings()) $('#settings').scrollTop = 0; };
$('#btnSetClose').onclick = goHome;
