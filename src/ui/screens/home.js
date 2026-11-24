// Home screen: song, level and part pickers, play/listen buttons, in-game controls.

import { audio } from '../../audio/synth.js';
import { LEVELS } from '../../core/levels.js';
import { SONGS, SONG_KEYS, songKey, bestKey, PART_KEYS } from '../../core/songs.js';
import { db, save, P, dev, prog, unlocked } from '../../data/storage.js';
import { $, showOnly } from '../../dom.js';
import { state, G, startGame, setState, setPaused, setGame } from '../../game/game.js';
import { tx, fmtDate } from '../../i18n/index.js';
import { startMic, watchMicPermission } from '../../input/mic.js';
import { avatarSVG, blockSVG } from '../art.js';
import { px } from '../canvas.js';
import { icon } from '../icons.js';
import { syncLang, updateQuick } from '../lang.js';
import { openNewProfile } from './profiles.js';
import { updateBackupNag } from './settings.js';
import { applyTheme } from '../theme.js';

/* ================= Screens ================= */
const starRow = on => [0,1,2].map(i => icon('star', { fill: i < on, cls: i < on ? '' : 'off' })).join('');
export function renderHome(){
  const p = P(); applyTheme(p.theme); updateQuick();
  $('#btnWho').innerHTML = avatarSVG(p.avatar, px(50)) + '<span class="nm"></span>'; $('#btnWho .nm').textContent = p.name || '';
  if (!unlocked(p, p.sel.level)) p.sel.level = prog(p).level;
  const songs = $('#songs'); songs.textContent = '';
  SONG_KEYS.forEach(k => {
    const b = document.createElement('button'); b.className = 'b song'; b.setAttribute('aria-pressed', songKey(p) === k);
    b.textContent = SONGS[k].title(); b.onclick = () => { p.sel.song = k; save(); renderHome(); };
    songs.appendChild(b);
  });
  const box = $('#levels'), pr = prog(p); box.textContent = '';
  LEVELS.forEach((L, i) => {
    const open = unlocked(p, i), b = document.createElement('button');
    b.className = 'b tile' + (open ? '' : ' locked'); b.setAttribute('aria-pressed', i === p.sel.level); b.setAttribute('aria-label', tx('level') + ' ' + (i + 1) + ': ' + tx('levels')[i]);
    const stars = Math.max(0, ...PART_KEYS.map(k => p.best[bestKey(songKey(p), i, k)] || 0));
    b.innerHTML = '<span class="blk">' + blockSVG(i) + '</span>' + (open ? '' : '<span class="lock">' + icon('lock') + '</span>') +
      '<span class="stars">' + (open ? starRow(stars) : '') + '</span>' +
      (i === pr.level && i < LEVELS.length - 1 ? '<span class="pips"><i class="' + (pr.streak > 0 ? 'on' : '') + '"></i><i></i></span>' : '');
    b.onclick = () => { if (!open){ b.animate([{ transform:'translateX(-6px)' }, { transform:'translateX(6px)' }, { transform:'none' }], 200); return; } p.sel.level = i; save(); renderHome(); };
    box.appendChild(b);
  });
  const parts = $('#parts'); parts.textContent = '';
  PART_KEYS.forEach((k, i) => {
    const b = document.createElement('button'); b.className = 'b part'; b.setAttribute('aria-pressed', p.sel.part === k);
    b.setAttribute('aria-label', tx('parts')[i]);
    b.innerHTML = icon('music').repeat(i + 1); b.onclick = () => { p.sel.part = k; save(); renderHome(); };
    parts.appendChild(b);
  });
  $('#homeHist').innerHTML = histHTML(p, bestKey(songKey(p), p.sel.level, p.sel.part), false);
}
// Best % and bars of the last results for one level+part.
export function histHTML(p, key, markLast){
  const h = p.hist[key] || []; if (!h.length) return '';
  const top = p.top[key] || 0;
  return '<span class="hbest" title="' + tx('best') + '" aria-label="' + tx('best') + ': ' + top + '%">' + icon('star', { fill: true }) + '<span>' + top + '%</span></span>' +
    '<span class="hbars" role="img" aria-label="' + tx('history') + ': ' + h.map(e => e.pct + '%').join(', ') + '">' +
    h.map((e, i) => '<i class="' + (e.pct === top ? 'top' : '') + (markLast && i === h.length - 1 ? ' now' : '') + '" style="height:' + Math.max(8, e.pct) + '%" title="' + fmtDate(e.at) + ': ' + e.pct + '%"></i>').join('') + '</span>';
}
export function goHome(){
  setState('home'); setPaused(false); setGame(null);
  if (!db.profiles.length){ syncLang(); openNewProfile(); return; }
  if (!P()) db.current = db.profiles[0].id;
  syncLang();
  renderHome(); showOnly('#home'); updateBackupNag();
}

