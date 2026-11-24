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
import { setScreenInput } from '../inputmode.js';
import { applyTheme } from '../theme.js';

/* ================= Screens ================= */
// Level the child picked by hand during this home visit; while it is set, coming back to home keeps it.
// Otherwise home selects the current level of the song (the one the child is working on).
let homePick = null;
const starRow = on => [0,1,2].map(i => icon('star', { fill: i < on, cls: i < on ? '' : 'off' })).join('');
export function renderHome(){
  const p = P(); applyTheme(p.theme); updateQuick();
  $('#btnWho').innerHTML = avatarSVG(p.avatar, px(50)) + '<span class="nm"></span>'; $('#btnWho .nm').textContent = p.name || '';
  if (!unlocked(p, p.sel.level)) p.sel.level = prog(p).level;
  const songs = $('#songs'); songs.textContent = '';
  SONG_KEYS.forEach(k => {
    const b = document.createElement('button'); b.className = 'b song'; b.setAttribute('aria-pressed', songKey(p) === k);
    b.textContent = SONGS[k].title(); b.onclick = () => { p.sel.song = k; p.sel.level = prog(p, k).level; homePick = null; save(); renderHome(); };
    songs.appendChild(b);
  });
  const box = $('#levels'), pr = prog(p); box.textContent = '';
  LEVELS.forEach((L, i) => {
    const open = unlocked(p, i), b = document.createElement('button');
    const cur = i === pr.level;
    b.className = 'b tile' + (open ? '' : ' locked') + (cur ? ' cur' : ''); if (cur) b.dataset.current = '1'; b.setAttribute('aria-pressed', i === p.sel.level); b.setAttribute('aria-label', tx('level') + ' ' + (i + 1) + ': ' + tx('levels')[i]);
    const stars = Math.max(0, ...PART_KEYS.map(k => p.best[bestKey(songKey(p), i, k)] || 0));
    b.innerHTML = (cur ? '<span class="curmark">' + icon('play', { fill: true }) + '</span>' : '') + '<span class="blk">' + blockSVG(i) + '</span>' + (open ? '' : '<span class="lock">' + icon('lock') + '</span>') +
      '<span class="stars">' + (open ? starRow(stars) : '') + '</span>' +
      (i === pr.level && i < LEVELS.length - 1 ? '<span class="pips"><i class="' + (pr.streak > 0 ? 'on' : '') + '"></i><i></i></span>' : '');
    b.onclick = () => { if (!open){ b.animate([{ transform:'translateX(-6px)' }, { transform:'translateX(6px)' }, { transform:'none' }], 200); return; } p.sel.level = i; homePick = { id: p.id, song: songKey(p) }; save(); renderHome(); };
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
  const p = P();
  if (!(homePick && homePick.id === p.id && homePick.song === songKey(p))) p.sel.level = prog(p).level;
  syncLang();
  const home = $('#home'), wasHidden = home.hidden;
  renderHome(); showOnly('#home'); updateBackupNag();
  if (wasHidden) zoomOutHome(home);
}

/* ---- Entry / return transitions (Web Animations, so they run alongside the CSS reduced-motion rule) ---- */
const reduceMotion = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const anim = (el, frames, opts) => (el && el.animate ? el.animate(frames, opts) : null);
function zoomOutHome(home){
  const r = reduceMotion();
  anim(home, r ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'scale(1.06)' }, { opacity: 1, transform: 'none' }],
    { duration: r ? 150 : 280, easing: 'ease-out' });
}
// Play / Listen: the selected level tile grows towards the centre while the rest of home fades out,
// then the game starts (count-in included) and the HUD fades in. Reduced motion: a quick fade only.
// Home ignores taps during the transition; the game clock starts only after it.
let entering = false;
export function enterGame(demo){
  const home = $('#home');
  if (entering) return;
  if (home.hidden || !home.animate){ startGame(demo); return; }
  entering = true; homePick = null;
  const r = reduceMotion(), dur = r ? 160 : 340, opts = { duration: dur, easing: 'ease-in', fill: 'forwards' }, list = [];
  const fade = el => list.push(anim(el, [{ opacity: 1 }, { opacity: 0 }], opts));
  home.style.pointerEvents = 'none';
  const tile = !r && $('#levels .tile[aria-pressed="true"]');
  if (tile){
    const b = tile.getBoundingClientRect(), dx = innerWidth / 2 - (b.left + b.width / 2), dy = innerHeight / 2 - (b.top + b.height / 2);
    tile.style.zIndex = '2';
    list.push(anim(tile, [{ transform: 'none', opacity: 1 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(2.4)', opacity: 1, offset: 0.7 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(2.8)', opacity: 0 }], { ...opts, easing: 'ease-in-out' }));
    [...home.children].forEach(el => { if (el.id !== 'levels') fade(el); });
    [...$('#levels').children].forEach(el => { if (el !== tile) fade(el); });
    list.push(anim(home, [{}, { backgroundColor: 'transparent' }], opts));
  } else fade(home);
  setTimeout(() => {
    entering = false;
    startGame(demo);
    list.forEach(a => a && a.cancel()); home.style.pointerEvents = ''; if (tile) tile.style.zIndex = '';
    anim($('#hud'), [{ opacity: 0 }, { opacity: 1 }], { duration: r ? 120 : 220, easing: 'ease-out' });
  }, dur);
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
  // Screen and keyboard mode never asks for the microphone: a tablet without a piano needs no permission.
  if (!dev().touch){ const r = await startMic(); if (!r.ok){ showMicState(r.kind); return; } }
  enterGame(false);
}
$('#btnPlay').onclick = playWithMic;
$('#btnMicRetry').onclick = playWithMic;
// Play without the microphone: count screen taps on this device (the parent setting) and start.
$('#btnMicTouch').onclick = () => { audio(); setScreenInput(true); hideMicState(); enterGame(false); };
$('#btnListen').onclick = () => { audio(); enterGame(true); };
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
