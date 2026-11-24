// Persistence: per-child profiles and device settings in IndexedDB, localStorage as fallback.
// Keep compatibility with old records: normalizeDB() upgrades anything older on load.

import { LEVELS } from '../core/levels.js';
import { SONG_KEYS, songKey } from '../core/songs.js';
import { THEMES } from '../ui/theme-data.js';

/* ================= Storage: per-child profiles + device settings ================= */
const DB_KEY = 'snezhnye-noty-v2';
export const DEF_OPTS = { tempo:100, tolMs:0, labels:'native', anyOct:true, hint:true, lockLevels:false };
export const DEF_DEV = { latency:80, sens:5, touch:false };
// Primary store: IndexedDB (db 'snezhnye-noty', store 'kv', key 'db'). localStorage[DB_KEY] is the legacy
// store, migrated once on first run and used as a fallback when IndexedDB is unavailable or a write fails.
// Every saved copy carries savedAt; on load the newer of the two copies wins.
const IDB_NAME = 'snezhnye-noty', IDB_STORE = 'kv', IDB_KEY = 'db';
export const freshDB = () => ({ profiles:[], current:null, device:Object.assign({}, DEF_DEV), savedAt:0, backupAt:0, remindFrom:0 });
export let db = freshDB(), storeKind = 'localStorage', persisted = false;
export function normalizeDB(d){
  const r = freshDB();
  if (d && typeof d === 'object'){ Object.assign(r, d); r.device = Object.assign({}, DEF_DEV, d.device); }
  r.profiles = Array.isArray(r.profiles) ? r.profiles.filter(p => p && typeof p === 'object' && typeof p.id === 'string' && p.id) : [];
  r.profiles.forEach(p => { p.theme = THEMES[p.theme] ? p.theme : 'pixel'; p.opts = Object.assign({}, DEF_OPTS, p.opts); if (p.opts.labels === 'ru') p.opts.labels = 'native'; if (p.opts.labels === 'en') p.opts.labels = 'letters'; delete p.opts.unlockAll; p.sel = p.sel || { level:0, part:'short' }; p.best = p.best || {};
    p.hist = normHist(p.hist); p.top = (p.top && typeof p.top === 'object' && !Array.isArray(p.top)) ? p.top : {};
    Object.keys(p.hist).forEach(k => { p.top[k] = Math.max(+p.top[k] || 0, ...p.hist[k].map(e => e.pct)); });
    p.name = typeof p.name === 'string' ? p.name : ''; p.level = Math.max(0, Math.floor(+p.level) || 0); p.streak = +p.streak || 0; p.avatar = Math.max(0, Math.floor(+p.avatar) || 0); normProg(p); });
  if (!r.profiles.some(p => p.id === r.current)) r.current = r.profiles[0] ? r.profiles[0].id : null;
  return r;
}
// Per level+part history of results ("level:part" -> last HIST_MAX games, oldest first).
export const HIST_MAX = 10;
export function normHist(h){
  const out = {};
  if (h && typeof h === 'object' && !Array.isArray(h)) Object.keys(h).forEach(k => {
    if (!/^([a-z0-9_-]{1,32}:)?\d+:(short|half|full)$/.test(k) || !Array.isArray(h[k])) return;
    const a = h[k].filter(e => e && typeof e === 'object' && Number.isFinite(+e.pct))
      .map(e => ({ at: +e.at || 0, pct: Math.max(0, Math.min(100, Math.round(+e.pct))), stars: Math.max(0, Math.min(3, Math.floor(+e.stars) || 0)), score: Math.max(0, Math.floor(+e.score) || 0) }))
      .slice(-HIST_MAX);
    if (a.length) out[k] = a;
  });
  return out;
}
// Progress to the next level is kept per song: p.prog[song] = { level, streak }. Records made before
// that have only p.level / p.streak, which every song inherits so nobody loses a level.
// p.level stays as the highest level across songs (profile badge, older app versions).
export function normProg(p){
  const old = p.prog && typeof p.prog === 'object' && !Array.isArray(p.prog) ? p.prog : {}, top = LEVELS.length - 1;
  p.prog = {};
  SONG_KEYS.forEach(k => { const o = old[k] && typeof old[k] === 'object' ? old[k] : { level: p.level, streak: p.streak };
    p.prog[k] = { level: Math.max(0, Math.min(top, Math.floor(+o.level) || 0)), streak: Math.max(0, Math.floor(+o.streak) || 0) }; });
  p.level = Math.max(0, ...SONG_KEYS.map(k => p.prog[k].level));
}
export const freshProg = () => Object.fromEntries(SONG_KEYS.map(k => [k, { level:0, streak:0 }]));
function lsRead(){ try { const raw = localStorage.getItem(DB_KEY); return raw ? JSON.parse(raw) : null; } catch(e){ return null; } }
function lsWrite(d){ try { localStorage.setItem(DB_KEY, JSON.stringify(d)); return true; } catch(e){ return false; } }
let idbP = null;
function idbOpen(){
  if (idbP) return idbP;
  idbP = new Promise(res => {
    const t = setTimeout(() => res(null), 4000);
    const done = v => { clearTimeout(t); res(v); };
    try {
      if (!window.indexedDB) return done(null);
      const rq = indexedDB.open(IDB_NAME, 1);
      rq.onupgradeneeded = () => { try { if (!rq.result.objectStoreNames.contains(IDB_STORE)) rq.result.createObjectStore(IDB_STORE); } catch(e){} };
      rq.onsuccess = () => { const d = rq.result; d.onversionchange = () => { try { d.close(); } catch(e){} idbP = null; }; done(d); };
      rq.onerror = () => done(null);
    } catch(e){ done(null); }
  });
  return idbP;
}
// Resolves to { v } on success, null on any failure. Never rejects.
function idbDo(mode, fn){
  return idbOpen().then(d => d && new Promise(res => {
    try {
      const tx = d.transaction(IDB_STORE, mode), rq = fn(tx.objectStore(IDB_STORE)); let v;
      rq.onsuccess = () => { v = rq.result; };
      tx.oncomplete = () => res({ v }); tx.onerror = tx.onabort = () => res(null);
    } catch(e){ res(null); }
  })).catch(() => null);
}
let saveChain = Promise.resolve();
export function save(){
  db.savedAt = Date.now();
  let snap; try { snap = JSON.parse(JSON.stringify(db)); } catch(e){ return saveChain; }
  saveChain = saveChain.then(() => idbDo('readwrite', st => st.put(snap, IDB_KEY)))
    .then(r => { if (r){ storeKind = 'IndexedDB'; } else { storeKind = 'localStorage'; lsWrite(snap); } })
    .catch(() => { lsWrite(snap); });
  return saveChain;
}
export async function loadDB(){
  const ls = lsRead();
  let r = null; try { r = await idbDo('readonly', st => st.get(IDB_KEY)); } catch(e){}
  const fromIdb = r && r.v && typeof r.v === 'object' ? r.v : null;
  if (r) storeKind = 'IndexedDB';
  let src = fromIdb;
  if (ls && (!fromIdb || (+ls.savedAt || 0) > (+fromIdb.savedAt || 0))) src = ls;   // first run migration, or a newer fallback copy
  try { db = normalizeDB(src); } catch(e){ db = freshDB(); }
  let dirty = src !== fromIdb;
  if (!db.remindFrom){ db.remindFrom = Date.now(); dirty = true; }
  if (dirty) await save();
}
export function askPersist(){
  try {
    const s = navigator.storage;
    if (!s || !s.persist) return Promise.resolve(false);
    return (s.persisted ? s.persisted() : Promise.resolve(false)).then(p => p || s.persist()).then(p => (persisted = !!p)).catch(() => false);
  } catch(e){ return Promise.resolve(false); }
}
export const P = () => db.profiles.find(p => p.id === db.current) || null;
export const opts = () => (P() || { opts: DEF_OPTS }).opts;
export const dev = () => db.device;
export const prog = (p, song) => p.prog[song || songKey(p)];
export const unlocked = (p, i, song) => !p.opts.lockLevels || i <= prog(p, song).level;
// Replaces the whole in-memory database (restore from a backup).
export function setDB(d){ db = d; }