// Mic state on home: why the microphone did not start, with Try again and a screen-taps fallback.
const MIC_HINT = { denied:'micDenied', missing:'micMissing', busy:'micBusy', other:'micOther' };
function showMicState(kind){
  const h = $('#micHint'); h.dataset.t = MIC_HINT[kind] || MIC_HINT.other; h.textContent = tx(h.dataset.t);
  $('#micErr').dataset.kind = kind; $('#micErr').hidden = false;
}
const hideMicState = () => { $('#micErr').hidden = true; };
// Permission granted in the browser (e.g. from the site settings): clear the error, the next Play starts at once.
watchMicPermission(st => { if (st === 'granted') hideMicState(); });
async function playWithMic(){
  audio(); hideMicState();
  if (!dev().touch){ const r = await startMic(); if (!r.ok){ showMicState(r.kind); return; } } else startMic();
  startGame(false);
}
$('#btnPlay').onclick = playWithMic;
$('#btnMicRetry').onclick = playWithMic;
// Play without the microphone: count screen taps on this device (the parent setting) and start.
$('#btnMicTouch').onclick = () => { audio(); dev().touch = true; save(); hideMicState(); startGame(false); };
$('#btnListen').onclick = () => { audio(); startGame(true); };
const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
const toggleFull = () => {
  const d = document.documentElement;
  try {
    const pr = fsEl()
      ? (document.exitFullscreen ? document.exitFullscreen() : (document.webkitExitFullscreen && document.webkitExitFullscreen()))
      : (d.requestFullscreen ? d.requestFullscreen({ navigationUI:'hide' }) : (d.webkitRequestFullscreen && d.webkitRequestFullscreen()));
    if (pr && pr.catch) pr.catch(() => {});
  } catch(e){}
};
// The full-screen buttons (home and pause menu) double as exit buttons while the app is in full screen
document.querySelectorAll('.qfull').forEach(b => b.onclick = toggleFull);
function syncFull(){
  const on = !!fsEl();
  document.querySelectorAll('.qfull').forEach(b => {
    b.dataset.ta = on ? 'fullExit' : 'full';
    b.setAttribute('aria-label', tx(b.dataset.ta));
    b.innerHTML = icon(on ? 'fullscreen-exit' : 'fullscreen');
  });
}
document.addEventListener('fullscreenchange', syncFull);
document.addEventListener('webkitfullscreenchange', syncFull);
$('#btnPause').onclick = () => { if (state === 'demo'){ G.finished = true; goHome(); return; } setPaused(true); $('#pause').hidden = false; };
$('#btnResume').onclick = () => { setPaused(false); $('#pause').hidden = true; };
$('#btnRestart').onclick = () => startGame(false);
$('#btnQuit').onclick = goHome;
$('#btnHome').onclick = goHome;
$('#btnAgain').onclick = () => { const p = P(); if (G){ p.sel.song = G.song; p.sel.level = G.level; p.sel.part = G.part; } startGame(false); };
$('#btnNext').onclick = () => { const p = P(); if (G){ p.sel.song = G.song; p.sel.level = Math.min(LEVELS.length - 1, G.level + 1); } startGame(false); };
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'playing'){ setPaused(true); $('#pause').hidden = false; } });
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && state === 'home' && document.activeElement === document.body){ e.preventDefault(); $('#btnPlay').click(); } });
