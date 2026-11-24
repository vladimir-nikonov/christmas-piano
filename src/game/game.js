// Game session: timing, judging played notes, score, results; the main animation loop.

import { tone, tick } from '../audio/synth.js';
import { LEVELS } from '../core/levels.js';
import { PC_COLOR } from '../core/music.js';
import { SONGS, songKey, bestKey } from '../core/songs.js';
import { HIST_MAX, save, P, opts, dev, prog } from '../data/storage.js';
import { $, showOnly } from '../dom.js';
import { micFrame } from '../input/mic.js';
import { requestWake } from '../platform/wake.js';
import { U, LO, HI, keys, hitY } from '../ui/canvas.js';
import { reducedMotion } from '../ui/motion.js';
import { draw } from '../ui/render.js';
import { goHome } from '../ui/screens/home.js';
import { showResults } from '../ui/screens/results.js';
import { TH } from '../ui/theme.js';

/* ================= Game ================= */
export let state = 'home', paused = false, G = null;
// soft: key -> time of a wrong note on it (gentle wobble, no red); nudge: the expected key/lane pulses once more after a wrong note.
export const fx = { parts:[], pops:[], keyFlash:{}, heardKey:{}, soft:{}, nudge:null };
export const flakes = Array.from({ length: 60 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.6 + 0.8, s: Math.random() * 0.03 + 0.01, d: Math.random() * 6 }));

export function startGame(demo){
  const p = P(), o = p.opts, L = LEVELS[p.sel.level], S = SONGS[songKey(p)];
  const bpm = demo ? S.bpm : S.bpm * L.pct / 100 * o.tempo / 100, beat = 60 / bpm;
  const tol = o.tolMs ? o.tolMs / 1000 : (L.tol || 0.5);
  const notes = S.parts[p.sel.part].reduce((acc, [m, d]) => { const b = acc.length ? acc[acc.length - 1].beat + acc[acc.length - 1].dur : 0; acc.push({ midi:m, beat:b, dur:d }); return acc; }, [])
    .map(n => ({ ...n, t: n.beat * beat, d: n.dur * beat, hit:false, missed:false, wrong:0, grade:null }));
  const look = Math.max(2.2, 4 * beat);
  G = { demo, wait: L.wait && !demo, song: songKey(p), meter: S.meter, level: p.sel.level, part: p.sel.part, beat, tol, notes, look,
        time: -Math.max(look, S.meter * beat) - 0.4, lastTickBeat: null, end: notes[notes.length - 1].t + notes[notes.length - 1].d + 0.8,
        score:0, combo:0, bestCombo:0, hits:0, perfect:0, finished:false, waiting:false };
  state = demo ? 'demo' : 'playing'; paused = false;
  showOnly('#hud'); $('#micPill').hidden = demo || !!dev().touch;
  updateHud(); requestWake();
}
export const nextUnhit = () => G.notes.find(n => !n.hit && !n.missed);
const same = (a, b) => opts().anyOct ? (a % 12) === (b % 12) : a === b;
export const keyFor = m => (m >= LO && m <= HI) ? m : LO + ((m % 12) + 12) % 12;

