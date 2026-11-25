// Game session: timing, judging played notes, results; the main animation loop.

import { tone, tick } from '../audio/synth.js';
import { LEVELS, cuesFor } from '../core/levels.js';
import { noteColor } from '../core/music.js';
import { SONGS, songKey, bestKey } from '../core/songs.js';
import { HIST_MAX, save, P, opts, dev, prog, partFor } from '../data/storage.js';
import { E, S, dispatch, is, flow, view as state, paused } from '../core/flow.js';
import { $ } from '../dom.js';
import { micFrame } from '../input/mic.js';
import { requestWake } from '../platform/wake.js';
import { U, LO, HI, keys, hitY } from '../ui/canvas.js';
import { reducedMotion } from '../ui/motion.js';
import { draw } from '../ui/render.js';
import { goHome } from '../ui/screens/home.js';
import { showResults } from '../ui/screens/results.js';
import { TH } from '../ui/theme.js';
import { noteResult } from '../record/recorder.js';
import { updateHandsBtn } from '../ui/hands.js';

/* ================= Game ================= */
// state / paused: the older app-wide state strings, derived from the navigation machine (src/core/flow.js).
export { state, paused };
export let G = null;
// soft: key -> time of a wrong note on it (gentle wobble, no red); nudge: the expected key/lane pulses once more after a wrong note.
export const fx = { parts:[], pops:[], keyFlash:{}, heardKey:{}, soft:{}, nudge:null };

export function startGame(demo){
  const p = P(), o = p.opts, L = LEVELS[p.sel.level], S = SONGS[songKey(p)], part = partFor(p, songKey(p), p.sel.level);
  const bpm = demo ? S.bpm : S.bpm * L.pct / 100 * o.tempo / 100, beat = 60 / bpm;
  const tol = o.tolMs ? o.tolMs / 1000 : (L.tol || 0.5);
  const notes = S.parts[part].reduce((acc, [m, d]) => { const b = acc.length ? acc[acc.length - 1].beat + acc[acc.length - 1].dur : 0; acc.push({ midi:m, beat:b, dur:d }); return acc; }, [])
    .map(n => ({ ...n, t: n.beat * beat, d: n.dur * beat, hit:false, missed:false, wrong:0, grade:null }));
  const look = Math.max(2.2, 4 * beat);
  G = { demo, wait: L.wait && !demo, song: songKey(p), meter: S.meter, level: p.sel.level, part, beat, tol, notes, look,
        time: -Math.max(look, S.meter * beat) - 0.4, lastTickBeat: null, end: notes[notes.length - 1].t + notes[notes.length - 1].d + 0.8,
        hits:0, perfect:0, finished:false, waiting:false, resumeIn:0, resumeBeat:null,
        minTempo: o.tempo };
  $('#micPill').hidden = demo || !!dev().touch;
  // The hands switch only where the level still shows the hand.
  $('#btnHands').hidden = !demo && !L.cues.hand;
  updateHud(); updateHandsBtn(); requestWake();
}
export const nextUnhit = () => G.notes.find(n => !n.hit && !n.missed);
// A note is in the hit zone while playing it now would count: the key lights up and the falling note itself
// blinks, so the child sees which note to play. Waiting levels: only the next note, from up to a beat before it
// reaches the line (onPlayed takes it from 1 s before). Timed levels: inside the timing window.
export const inZone = n => !!G && !n.hit && !n.missed && (G.wait ? n === nextUnhit() && n.t - G.time < Math.min(1.0, G.beat * 1.2) : n.t - G.time <= G.tol);
// A played note evaporates instead of staying above the key; hitAt / hitTime freeze where it was when played.
const markHit = n => { n.hit = true; n.hitAt = performance.now(); n.hitTime = Math.min(G.time, n.t); };
// The hit flash follows the level's colour cue, so Diamond stays in one colour.
const hitCol = m => noteColor(m, cuesFor(G.level, opts(), G.demo).colors);
const same = (a, b) => opts().anyOct ? (a % 12) === (b % 12) : a === b;
export const keyFor = m => (m >= LO && m <= HI) ? m : LO + ((m % 12) + 12) % 12;

