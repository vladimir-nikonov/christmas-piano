// Canvas drawing: falling notes, keyboard, effects, count-in.

import { letterFor } from '../core/keymap.js';
import { noteColor } from '../core/music.js';
import { cuesFor } from '../core/levels.js';
import { fingerFor } from '../core/songs.js';
import { tx } from '../i18n/index.js';
import { opts } from '../data/storage.js';
import { state, G, fx, nextUnhit, keyFor, inZone } from '../game/game.js';
import { ctx, W, H, DPR, U, LO, HI, isBlack, keys, kbTop, kbH, hitY, topY, bgCache, setBgCache } from './canvas.js';
import { HAND_PARTS, HAND_ORDER } from './hand-art.js';
import { ICON } from './icons.js';
import { reducedMotion } from './motion.js';
import { paintScene, drawAmbient, drawHitLine } from './scene.js';
import { noteName } from './labels.js';
import { TH, THK } from './theme.js';

/* ================= Drawing (themed) ================= */
const pathCache = {};
const P2D = name => pathCache[name] || (pathCache[name] = new Path2D(ICON[name]));
function drawIcon(name, color, cx, cy, size, fill){
  ctx.save(); ctx.translate(cx - size / 2, cy - size / 2); ctx.scale(size / 24, size / 24);
  ctx.lineCap = TH.radius <= 3 ? 'square' : 'round'; ctx.lineJoin = TH.radius <= 3 ? 'miter' : 'round';
  ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 5; ctx.stroke(P2D(name));
  ctx.lineWidth = 2.6; ctx.strokeStyle = color; if (fill){ ctx.fillStyle = color; ctx.fill(P2D(name)); } ctx.stroke(P2D(name));
  ctx.restore();
}
function rrect(x, y, w, h, r){
  if (h < 0){ y += h; h = -h; } if (w < 0){ x += w; w = -w; }
  r = Math.max(0, Math.min(r, w / 2, h / 2)); ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
}
// 4-point sparkle used by the anime notes and keys
function sparkle(cx, cy, r, color){
  ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.quadraticCurveTo(cx, cy, cx + r, cy); ctx.quadraticCurveTo(cx, cy, cx, cy + r);
  ctx.quadraticCurveTo(cx, cy, cx - r, cy); ctx.quadraticCurveTo(cx, cy, cx, cy - r); ctx.fillStyle = color; ctx.fill();
}
// Snow cap along the top edge of a rect (winter notes and keys)
function snowCap(x, y, w, h, color){
  const bumps = Math.max(2, Math.round(w / (14 * U))), bw = w / bumps;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h * 0.7);
  for (let i = bumps - 1; i >= 0; i--){ const bx = x + i * bw; ctx.quadraticCurveTo(bx + bw / 2, y + h * (i % 2 ? 1.25 : 0.95), bx, y + h * 0.7); }
  ctx.closePath(); ctx.fillStyle = color || '#F4FBFF'; ctx.fill();
}
// Falling note head, drawn in the current theme's style
function noteBlock(x, y, w, h, col, radius){
  if (THK === 'plastic'){
    const r = Math.min(h / 2, w / 2, 26 * U);
    rrect(x, y, w, h, r); ctx.fillStyle = col; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x, y + h * 0.62, w, h);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(x + w * 0.34, y + h * 0.26, w * 0.26, Math.max(3 * U, h * 0.14), 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(x + w * 0.78, y + h * 0.3, Math.max(2 * U, h * 0.07), 0, 7); ctx.fill();
    ctx.restore();
    rrect(x, y, w, h, r); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2 * U; ctx.stroke();
    return;
  }
  if (THK === 'winter'){
    rrect(x, y, w, h, radius); ctx.fillStyle = col; ctx.fill();
    ctx.save(); ctx.clip();
    const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(200,240,255,.3)');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 2 * U; ctx.beginPath(); ctx.moveTo(x + w * 0.18, y + h * 0.85); ctx.lineTo(x + w * 0.42, y + h * 0.45); ctx.stroke();
    snowCap(x, y, w, Math.min(h * 0.32, 14 * U));
    ctx.restore();
    rrect(x, y, w, h, radius); ctx.strokeStyle = 'rgba(235,250,255,.85)'; ctx.lineWidth = 2 * U; ctx.stroke();
    return;
  }
  if (THK === 'anime'){
    const r = Math.min(radius, h / 3);
    rrect(x, y, w, h, r); ctx.fillStyle = col; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,.38)'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w * 0.62, y); ctx.lineTo(x, y + h * 0.9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(70,20,90,.22)'; ctx.beginPath(); ctx.moveTo(x + w, y + h * 0.15); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w * 0.35, y + h); ctx.closePath(); ctx.fill();
    ctx.restore();
    rrect(x, y, w, h, r); ctx.strokeStyle = 'rgba(255,240,255,.8)'; ctx.lineWidth = 2 * U; ctx.stroke();
    sparkle(x + w - 9 * U, y + 9 * U, Math.min(9 * U, h * 0.25), '#fff');
    return;
  }
  rrect(x, y, w, h, radius); ctx.fillStyle = col; ctx.fill();
  ctx.save(); ctx.clip();
  const b = 4 * U; ctx.fillStyle = 'rgba(255,255,255,.32)'; ctx.fillRect(x, y, w, b); ctx.fillRect(x, y, b, h); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x, y + h - b, w, b); ctx.fillRect(x + w - b, y, b, h);
  ctx.restore();
}
// Tail of a long note (from yt down to yb), drawn in the current theme's style
function noteTail(cx, yt, yb, col, alpha){
  const tw = Math.round(16 * U * 1.1), len = yb - yt;
  ctx.globalAlpha = alpha;
  if (THK === 'winter'){
    const step = 18 * U; ctx.fillStyle = col;
    for (let y = yb - step / 2; y > yt; y -= step){ ctx.beginPath(); ctx.arc(cx, y, tw * 0.42, 0, 7); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    for (let y = yb - step / 2; y > yt; y -= step){ ctx.beginPath(); ctx.arc(cx - tw * 0.12, y - tw * 0.12, tw * 0.12, 0, 7); ctx.fill(); }
  } else if (THK === 'anime'){
    const g = ctx.createLinearGradient(0, yt, 0, yb); g.addColorStop(0, col + '00'); g.addColorStop(1, col);
    rrect(cx - tw / 2, yt, tw, len, tw / 2); ctx.fillStyle = g; ctx.fill();
    for (let y = yb - 30 * U, i = 0; y > yt + 6 * U; y -= 34 * U, i++) sparkle(cx + (i % 2 ? 1 : -1) * tw * 0.9, y, 5 * U, '#fff');
  } else {
    rrect(cx - tw / 2, yt, tw, len, THK === 'pixel' ? 0 : tw / 2); ctx.fillStyle = col; ctx.fill();
    if (THK === 'plastic'){ ctx.fillStyle = 'rgba(255,255,255,.4)'; rrect(cx - tw / 2 + 3 * U, yt + 3 * U, tw * 0.28, Math.max(0, len - 6 * U), tw * 0.14); ctx.fill(); }
  }
}
function background(){
  if (bgCache && bgCache.w === W && bgCache.h === H && bgCache.t === TH) return bgCache.c;
  const c = document.createElement('canvas'); c.width = Math.round(W * DPR); c.height = Math.round(H * DPR);
  const x = c.getContext('2d'); x.scale(DPR, DPR);
  x.fillStyle = TH.bg; x.fillRect(0, 0, W, H);
  paintScene(x, THK, TH, W, H, hitY, U);
  for (let m = LO; m <= HI; m++){ const k = keys[m]; if (!k.black){ x.fillStyle = 'rgba(255,255,255,.03)'; x.fillRect(k.x + 2, 0, k.w - 4, hitY); } }
  setBgCache({ w: W, h: H, t: TH, c }); return c;
}
const LBL = () => TH.font + ', system-ui, sans-serif';

/* ===== Waiting focus and soft wrong-note cues =====
   All motion amplitudes of these cues are kept here, so a reduced-motion mode can damp them in one place. */
const NUDGE_MS = 650, SOFT_MS = 420, NEUTRAL = 'rgba(150,160,190,.85)', FOCUS_EDGE = 'rgba(24,35,53,.8)'; // note colours (yellow E) never hide the key outline
const pulse = (now, speed) => reducedMotion ? 0 : Math.sin(now * speed);              // -1..1 pulse; 0 (steady) with reduced motion
const decay = (at, ms) => at ? Math.max(0, 1 - (performance.now() - at) / ms) : 0;      // 1 → 0 after an event
const wobble = d => d && !reducedMotion ? Math.sin((1 - d) * 16) * 4 * U * d : 0;    // small sideways shake, fading out; none with reduced motion
// What the cues point at this frame: the expected note while waiting, or briefly after a wrong note (nudge). Read by the smoke test.
export const focus = { key: null, midi: null, waiting: false, nudge: 0 };
// The cues the running level shows this frame (src/core/levels.js); read by the smoke test.
export let cue = cuesFor(-1, {}, true);
const colOf = midi => noteColor(midi, cue.colors);
function updateFocus(){
  const n = G && state === 'playing' && G.wait && G.waiting ? nextUnhit() : null;
  const nd = G && state === 'playing' && fx.nudge ? decay(fx.nudge.at, NUDGE_MS) : 0;
  focus.waiting = !!n; focus.nudge = nd;
  focus.midi = n ? n.midi : nd ? fx.nudge.midi : null;
  focus.key = focus.midi === null ? null : keyFor(focus.midi);
}
// Soft column glow over the expected note's lane, from the top down to the hit line, with outlined edges (shape, not only colour).
function laneGlow(now){
  if (focus.key === null) return;
  const k = keys[focus.key], col = colOf(focus.midi);
  const a = Math.min(1, (focus.waiting ? 0.3 + 0.06 * pulse(now, 4) : 0) + 0.35 * focus.nudge);
  if (a <= 0) return;
  const g = ctx.createLinearGradient(0, 0, 0, hitY); g.addColorStop(0, col + '00'); g.addColorStop(1, col);
  ctx.globalAlpha = a; ctx.fillStyle = g; ctx.fillRect(k.x, 0, k.w, hitY);
  ctx.globalAlpha = a * 0.9; ctx.fillStyle = col; const lw = Math.max(2, 3 * U);
  ctx.fillRect(k.x, hitY * 0.35, lw, hitY * 0.65); ctx.fillRect(k.x + k.w - lw, hitY * 0.35, lw, hitY * 0.65);
  ctx.globalAlpha = 1;
}
// Evaporation of a played note: the head swells, lifts and fades to white; on the first frame it lets off
// a few puffs of vapour in its colour (none with reduced motion: then it only fades).
const EVAP_MS = 380;
function evaporate(n, k, yt, yb, e, rad){
  const col = colOf(n.midi), w0 = Math.round(Math.min(115 * U, k.w * (k.black ? 0.9 : 0.82))), h0 = Math.min(yb - yt, 56 * U);
  const cx = k.x + k.w / 2, cy = yb - h0 / 2 - (reducedMotion ? 0 : e * 26 * U), sc = reducedMotion ? 1 : 1 + 0.35 * e;
  const w = w0 * sc, h = h0 * sc * (1 - 0.4 * e);
  if (!n.vapour){ n.vapour = true;
    if (!reducedMotion) for (let i = 0; i < 9; i++){ const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, v = (60 + Math.random() * 90) * U;
      fx.parts.push({ kind:'vapour', x: cx + (Math.random() - 0.5) * w0 * 0.8, y: yb - h0 * Math.random(), vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        c: col, life: 0.45 + Math.random() * 0.25, age: 0, r: (8 + Math.random() * 8) * U }); }
  }
  ctx.globalAlpha = 1 - e; ctx.shadowColor = col; ctx.shadowBlur = 24 * U;
  noteBlock(cx - w / 2, cy - h / 2, w, h, col, rad); ctx.shadowBlur = 0;
  ctx.globalAlpha = (1 - e) * Math.min(1, e * 2.5); rrect(cx - w / 2, cy - h / 2, w, h, rad); ctx.fillStyle = '#FFFFFF'; ctx.fill();
  ctx.globalAlpha = 1;
}
// What the last frame drew (read by the smoke test through window.__sn).
export const drawn = { flakes: 0, particles: 0, glows: 0 };
export function draw(now, dt){
  ctx.drawImage(background(), 0, 0, W, H);
  drawn.flakes = drawn.particles = drawn.glows = 0;
  if (!reducedMotion) drawn.flakes = drawAmbient(ctx, THK, TH, now, dt, W, hitY, U);
  const o = opts(), pps = G ? (hitY - topY) / G.look : 1, rad = Math.min(TH.radius, 16) * U;
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, hitY + 2); ctx.clip();
  cue = cuesFor(G ? G.level : -1, o, !G || G.demo);
  updateFocus();
  if (G && (state === 'playing' || state === 'demo' || state === 'results')){
    const nu = G.wait ? nextUnhit() : null;
    laneGlow(now);
    for (const n of G.notes){
      const k = keys[keyFor(n.midi)];
      // A played note evaporates where it was played: it swells, rises and fades within EVAP_MS (the demo just shows the song).
      const ev = n.hit && n.hitAt && !G.demo ? (performance.now() - n.hitAt) / EVAP_MS : 0;
      if (ev >= 1) continue;
      const tn = ev ? n.hitTime : G.time;
      let yb = hitY - (n.t - tn) * pps; const yt = hitY - (n.t + n.d * 0.88 - tn) * pps;
      if (yt > hitY || yb < -20) continue;
      if (n.hit) yb = Math.min(yb, hitY);
      if (yb - yt < 2) continue;
      if (ev){ evaporate(n, k, yt, yb, ev, rad); continue; }
      const zone = state === 'playing' && inZone(n), blink = zone ? (reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(now * 14)) : 0;
      const col = n.missed ? TH.border : colOf(n.midi);
      const w = Math.round(Math.min(115 * U, k.w * (k.black ? 0.9 : 0.82))), x = Math.round(k.x + (k.w - w) / 2);
      const headH = Math.min(yb - yt, 56 * U);
      ctx.globalAlpha = n.missed ? 0.45 : 1;
      if (yb - yt > headH + 2){ noteTail(x + w / 2, yt, yb - headH + 6, col, (n.missed ? 0.45 : 1) * (n.hit ? 0.95 : 0.55)); ctx.globalAlpha = n.missed ? 0.45 : 1; }
      if (n.hit || n === nu){ ctx.shadowColor = col; ctx.shadowBlur = n.hit ? 24 : reducedMotion ? 20 : 16 + Math.sin(now * 8) * 10; }
      else if (zone){ ctx.shadowColor = col; ctx.shadowBlur = (14 + 16 * blink) * U; }
      noteBlock(x, yb - headH, w, headH, col, rad);
      ctx.shadowBlur = 0;
      if (zone){ // blinking: the note flashes white and gets a white rim while it can be played (steady with reduced motion)
        ctx.globalAlpha = 0.55 * blink; rrect(x, yb - headH, w, headH, rad); ctx.fillStyle = '#FFFFFF'; ctx.fill();
        ctx.globalAlpha = 0.6 + 0.4 * blink; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3 * U; ctx.stroke(); ctx.globalAlpha = 1;
      }
      if (n === nu && focus.midi !== null && !n.hit){ // pulsing outline around the expected note
        const gp = (4 + 2 * pulse(now, 6) + (reducedMotion ? 0 : 6 * focus.nudge)) * U; // reduced motion: the nudge brightens, the outline does not grow
        rrect(x - gp, yb - headH - gp, w + gp * 2, headH + gp * 2, rad + gp); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3 * U; ctx.stroke();
      }
      if (cue.names && headH > 26 * U && !n.hit){
        ctx.fillStyle = 'rgba(18,24,46,.92)'; ctx.font = '800 ' + Math.round(Math.min(30 * U, w * 0.3)) + 'px ' + LBL();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(noteName(n.midi), x + w / 2, yb - headH / 2 + 1);
      }
      ctx.globalAlpha = 1;
    }
    if (state === 'playing' && G.wait && G.waiting && nu){
      const k = keys[keyFor(nu.midi)];
      drawIcon('arrow-down', TH.reward, k.x + k.w / 2, hitY - 56 * U - 50 * U - (reducedMotion ? 8 : Math.abs(Math.sin(now * 5)) * 16) * U, 56 * U);
    }
  }
  ctx.restore();
  drawHitLine(ctx, THK, TH, reducedMotion ? 0 : now, W, hitY, U);
  drawKeyboard(now);
  for (let i = fx.parts.length - 1; i >= 0; i--){ const p = fx.parts[i]; p.age += dt; if (p.age > p.life){ fx.parts.splice(i, 1); continue; }
    ctx.globalAlpha = 1 - p.age / p.life;
    if (p.kind === 'glow'){ drawn.glows++; const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r); g.addColorStop(0, p.c); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); continue; }
    drawn.particles++;
    if (p.kind === 'ring'){ ctx.strokeStyle = p.c; ctx.lineWidth = 4 * U; ctx.beginPath(); ctx.arc(p.x, p.y, p.r + (p.age / p.life) * 70 * U, 0, 7); ctx.stroke(); continue; }
    const t = p.age / p.life;
    if (p.kind === 'sqring'){ const r = Math.round(p.r + t * 60 * U), lw = Math.max(2, Math.round(5 * U)); ctx.fillStyle = p.c;
      ctx.fillRect(Math.round(p.x - r), Math.round(p.y - r), r * 2, lw); ctx.fillRect(Math.round(p.x - r), Math.round(p.y + r - lw), r * 2, lw);
      ctx.fillRect(Math.round(p.x - r), Math.round(p.y - r), lw, r * 2); ctx.fillRect(Math.round(p.x + r - lw), Math.round(p.y - r), lw, r * 2); continue; }
    if (p.kind === 'pop'){ const r = p.r * (0.4 + 0.9 * t); ctx.globalAlpha = (1 - t) * 0.45; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill();
      ctx.globalAlpha = 1 - t; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3 * U; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.stroke(); continue; }
    if (p.kind === 'frost'){ const r = p.r + t * 56 * U, a0 = p.rot + t * 0.8; ctx.strokeStyle = '#e6fbff'; ctx.lineWidth = 2.5 * U; ctx.beginPath();
      for (let j = 0; j <= 6; j++){ const a = a0 + j * Math.PI / 3; if (j) ctx.lineTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r); else ctx.moveTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r); }
      for (let j = 0; j < 6; j++){ const a = a0 + j * Math.PI / 3; ctx.moveTo(p.x + Math.cos(a) * r * 0.55, p.y + Math.sin(a) * r * 0.55); ctx.lineTo(p.x + Math.cos(a) * r * 0.85, p.y + Math.sin(a) * r * 0.85); }
      ctx.stroke(); continue; }
    if (p.kind === 'vapour'){ p.vx *= 0.94; p.vy -= 60 * dt * U; p.x += p.vx * dt; p.y += p.vy * dt; const r = p.r * (1 + 1.6 * t);
      ctx.globalAlpha = (1 - t) * 0.55; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill();
      ctx.globalAlpha = (1 - t) * 0.5; ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(p.x - r * 0.25, p.y - r * 0.25, r * 0.45, 0, 7); ctx.fill(); continue; }
    if (p.kind === 'star'){ p.vy += 260 * dt * U; p.x += p.vx * dt; p.y += p.vy * dt; sparkle(p.x, p.y, p.r * (1 - t * 0.5), Math.floor(p.age * 12) % 2 ? '#fff' : TH.reward); continue; }
    if (p.kind === 'bubbles') p.vy -= 200 * dt * U; else p.vy += 420 * dt * U;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.kind === 'squares'){ ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.round(p.r), Math.round(p.r)); }
    else if (p.kind === 'bubbles'){ ctx.strokeStyle = p.c; ctx.lineWidth = 2 * U; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.4, 0, 7); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(p.x - p.r * 0.5, p.y - p.r * 0.5, p.r * 0.35, 0, 7); ctx.fill(); }
    else if (p.kind === 'snow'){ ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6 * U; const r = p.r; ctx.beginPath(); for (let j = 0; j < 3; j++){ const an = j * Math.PI / 3; ctx.moveTo(p.x - Math.cos(an) * r, p.y - Math.sin(an) * r); ctx.lineTo(p.x + Math.cos(an) * r, p.y + Math.sin(an) * r); } ctx.stroke(); }
    else { ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.7, 0, 7); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  for (let i = fx.pops.length - 1; i >= 0; i--){ const p = fx.pops[i]; p.age += dt; if (p.age > 0.8){ fx.pops.splice(i, 1); continue; }
    const sc = reducedMotion ? 1 : p.age < 0.12 ? p.age / 0.12 * 1.2 : 1; ctx.globalAlpha = 1 - Math.max(0, p.age - 0.4) / 0.4;
    drawIcon(p.icon, p.c, p.x, p.y - (reducedMotion ? 0 : p.age * 40 * U), p.size * sc, p.fill); }
  ctx.globalAlpha = 1;
  if (G && (state === 'playing' || state === 'demo') && (G.time < 0 || G.resumeIn > 0)){
    const c = G.resumeIn > 0 ? Math.ceil(G.resumeIn / G.beat) : Math.ceil(-G.time / G.beat);
    if (c <= 4){ const fs = Math.round(Math.min(170 * U, H * 0.22)); ctx.font = '900 ' + fs + 'px ' + LBL(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = TH.accentDark; ctx.fillText(c, W / 2, hitY * 0.5 + 6 * U); ctx.fillStyle = TH.text; ctx.fillText(c, W / 2, hitY * 0.5); }
  }
}
/* ===== Fingering hint =====
   On the key of the next note (from the moment it appears on the field, before the key lights up), a hand seen from above (right hand: thumb on the left; left hand: mirrored)
   with the finger to press filled in the note's colour, the finger number on the palm and a short L/R mark.
   The hand drawing is the designer's (src/ui/hand-art.js). */