export function onPlayed(midi, atMs, source){
  fx.heardKey[keyFor(midi)] = performance.now();
  if (state !== 'playing' || paused || !G || G.time < -0.6) return;
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
const GRADE = { perfect:{ pts:100, icon:'star', size:60, fill:true }, good:{ pts:70, icon:'check', size:50 }, ok:{ pts:40, icon:'check', size:40 } };
function registerHit(n, grade){
  n.hit = true; n.grade = grade; G.hits++; if (grade === 'perfect') G.perfect++;
  G.combo++; G.bestCombo = Math.max(G.bestCombo, G.combo);
  G.score += GRADE[grade].pts * Math.min(4, 1 + Math.floor(G.combo / 8));
  const km = keyFor(n.midi), k = keys[km], col = PC_COLOR[n.midi % 12];
  fx.keyFlash[km] = { c: col, at: performance.now() };
  burst(k.x + k.w / 2, hitY, col, grade === 'perfect' ? 20 : 12);
  const gr = GRADE[grade];
  fx.pops.push({ icon: gr.icon, fill: gr.fill, c: grade === 'perfect' ? TH.reward : grade === 'good' ? TH.accent : TH.text, x: k.x + k.w / 2, y: hitY - 100 * U, size: gr.size * U, age: 0 });
  updateHud();
}
// A wrong note is never punished on screen: no cross, no red, no sound. The played key wobbles softly
// and the expected key and lane pulse once more to show where to go. Timed levels still reset the combo (scoring rule).
function wrongFx(midi, expected){
  const km = keyFor(midi); if (!keys[km]) return;
  const at = performance.now();
  fx.soft[km] = at;
  if (expected) fx.nudge = { key: keyFor(expected.midi), midi: expected.midi, at };
  if (!G.wait) G.combo = 0;
  updateHud();
}
export function burst(x, y, c, n){
  // Reduced motion: one short glow that fades in place instead of flying particles.
  if (reducedMotion){ fx.parts.push({ kind:'glow', x, y, c, life:0.3, age:0, r: (n >= 20 ? 70 : 54) * U }); return; }
  const kind = TH.fx;
  if (kind === 'ring'){ fx.parts.push({ kind:'ring', x, y, c, life:0.28, age:0, r: 10 * U }); n = Math.round(n / 2); }
  for (let i = 0; i < n; i++){
    const a = Math.random() * Math.PI - Math.PI, v = (kind === 'bubbles' ? 60 : 120) + Math.random() * (kind === 'bubbles' ? 120 : 260);
    fx.parts.push({ kind, x, y, vx: Math.cos(a) * v * U, vy: Math.sin(a) * v * U, c, life: ({ squares:.25, bubbles:.3, snow:.35, ring:.28 }[kind] || .3) + Math.random() * 0.35, age: 0, r: (3 + Math.random() * 3) * U });
  }
}
function updateHud(){
  if (!G) return;
  $('#score').textContent = G.score.toLocaleString('ru-RU');
  const mult = Math.min(4, 1 + Math.floor(G.combo / 8)); $('#combo').textContent = mult > 1 ? '×' + mult : '';
  $('#prog i').style.width = (G.notes.filter(n => n.hit || n.missed).length / G.notes.length * 100) + '%';
}

function finish(){
  if (G.finished) return; G.finished = true;
  if (G.demo){ goHome(); return; }
  state = 'results';
  const p = P(), total = G.notes.length, o = p.opts;
  const metric = G.wait ? Math.round(G.notes.filter(n => n.hit && !n.wrong).length / total * 100) : Math.round(G.hits / total * 100);
  const stars = metric >= 95 ? 3 : metric >= 80 ? 2 : metric >= 50 ? 1 : 0;
  const key = bestKey(G.song, G.level, G.part); p.best[key] = Math.max(p.best[key] || 0, stars);
  const prevTop = p.top[key], record = prevTop !== undefined && metric > prevTop;
  p.top[key] = Math.max(prevTop || 0, metric);
  (p.hist[key] = p.hist[key] || []).push({ at: Date.now(), pct: metric, stars, score: G.score });
  if (p.hist[key].length > HIST_MAX) p.hist[key].splice(0, p.hist[key].length - HIST_MAX);
  let levelUp = false;
  const pr = prog(p, G.song);
  if (G.level === pr.level && !o.tolMs && o.tempo >= 100){
    if (metric >= 85){ pr.streak++; if (pr.streak >= 2 && pr.level < LEVELS.length - 1){ pr.level++; pr.streak = 0; levelUp = true; } }
    else pr.streak = 0;
  }
  p.level = Math.max(p.level, pr.level);
  if (levelUp) p.sel.level = pr.level;
  save();
  showResults({ p, pr, key, song: G.song, level: G.level, metric, stars, record, levelUp });
}

/* ================= Main loop ================= */
let lastTs = performance.now();
export function frame(ts){ requestAnimationFrame(frame); try { step(ts); } catch(e){ console.error(e); } }
function step(ts){
  const dt = Math.min(0.05, (ts - lastTs) / 1000); lastTs = ts;
  if (state !== 'demo') micFrame(ts, onPlayed);
  if ((state === 'playing' || state === 'demo') && !paused && G){
    let nt = G.time + dt;
    if (G.wait){ const n = nextUnhit(); G.waiting = !!(n && nt >= n.t); if (G.waiting) nt = n.t; }
    G.time = nt;
    if (G.time < 0){ const b = Math.floor(G.time / G.beat); if (b !== G.lastTickBeat && -b <= G.meter){ G.lastTickBeat = b; tick(-b === G.meter); } }
    if (G.demo){
      for (const n of G.notes) if (!n.hit && G.time >= n.t){ n.hit = true; tone(n.midi, n.d); fx.keyFlash[n.midi] = { c: PC_COLOR[n.midi % 12], at: performance.now() };
        burst(keys[n.midi].x + keys[n.midi].w / 2, hitY, PC_COLOR[n.midi % 12], 8); updateHud(); }
    } else if (!G.wait){
      for (const n of G.notes) if (!n.hit && !n.missed && G.time > n.t + G.tol + dev().latency / 1000){ n.missed = true; G.combo = 0; updateHud(); }
    }
    if (G.time > G.end && G.notes.every(n => n.hit || n.missed)) finish();
  }
  draw(ts / 1000, dt);
}
// ES module bindings are read-only for importers: screens change the app state through these setters.
export function setState(s){ state = s; }
export function setPaused(v){ paused = v; }
export function setGame(g){ G = g; }
