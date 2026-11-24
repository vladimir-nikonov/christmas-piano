// Parent settings, backup export and restore.

import { LETTERS, NOTE_NATIVE } from '../../core/music.js';
import { BACKUP_FORMAT, BACKUP_EVERY, parseBackup } from '../../data/backup.js';
import { db, persisted, normalizeDB, save, askPersist, P, dev, setDB, freshProg } from '../../data/storage.js';
import { $ } from '../../dom.js';
import { state } from '../../game/game.js';
import { LANGS, LANG, tx, fmtDate } from '../../i18n/index.js';
import { resetHeard } from '../../input/mic.js';
import { avatarSVG } from '../art.js';
import { setLang } from '../lang.js';
import { goHome } from './home.js';
import { openMe } from './profiles.js';

/* Parent settings */
export let settingsOpen = false;
const bindRange = (id, out, get, set, fmt) => { const el = $(id); el.value = get(); $(out).textContent = fmt(+el.value); el.oninput = () => { set(+el.value); $(out).textContent = fmt(+el.value); save(); }; };
export function openSettings(){
  const p = P(); settingsOpen = true;
  $('#sWho').innerHTML = avatarSVG(p.avatar, 28) + '<span></span>'; $('#sWho').lastChild.textContent = p.name || tx('noName');
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
  $('#sTouch').checked = dev().touch; $('#sTouch').onchange = e => { dev().touch = e.target.checked; save(); };
  armButton('#btnReset', tx('sReset'), () => { p.level = 0; p.streak = 0; p.prog = freshProg(); p.best = {}; p.hist = {}; p.top = {}; p.sel.level = 0; save(); });
  armButton('#btnDelete', tx('sDelete'), () => { db.profiles = db.profiles.filter(x => x.id !== p.id); db.current = db.profiles[0] ? db.profiles[0].id : null; save(); $('#settings').hidden = true; goHome(); });
  renderBackupInfo(); $('#restoreAsk').hidden = true;
  $('#settings').hidden = false;
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
  $('#settings').hidden = true; goHome();
};
$('#btnBackupNag').onclick = () => { openSettings(); const r = $('#btnBackup'); if (r && r.scrollIntoView) r.scrollIntoView({ block: 'center' }); };
function armButton(sel, label, action){
  const b = $(sel); let armed = false, tm = 0; b.textContent = label;
  b.onclick = () => { if (!armed){ armed = true; b.textContent = tx('sConfirm'); tm = setTimeout(() => { armed = false; b.textContent = label; }, 3000); return; }
    clearTimeout(tm); armed = false; action(); b.textContent = tx('sDoneMsg'); setTimeout(() => b.textContent = label, 1500); };
}
$('#btnKidPage').onclick = () => { settingsOpen = false; $('#settings').hidden = true; openMe(); };
$('#btnSettings').onclick = () => { openSettings(); $('#settings').scrollTop = 0; };
$('#btnSetClose').onclick = () => { settingsOpen = false; $('#settings').hidden = true; if (state === 'home') goHome(); };