// What the hint shows this frame (read by the smoke test).
export const handHint = { key: null, hand: null, finger: null };
const handPaths = {};
const handPath = name => handPaths[name] || (handPaths[name] = new Path2D(HAND_PARTS[name]));
// The designer's hand (src/ui/hand-art.js) at width s from (cx - s/2, top); the finger to press is filled with col.
function drawHand(cx, top, s, hand, finger, col){
  const k = s / 100;
  ctx.save(); ctx.translate(cx - s / 2, top); ctx.scale(k, k);
  if (hand === 'L'){ ctx.translate(100, 0); ctx.scale(-1, 1); }
  ctx.lineJoin = ctx.lineCap = 'round'; ctx.strokeStyle = '#182335'; ctx.lineWidth = Math.max(3.5, 2.2 / k); // never thinner than ~2 px
  HAND_ORDER.forEach((name, i) => { const p = handPath(name); ctx.fillStyle = i === finger - 1 ? col : '#FFFFFF'; ctx.fill(p); ctx.stroke(p); });
  ctx.restore();
  // finger number on the palm (not mirrored)
  ctx.fillStyle = '#182335'; ctx.font = '900 ' + Math.round(s * 0.3) + 'px ' + LBL(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(finger, cx - s / 2 + (hand === 'L' ? 45 : 55) * k, top + 85 * k);
}
// The hand and its L/R mark, centred at cx in the band top..top+h; s is the hand width (same on every key).
function fingerHint(m, midi, cx, top, h, s, tag){
  const f = G && fingerFor(G.song, midi); if (!f) return;
  handHint.key = m; handHint.hand = f.hand; handHint.finger = f.finger;
  const gap = 3 * U, ht = top + (h - s * 1.2 - gap - tag) / 2;
  drawHand(cx, ht, s, f.hand, f.finger, colOf(midi));
  const ty = ht + s * 1.2 + gap + tag / 2, tw = tag * 1.3;
  rrect(cx - tw / 2, ty - tag / 2, tw, tag, tag / 2); ctx.fillStyle = '#182335'; ctx.fill();
  ctx.fillStyle = '#FFFFFF'; ctx.font = '900 ' + Math.round(tag * 0.72) + 'px ' + LBL(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(tx(f.hand === 'L' ? 'handL' : 'handR'), cx, ty + 1);
}
// Where the hand fits on key m without covering a neighbour key, the note label or the letter: the band (top, h) and
// the centre cx. White keys: the column between the black neighbours above their lower edge, so the hand is no wider
// than that column; it stays centred on the key. The size is the same on every key: whatever fits the tightest place.
function handFit(m, letters){
  const k = keys[m], wh = kbH - 8 * U, bh = Math.round(kbH * 0.58), top0 = kbTop + 2;
  const sh = Math.round(Math.min(30 * U, wh * 0.16)), pad = 6 * U, lt = letters ? 26 * U : pad;
  const white = { top: top0 + lt, bot: kbTop + wh - sh - 6 * U - pad }, black = { top: top0 + pad, bot: top0 + bh - lt };
  const kw = keys[LO].w, bw = keys[LO + 1].w, gap = 3 * U;
  const tagOf = s => Math.round(Math.min(20 * U, s * 0.34));
  const fitH = band => s => s * 1.2 + gap + tagOf(s) <= band.bot - band.top;
  const side = 3 * U; // the drawing has its own margin inside its box; this keeps the outline off the neighbours
  let s = Math.min(kw - bw - 2 * side, bw - 2 * side, 150 * U); // narrowest white column; black key width
  while (s > 8 && !(fitH(white)(s) && fitH(black)(s))) s -= 1;
  const band = k.black ? black : white;
  return { cx: k.x + k.w / 2, top: band.top, h: band.bot - band.top, s, tag: tagOf(s) };
}
// Key colours and surface details per theme
const KEY_COLORS = {
  pixel:   { white:['#F5F5FA', '#F5F5FA'], black:['#202435', '#202435'], bed:'rgba(0,0,0,.35)' },
  plastic: { white:['#FFFFFF', '#E6E1FA'], black:['#4A3F8F', '#2A2260'], bed:'rgba(30,20,80,.45)' },
  winter:  { white:['#F7FCFF', '#CFE8F2'], black:['#1D4452', '#0E2630'], bed:'rgba(5,25,35,.45)' },
  anime:   { white:['#FFFFFF', '#FDE3F3'], black:['#3A2F66', '#1E1838'], bed:'rgba(20,10,40,.5)' }
};
function keyFill(black, y, h){
  const c = KEY_COLORS[THK][black ? 'black' : 'white'];
  if (c[0] === c[1]) return c[0];
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, c[0]); g.addColorStop(1, c[1]); return g;
}
function keyDecor(x, y, w, h, black, now){
  if (THK === 'pixel'){ ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x, y + h - 6 * U, w, 6 * U); if (!black){ ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(x, y, 3 * U, h); } return; }
  if (THK === 'plastic'){
    ctx.fillStyle = 'rgba(255,255,255,' + (black ? '.22' : '.75') + ')'; rrect(x + w * 0.14, y + 6 * U, w * 0.22, h * (black ? 0.6 : 0.35), w * 0.11); ctx.fill();
    ctx.fillStyle = 'rgba(40,20,100,.14)'; ctx.fillRect(x, y + h - 10 * U, w, 10 * U); return;
  }
  if (THK === 'winter'){
    const sh = (black ? 20 : 18) * U; snowCap(x, y - 1, w, sh + 4 * U, '#A9D6E8'); snowCap(x, y - 1, w, sh);
    if (!black){ ctx.fillStyle = 'rgba(160,215,235,.35)'; for (let i = 0; i < 3; i++){ const fx0 = x + w * (0.25 + 0.25 * i), fy = y + h * (0.38 + 0.08 * (i % 2)); ctx.beginPath(); ctx.arc(fx0, fy, 2 * U, 0, 7); ctx.fill(); } }
    return;
  }
  // anime
  ctx.fillStyle = black ? '#F49AD1' : 'rgba(244,154,209,.55)'; ctx.fillRect(x, y, w, (black ? 3 : 4) * U);
  if (black) sparkle(x + w / 2, y + h - 14 * U, 5 * U, 'rgba(255,217,141,' + (0.55 + 0.35 * Math.sin(now * 3 + x)) + ')');
}
function drawKeyboard(now){
  const nowMs = performance.now(), kr = Math.min(TH.radius, 12) * U;
  ctx.fillStyle = KEY_COLORS[THK].bed; ctx.fillRect(0, kbTop, W, kbH);
  let hint = null; const fk = focus.key, fp = focus.waiting ? 1 : 0;
  if (cue.key && G && state === 'playing'){ const n = nextUnhit(); if (n && inZone(n)){ hint = keyFor(n.midi); } }
  handHint.key = handHint.hand = handHint.finger = null; let hand = null;
  // The hand shows as soon as the next note appears at the top of the field, so the child can get the finger ready.
  const hn = cue.hand && G && (state === 'playing' || state === 'demo') ? nextUnhit() : null;
  const handKey = hn && hn.t - G.time < G.look ? keyFor(hn.midi) : null;
  const drawKey = m => {
    const sd = decay(fx.soft[m], SOFT_MS);
    const k = keys[m], h = k.black ? Math.round(kbH * 0.58) : kbH - 8 * U, x = Math.round(k.x + (k.black ? 0 : 2) + wobble(sd)), w = Math.round(k.w - (k.black ? 0 : 4));
    const fl = fx.keyFlash[m], fa = fl ? Math.max(0, 1 - (nowMs - fl.at) / 450) : 0;
    rrect(x, kbTop + 2, w, h, kr); ctx.fillStyle = keyFill(k.black, kbTop + 2, h); ctx.fill();
    ctx.save(); rrect(x, kbTop + 2, w, h, kr); ctx.clip();
    keyDecor(x, kbTop + 2, w, h, k.black, now);
    if (m === fk){ ctx.globalAlpha = Math.min(1, fp * (0.5 + 0.15 * pulse(now, 6)) + 0.4 * focus.nudge); ctx.fillStyle = colOf(focus.midi); ctx.fillRect(x, kbTop, w, h + 2); ctx.globalAlpha = 1; }
    else if (m === hint){ ctx.globalAlpha = reducedMotion ? 0.5 : 0.45 + 0.2 * Math.sin(now * 7); ctx.fillStyle = colOf(m); ctx.fillRect(x, kbTop, w, h + 2); ctx.globalAlpha = 1; }
    if (fx.heardKey[m] && nowMs - fx.heardKey[m] < 160 && !fa){ ctx.fillStyle = 'rgba(120,140,220,.4)'; ctx.fillRect(x, kbTop, w, h + 2); }
    if (fa){ ctx.globalAlpha = fa; ctx.fillStyle = fl.c; ctx.fillRect(x, kbTop, w, h + 2); ctx.globalAlpha = 1; }
    ctx.restore();
    if (m === handKey){ const hf = handFit(m, !!fx.kbLetters); hand = () => fingerHint(m, hn.midi, hf.cx, hf.top, hf.h, hf.s, hf.tag); }
    if (m === fk){ const lw = (4 + 1.5 * pulse(now, 6) * fp + 3 * focus.nudge) * U; rrect(x + lw / 2, kbTop + 2 + lw / 2, w - lw, h - lw, kr); ctx.strokeStyle = FOCUS_EDGE; ctx.lineWidth = lw; ctx.stroke(); }
    if (sd){ ctx.globalAlpha = sd; rrect(x + 1.5 * U, kbTop + 2 + 1.5 * U, w - 3 * U, h - 3 * U, kr); ctx.strokeStyle = NEUTRAL; ctx.lineWidth = 3 * U; ctx.stroke(); ctx.globalAlpha = 1; }
    // Once the computer keyboard is used, show which letter plays each key.
    const kl = fx.kbLetters && letterFor(m);
    if (kl){ ctx.fillStyle = k.black ? 'rgba(255,255,255,.8)' : 'rgba(24,35,53,.55)'; ctx.font = '700 ' + Math.round(Math.min(18 * U, w * 0.36)) + 'px ' + LBL(); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(kl, x + w / 2, kbTop + 2 + (k.black ? h - 24 * U : 8 * U)); }
    // The colour tab with the note name, as far as the level still shows colours or names.
    if (!k.black && (cue.colors || cue.names)){
      const cx = x + w / 2, sh = Math.round(Math.min(30 * U, h * 0.16)), sw = Math.round(w * 0.86), cy = kbTop + h - sh - 6 * U;
      rrect(cx - sw / 2, cy, sw, sh, Math.min(kr, sh / 2)); ctx.fillStyle = colOf(m); ctx.fill();
      if (cue.names){ ctx.fillStyle = '#182335'; ctx.font = '800 ' + Math.round(Math.min(24 * U, w * 0.24)) + 'px ' + LBL(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(noteName(m), cx, cy + sh / 2 + 1); }
    }
  };
  for (let m = LO; m <= HI; m++) if (!isBlack(m)) drawKey(m);
  for (let m = LO; m <= HI; m++) if (isBlack(m)) drawKey(m);
  if (hand) hand();
}
