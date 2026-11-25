// Home screen: song and level pickers (each level shows how much of the song it plays), play/listen buttons, in-game controls.

import { audio } from '../../audio/synth.js';
import { LEVELS } from '../../core/levels.js';
import { SONGS, SONG_KEYS, songKey, bestKey, PART_KEYS } from '../../core/songs.js';
import { db, save, P, dev, prog, unlocked, partFor } from '../../data/storage.js';
import { E, S, dispatch, can, is, flow } from '../../core/flow.js';
import { homeHint } from '../../core/hint.js';
import { $ } from '../../dom.js';
import { G, startGame, setGame, resumeGame } from '../../game/game.js';
import { tx, fmtDate } from '../../i18n/index.js';
import { startMic, watchMicPermission, onMicLost } from '../../input/mic.js';
import { avatarSVG, blockSVG, sheetSVG } from '../art.js';
import { px } from '../canvas.js';
import { icon } from '../icons.js';
import { syncLang, updateQuick } from '../lang.js';
import { openNewProfile } from './profiles.js';
import { updateBackupNag } from './settings.js';
import { setScreenInput } from '../inputmode.js';
import { applyTheme } from '../theme.js';
import { entryTiming, entryFrames, entryFx, dropLayer, zoomOutFrames, fxLayer, unlockFx, calm } from '../themefx.js';

/* ================= Screens ================= */
// Level the child picked by hand during this home visit; while it is set, coming back to home keeps it.
// Otherwise home selects the current level of the song (the one the child is working on).
let homePick = null;
const starRow = on => [0,1,2].map(i => icon('star', { fill: i < on, cls: i < on ? '' : 'off' })).join('');
export function renderHome(){
  const p = P(); applyTheme(p.theme); updateQuick();
  $('#btnWho').innerHTML = avatarSVG(p.avatar, px(50), p.theme) + '<span class="nm"></span>'; $('#btnWho .nm').textContent = p.name || '';
  if (!unlocked(p, p.sel.level)) p.sel.level = prog(p).level;
  const songs = $('#songs'); songs.textContent = '';
  SONG_KEYS.forEach(k => {
    const b = document.createElement('button'); b.className = 'b song'; b.setAttribute('aria-pressed', songKey(p) === k);
    b.textContent = SONGS[k].title(); b.onclick = () => { const changed = songKey(p) !== k; p.sel.song = k; p.sel.level = prog(p, k).level; homePick = null; save(); renderHome(); if (changed) showHint('song'); };
    songs.appendChild(b);
  });
  const box = $('#levels'), pr = prog(p); box.textContent = '';
  LEVELS.forEach((L, i) => {
    const open = unlocked(p, i), b = document.createElement('button');
    const cur = i === pr.level, part = partFor(p, songKey(p), i);
    b.className = 'b tile' + (open ? '' : ' locked') + (cur ? ' cur' : ''); if (cur) b.dataset.current = '1'; b.setAttribute('aria-pressed', i === p.sel.level); b.setAttribute('aria-label', tx('level') + ' ' + (i + 1) + ': ' + tx('levels')[i] + ', ' + tx('parts')[PART_KEYS.indexOf(part)]); b.dataset.part = part;
    const stars = Math.max(0, ...PART_KEYS.map(k => p.best[bestKey(songKey(p), i, k)] || 0));
    b.innerHTML = (cur ? '<span class="curmark">' + icon('play', { fill: true }) + '</span>' : '') + '<span class="blk">' + blockSVG(i) + '</span>' + (open ? '' : '<span class="lock">' + icon('lock') + '</span>') +
      '<span class="meta"><span class="len">' + sheetSVG(part) + '</span><span class="stars">' + (open ? starRow(stars) : '') + '</span></span>' +
      (i === pr.level && i < LEVELS.length - 1 ? '<span class="pips"><i class="' + (pr.streak > 0 ? 'on' : '') + '"></i><i></i></span>' : '');
    b.onclick = () => { if (!open){ b.animate([{ transform:'translateX(-6px)' }, { transform:'translateX(6px)' }, { transform:'none' }], 200); return; } const changed = p.sel.level !== i; p.sel.level = i; homePick = { id: p.id, song: songKey(p) }; save(); renderHome(); if (changed) showHint('pick'); };
    box.appendChild(b);
  });
  $('#homeHist').innerHTML = histHTML(p, bestKey(songKey(p), p.sel.level, partFor(p, songKey(p), p.sel.level)), false);
}
// Best % and bars of the last results for one level+part.
export function histHTML(p, key, markLast){
  const h = p.hist[key] || []; if (!h.length) return '';
  const top = p.top[key] || 0;
  return '<span class="hbest" title="' + tx('best') + '" aria-label="' + tx('best') + ': ' + top + '%">' + icon('star', { fill: true }) + '<span>' + top + '%</span></span>' +
    '<span class="hbars" role="img" aria-label="' + tx('history') + ': ' + h.map(e => e.pct + '%').join(', ') + '">' +
    h.map((e, i) => '<i class="' + (e.pct === top ? 'top' : '') + (markLast && i === h.length - 1 ? ' now' : '') + '" style="height:' + Math.max(8, e.pct) + '%" title="' + fmtDate(e.at) + ': ' + e.pct + '%"></i>').join('') + '</span>';
}
// Home from anywhere that has a way home (player chosen, close, exit, end of the demo, results); otherwise ignored.
// Without any player it opens the new player wizard instead.
export function goHome(){
  if (!db.profiles.length){ if (!can(E.NEW_PLAYER)) return false; setGame(null); syncLang(); openNewProfile(); return true; }
  if (!can(E.HOME)) return false;
  const from = HOME_FROM[flow.state.name], g = G;
  setGame(null);
  if (!P()) db.current = db.profiles[0].id;
  const p = P();
  if (!(homePick && homePick.id === p.id && homePick.song === songKey(p))) p.sel.level = prog(p).level;
  syncLang();
  const home = $('#home'), wasHidden = home.hidden;
  renderHome(); dispatch(E.HOME); updateBackupNag();
  if (wasHidden) zoomOutHome(home);
  idleDone = false; showHint(from, g);
  return true;
}