export function onPlayed(midi, atMs, source){
  fx.heardKey[keyFor(midi)] = performance.now();
  if (state !== 'playing' || paused || !G || G.time < -0.6 || G.resumeIn > 0) return;
  const tPlayed = G.time - (performance.now() - atMs) / 1000 - (source === 'mic' ? dev().latency / 1000 : 0);
  if (G.wait){
    const n = nextUnhit(); if (!n || n.t - G.time > 1.0) return;
    if (same(midi, n.midi)) registerHit(n, n.wrong ? 'good' : 'perfect'); else { n.wrong++; wrongFx(midi, n); }
    return;
  }
  let best = null, bd = Infinity, near = null, nd = Infinity;
  for (const n of G.notes){ if (n.hit || n.missed) continue; const dt = Math.abs(tPlayed - n.t);
    if (dt <= G.tol){ if (dt < nd){ nd = dt; near = n; } if (same(midi, n.midi) && dt < bd){ bd = dt; best = n; } } }
  if (best) registerHit(best, bd <= G.tol * 0.35 ? 'perfect' : bd <= G.tol * 0.7 ? 'good' : 'ok');
  else if (near) wrongFx(midi, near);
}
// The child sees one kind of success pop; stars stay reserved for the result. No points, no combo: a miss never takes anything away.
const GRADE = { perfect:{ icon:'check', size:60 }, good:{ icon:'check', size:50 }, ok:{ icon:'check', size:44 } };
function registerHit(n, grade){
  markHit(n); n.grade = grade; G.hits++; if (grade === 'perfect') G.perfect++;
  const km = keyFor(n.midi), k = keys[km], col = hitCol(n.midi);
  fx.keyFlash[km] = { c: col, at: performance.now() };
  burst(k.x + k.w / 2, hitY, col, grade === 'perfect' ? 20 : 12);
  const gr = GRADE[grade];
  fx.pops.push({ icon: gr.icon, fill: gr.fill, c: grade === 'perfect' ? TH.reward : grade === 'good' ? TH.accent : TH.text, x: k.x + k.w / 2, y: hitY - 100 * U, size: gr.size * U, age: 0 });
  updateHud();
}
// A wrong note is never punished on screen: no cross, no red, no sound. The played key wobbles softly
// and the expected key and lane pulse once more to show where to go.
function wrongFx(midi, expected){
  const km = keyFor(midi); if (!keys[km]) return;
  const at = performance.now();
  fx.soft[km] = at;
  if (expected) fx.nudge = { key: keyFor(expected.midi), midi: expected.midi, at };
  updateHud();
}
export function burst(x, y, c, n){
  // Reduced motion: one short glow that fades in place instead of flying particles.
  if (reducedMotion){ fx.parts.push({ kind:'glow', x, y, c, life:0.3, age:0, r: (n >= 20 ? 70 : 54) * U }); return; }
  const kind = TH.fx;
  // One theme-specific shape on top of the particles: square shockwave, soft pop, frost hexagon, magic ring with stars
  const big = n >= 20;
  if (kind === 'squares') fx.parts.push({ kind:'sqring', x, y, c, life:0.25, age:0, r: (big ? 14 : 10) * U });
  else if (kind === 'bubbles') fx.parts.push({ kind:'pop', x, y, c, life:0.3, age:0, r: (big ? 40 : 30) * U });
  else if (kind === 'snow') fx.parts.push({ kind:'frost', x, y, c, life:0.35, age:0, r: (big ? 16 : 12) * U, rot: Math.random() });
  if (kind === 'ring'){ fx.parts.push({ kind:'ring', x, y, c, life:0.28, age:0, r: 10 * U });
    for (let i = 0; i < (big ? 6 : 4); i++){ const a = -Math.PI * (0.15 + 0.7 * Math.random()), v = (140 + Math.random() * 160) * U;
      fx.parts.push({ kind:'star', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, c, life: 0.45 + Math.random() * 0.2, age: 0, r: (6 + Math.random() * 4) * U }); }
    n = Math.round(n / 2); }
  for (let i = 0; i < n; i++){
    const a = Math.random() * Math.PI - Math.PI, v = (kind === 'bubbles' ? 60 : 120) + Math.random() * (kind === 'bubbles' ? 120 : 260);
    fx.parts.push({ kind, x, y, vx: Math.cos(a) * v * U, vy: Math.sin(a) * v * U, c, life: ({ squares:.25, bubbles:.3, snow:.35, ring:.28 }[kind] || .3) + Math.random() * 0.35, age: 0, r: (3 + Math.random() * 3) * U });
  }
}
function updateHud(){
  if (!G) return;
  $('#prog i').style.width = (G.notes.filter(n => n.hit || n.missed).length / G.notes.length * 100) + '%';
}

function finish(){
  if (G.finished) return; G.finished = true;
  if (G.demo){ goHome(); return; }
  dispatch(E.FINISH);
  const p = P(), total = G.notes.length, o = p.opts;
  const metric = G.wait ? Math.round(G.notes.filter(n => n.hit && !n.wrong).length / total * 100) : Math.round(G.hits / total * 100);
  const stars = metric >= 95 ? 3 : metric >= 80 ? 2 : metric >= 50 ? 1 : 0;
  const key = bestKey(G.song, G.level, G.part); p.best[key] = Math.max(p.best[key] || 0, stars);
  p.top[key] = Math.max(p.top[key] || 0, metric);
  (p.hist[key] = p.hist[key] || []).push({ at: Date.now(), pct: metric, stars });
  if (p.hist[key].length > HIST_MAX) p.hist[key].splice(0, p.hist[key].length - HIST_MAX);
  let levelUp = false;
  const pr = prog(p, G.song);
  if (G.level === pr.level && !o.tolMs && G.minTempo >= 100){
    if (metric >= 85){ pr.streak++; if (pr.streak >= 2 && pr.level < LEVELS.length - 1){ pr.level++; pr.streak = 0; levelUp = true; } }
    else pr.streak = 0;
  }
  p.level = Math.max(p.level, pr.level);
  if (levelUp) p.sel.level = pr.level;
  G.levelUp = levelUp;   // home reads it to open the new level there too
  save();
  noteResult({ name: p.name, song: SONGS[G.song].title(), stars, metric });
  showResults({ p, pr, song: G.song, level: G.level, metric, stars, levelUp });
  if (levelUp) dispatch(E.LEVEL_UP);
}