/* ---- Hint: what to do next and why home looks like this. The gesture carries the meaning, the line of text
   is a caption that fades after a few seconds (src/core/hint.js picks which one). ---- */
const HOME_FROM = { [S.RESULTS]: 'results', [S.LEVEL_UP]: 'results', [S.PREVIEW]: 'demo', [S.NEW_PLAYER]: 'newPlayer', [S.PROFILES]: 'player' };
const HINT_MS = 6000, IDLE_MS = 8000;
let hintSeq = 0, hintT = 0, idleT = 0, idleDone = false, hintLayer = null;
const onHome = () => is(S.HOME) && !$('#home').hidden;
export function showHint(from, g){
  const p = P(); if (!p) return;
  clearHint();
  const pr = prog(p), h = homeHint({ from, sel: p.sel.level, cur: pr.level, last: LEVELS.length - 1,
    played: g ? g.level : null, levelUp: !!(g && g.levelUp), streak: pr.streak, name: p.name });
  if (from === 'idle') idleDone = true;
  armIdle();
  if (!h) return;
  const el = $('#homeHint'), seq = hintSeq;
  el.dataset.key = h.key; el.textContent = '';
  // ▶ in the text is drawn as the Play icon; the name is the player's own text, so it goes in as text
  tx(h.key).replace('{level}', h.level != null ? tx('levels')[h.level] : '').replace('{name}', h.name || '').split('▶').forEach((part, i) => {
    if (i) el.insertAdjacentHTML('beforeend', '<span class="hp">' + icon('play', { fill: true }) + '</span>');
    el.appendChild(document.createTextNode(part));
  });
  el.classList.add('on');
  hintT = setTimeout(() => { el.classList.remove('on'); $('#btnPlay').classList.remove('nudge'); }, HINT_MS);
  // The gesture starts once home has zoomed back in
  setTimeout(() => { if (seq === hintSeq && onHome()) hintGesture(h); }, calm() ? 0 : 320);
}
function hintGesture(h){
  if (h.play){ const b = $('#btnPlay'); b.classList.remove('nudge'); void b.offsetWidth; b.classList.add('nudge'); }
  const tile = $('#levels .tile.cur'); if (!tile || calm()) return;
  if (h.tile === 'unlock'){
    // The new level's lock leaves the theme's way, as on the results screen
    const blk = tile.querySelector('.blk'), lk = document.createElement('span'); lk.className = 'lk'; lk.innerHTML = icon('lock'); blk.appendChild(lk);
    hintLayer = fxLayer($('#home')); unlockFx(blk, hintLayer);
    tile.animate([{ transform: 'scale(.85)' }, { transform: 'scale(1.12)', offset: 0.55 }, { transform: 'none' }], { duration: 700, easing: 'cubic-bezier(.3,1.6,.5,1)' });
    const l = hintLayer; setTimeout(() => { lk.remove(); if (hintLayer === l){ dropLayer(l); hintLayer = null; } }, 1400);
  } else if (h.tile === 'pip'){
    const pip = tile.querySelector('.pips i:not(.on)');
    if (pip) pip.animate([{ transform: 'none' }, { transform: 'scale(1.5)', background: 'var(--reward)' }, { transform: 'none' }], { duration: 600, iterations: 3, easing: 'ease-in-out' });
  } else if (h.tile === 'cur'){
    tile.animate([{ transform: 'none' }, { transform: 'translateY(calc(-14 * var(--u)))' }, { transform: 'none' }], { duration: 420, iterations: 2, easing: 'ease-out' });
  }
}
function clearHint(){
  hintSeq++; clearTimeout(hintT);
  const el = $('#homeHint'); el.classList.remove('on');
  $('#btnPlay').classList.remove('nudge');
  if (hintLayer){ dropLayer(hintLayer); hintLayer = null; }
}
// Nothing happened on home for a while (once per visit): Play pulses. Waits while the splash or the mic state is up.
function armIdle(){
  clearTimeout(idleT); if (idleDone) return;
  idleT = setTimeout(() => {
    if (!onHome()) return;
    if (!$('#splash').hidden || !$('#micErr').hidden || $('#homeHint').classList.contains('on')){ armIdle(); return; }
    showHint('idle');
  }, IDLE_MS);
}
$('#home').addEventListener('pointerdown', () => armIdle());
$('#btnPlay').addEventListener('animationend', e => { if (e.animationName === 'nudge') $('#btnPlay').classList.remove('nudge'); });