/* ================= Main loop ================= */
let lastTs = performance.now();
export function frame(ts){ requestAnimationFrame(frame); try { step(ts); } catch(e){ console.error(e); } }
function step(ts){
  const dt = Math.min(0.05, (ts - lastTs) / 1000); lastTs = ts;
  if (state !== 'demo') micFrame(ts, onPlayed);
  if ((state === 'playing' || state === 'demo') && !paused && G && G.resumeIn > 0){
    // Resume count-in: the clock stays put while the metronome counts the child back in.
    G.resumeIn = Math.max(0, G.resumeIn - dt);
    const c = Math.ceil(G.resumeIn / G.beat);
    if (c > 0 && c !== G.resumeBeat){ G.resumeBeat = c; tick(c === RESUME_BEATS); }
  } else if ((state === 'playing' || state === 'demo') && !paused && G){
    let nt = G.time + dt;
    if (G.wait){ const n = nextUnhit(); G.waiting = !!(n && nt >= n.t); if (G.waiting) nt = n.t; }
    G.time = nt;
    if (!G.demo){
      if (is(S.COUNTDOWN) && G.time >= 0) dispatch(E.GO);
      if (G.waiting !== is(S.WAITING)) dispatch(G.waiting ? E.WAIT : E.NOTE_OK);
    }
    if (G.time < 0){ const b = Math.floor(G.time / G.beat); if (b !== G.lastTickBeat && -b <= G.meter){ G.lastTickBeat = b; tick(-b === G.meter); } }
    if (G.demo){
      for (const n of G.notes) if (!n.hit && G.time >= n.t){ markHit(n); tone(n.midi, n.d); fx.keyFlash[n.midi] = { c: hitCol(n.midi), at: performance.now() };
        burst(keys[n.midi].x + keys[n.midi].w / 2, hitY, hitCol(n.midi), 8); updateHud(); }
    } else if (!G.wait){
      for (const n of G.notes) if (!n.hit && !n.missed && G.time > n.t + G.tol + dev().latency / 1000){ n.missed = true; updateHud(); }
    }
    if (G.time > G.end && G.notes.every(n => n.hit || n.missed)) finish();
  }
  draw(ts / 1000, dt);
}
// Leaves the pause. A timed level that was already running counts the child back in first, so there is
// time to put the hands back on the keys; the time, notes and mode stay as they were.
// Waiting levels and a pause during the start count-in carry on directly (the start count-in just continues).
// The navigation machine decides which (Paused -> source state or the resume count-in); returns false outside the pause.
export const RESUME_BEATS = 3;
export function resumeGame(){
  if (!G || !dispatch(E.RESUME, { timed: !G.wait })) return false;
  const s = flow.state;
  if (s.name === S.COUNTDOWN && s.data.kind === 'resume'){ G.resumeIn = RESUME_BEATS * G.beat; G.resumeBeat = null; }
  return true;
}
export function setGame(g){ G = g; }

// Playback speed (opts.tempo, % of the level tempo), shown as 0.5x ... 1.3x like the speed setting of a video player.
// It can change in the middle of a song: the whole timeline is rescaled around the current moment, so the song keeps
// its place (same beat, same falling notes) and just plays slower or faster from there. The timing window stays in
// real seconds. Only a run played at 100% or more the whole time counts for going up a level.
export const SPEED = Object.freeze({ min:50, max:130, step:5 });
export function setSpeed(pct){
  const p = P(); pct = Math.max(SPEED.min, Math.min(SPEED.max, Math.round(pct / SPEED.step) * SPEED.step));
  if (pct === p.opts.tempo) return false;
  p.opts.tempo = pct; save();
  if (!G || G.demo || G.finished) return true;
  const beat = 60 / (SONGS[G.song].bpm * LEVELS[G.level].pct / 100 * pct / 100), r = beat / G.beat;
  for (const n of G.notes){ n.t *= r; n.d *= r; }
  const last = G.notes[G.notes.length - 1];
  G.time *= r; G.resumeIn *= r; G.beat = beat; G.look = Math.max(2.2, 4 * beat); G.end = last.t + last.d + 0.8;
  G.minTempo = Math.min(G.minTempo, pct);
  return true;
}