/* ---- Entry / return transitions (Web Animations, so they run alongside the CSS reduced-motion rule) ---- */
const reduceMotion = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const anim = (el, frames, opts) => (el && el.animate ? el.animate(frames, opts) : null);
function zoomOutHome(home){
  const z = zoomOutFrames();
  anim(home, z.frames, { duration: z.dur, easing: z.easing });
}
// Play / Listen: the selected level tile grows towards the centre while the rest of home fades out,
// then the game starts (count-in included) and the HUD fades in. Reduced motion: a quick fade only.
// The theme flavours the zoom (easing, spring, turn, light) and adds its particles and opening ring (themefx.js);
// the effects layer is dropped when the game starts, so nothing stays over the notes.
// Home ignores taps during the transition; the game clock starts only after it.
// The caller has already moved the machine into Countdown / Preview (entering), which ignores a second Play or Listen.
function enterGame(demo){
  clearHint(); clearTimeout(idleT);
  const home = $('#home');
  const go = () => { startGame(demo); dispatch(E.ENTERED); };
  if (home.hidden || !home.animate){ go(); return; }
  homePick = null;
  const r = reduceMotion(), et = entryTiming(), dur = et.dur, opts = { duration: dur, easing: 'ease-in', fill: 'forwards' }, list = [];
  let layer = null;
  const fade = el => list.push(anim(el, [{ opacity: 1 }, { opacity: 0 }], opts));
  home.style.pointerEvents = 'none';
  const tile = !r && $('#levels .tile[aria-pressed="true"]');
  if (tile){
    const b = tile.getBoundingClientRect(), dx = innerWidth / 2 - (b.left + b.width / 2), dy = innerHeight / 2 - (b.top + b.height / 2);
    tile.style.zIndex = '2';
    list.push(anim(tile, entryFrames(dx, dy), { ...opts, easing: et.easing }));
    layer = entryFx({ x: b.left + b.width / 2, y: b.top + b.height / 2 }, { x: innerWidth / 2, y: innerHeight / 2 }, dur);
    [...home.children].forEach(el => { if (el.id !== 'levels') fade(el); });
    [...$('#levels').children].forEach(el => { if (el !== tile) fade(el); });
    list.push(anim(home, [{}, { backgroundColor: 'transparent' }], opts));
  } else fade(home);
  setTimeout(() => {
    go();
    list.forEach(a => a && a.cancel()); dropLayer(layer); home.style.pointerEvents = ''; if (tile) tile.style.zIndex = '';
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
// The machine leaves the mic state for plain home (ignored while a request is still open).
watchMicPermission(st => { if (st === 'granted'){ hideMicState(); dispatch(E.CANCEL); } });
// Play: the machine goes to MicSetup while the microphone is asked, so a second tap during the permission prompt is
// ignored; a result that arrives after the child went elsewhere (e.g. Listen) is ignored as well.
async function playWithMic(){
  // Screen and keyboard mode never asks for the microphone: a tablet without a piano needs no permission.
  const mic = !dev().touch;
  if (!dispatch(E.PLAY, { mic })) return;
  audio(); hideMicState();
  if (mic){
    const r = await startMic();
    if (!r.ok){ showMicState(r.kind); dispatch(E.MIC_FAILED, { kind: r.kind }); return; }
    if (!dispatch(E.MIC_READY)) return;
  }
  enterGame(false);
}
$('#btnPlay').onclick = playWithMic;
$('#btnMicRetry').onclick = playWithMic;
// Play without the microphone: count screen taps on this device (the parent setting) and start.
$('#btnMicTouch').onclick = () => { audio(); if (!dispatch(E.PLAY, { mic: false })) return; setScreenInput(true); hideMicState(); enterGame(false); };
$('#btnListen').onclick = () => { audio(); if (dispatch(E.LISTEN)) enterGame(true); };
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
// The full-screen buttons (home corner and game HUD) double as exit buttons while the app is in full screen
document.querySelectorAll('.qfull').forEach(b => b.onclick = toggleFull);
let wasFull = false;
function syncFull(){
  const on = !!fsEl();
  if (wasFull && !on) pauseGame(); // leaving full screen (often the system Back) pauses a running game
  wasFull = on;
  document.querySelectorAll('.qfull').forEach(b => {
    b.dataset.ta = on ? 'fullExit' : 'full';
    b.setAttribute('aria-label', tx(b.dataset.ta));
    b.innerHTML = icon(on ? 'fullscreen-exit' : 'fullscreen');
  });
}
document.addEventListener('fullscreenchange', syncFull);
document.addEventListener('webkitfullscreenchange', syncFull);
// Pause freezes the game and dims the field; everything (time, notes, score, mode) stays in G.
// Only a running game (count-in, playing or waiting) can pause; anything else ignores it.
export function pauseGame(){ return !!G && dispatch(E.PAUSE); }
// Play/Pause: one button in the left HUD column, as in a media player. It pauses a running game and resumes a paused
// one; in the listen-only preview it stops the preview and goes home.
$('#btnPause').onclick = () => {
  if (is(S.PREVIEW)){ if (!can(E.HOME)) return; G.finished = true; goHome(); return; }
  if (is(S.PAUSED)) resumeGame(); else pauseGame();
};
$('#btnRestart').onclick = () => { if (dispatch(E.REPLAY)) startGame(false); };
// The column follows the state: Pause + Home while the game runs; Resume (big, primary) + Restart + input mode + Home
// while it is paused. The frozen field dims under it.
function syncPlayback(s){
  const p = s.name === S.PAUSED, b = $('#btnPause');
  document.body.classList.toggle('paused', p);
  b.classList.toggle('primary', p);
  b.dataset.ta = p ? 'resume' : 'pause';
  b.setAttribute('aria-label', tx(b.dataset.ta));
  b.innerHTML = icon(p ? 'play' : 'pause', { fill: p });
  $('#btnRestart').hidden = !p;
  $('#hudCtl .qinput').hidden = !p;
}
flow.subscribe(syncPlayback); syncPlayback(flow.state);
// Home straight from the game screen: a running game pauses first, then leaves through the same Paused -> Home path;
// the listen-only preview just ends. Ignored while the game screen is still sliding in.
$('#btnHudHome').onclick = () => {
  if (is(S.PREVIEW)){ if (!can(E.HOME)) return; G.finished = true; goHome(); return; }
  if (is(S.PAUSED) || pauseGame()) goHome();
};
$('#btnHome').onclick = goHome;
// Replay / Next act only while the results are shown (the machine is in Results or LevelUp): a second tap would
// otherwise read the game the first tap just started (Next would skip a level) or restart it.
$('#btnAgain').onclick = () => { if (!dispatch(E.REPLAY)) return; const p = P(); if (G){ p.sel.song = G.song; p.sel.level = G.level; } startGame(false); };
$('#btnNext').onclick = () => { if (!dispatch(E.NEXT)) return; const p = P(); if (G){ p.sel.song = G.song; p.sel.level = Math.min(LEVELS.length - 1, G.level + 1); } startGame(false); };
// Safe auto-pause: going to the background, locking the screen, losing focus or losing the microphone.
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
addEventListener('pagehide', () => pauseGame());
addEventListener('blur', () => pauseGame());
onMicLost(() => pauseGame());
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && is(S.HOME, S.MIC_SETUP) && document.activeElement === document.body){ e.preventDefault(); $('#btnPlay').click(); } });
