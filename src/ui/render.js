// Canvas drawing: falling notes, keyboard, effects, count-in.

import { letterFor } from '../core/keymap.js';
import { PC_COLOR } from '../core/music.js';
import { opts } from '../data/storage.js';
import { state, G, fx, flakes, nextUnhit, keyFor } from '../game/game.js';
import { ctx, W, H, DPR, U, LO, HI, isBlack, keys, kbTop, kbH, hitY, topY, bgCache, setBgCache } from './canvas.js';
import { ICON } from './icons.js';
import { reducedMotion } from './motion.js';
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
  if (TH.decor === 'glow'){ const g = x.createRadialGradient(W / 2, -H * 0.1, 0, W / 2, -H * 0.1, Math.max(W, H) * 0.8); g.addColorStop(0, TH.border + 'aa'); g.addColorStop(1, TH.bg + '00'); x.fillStyle = g; x.fillRect(0, 0, W, H); }
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
  const k = keys[focus.key], col = PC_COLOR[focus.midi % 12];
  const a = Math.min(1, (focus.waiting ? 0.3 + 0.06 * pulse(now, 4) : 0) + 0.35 * focus.nudge);
  if (a <= 0) return;
  const g = ctx.createLinearGradient(0, 0, 0, hitY); g.addColorStop(0, col + '00'); g.addColorStop(1, col);
  ctx.globalAlpha = a; ctx.fillStyle = g; ctx.fillRect(k.x, 0, k.w, hitY);
  ctx.globalAlpha = a * 0.9; ctx.fillStyle = col; const lw = Math.max(2, 3 * U);
  ctx.fillRect(k.x, hitY * 0.35, lw, hitY * 0.65); ctx.fillRect(k.x + k.w - lw, hitY * 0.35, lw, hitY * 0.65);
  ctx.globalAlpha = 1;
}
// What the last frame drew (read by the smoke test through window.__sn).
export const drawn = { flakes: 0, particles: 0, glows: 0 };
export function draw(now, dt){
  ctx.drawImage(background(), 0, 0, W, H);
  drawn.flakes = drawn.particles = drawn.glows = 0;
  if (TH.decor !== 'glow' && !reducedMotion){ drawn.flakes = flakes.length; ctx.fillStyle = 'rgba(255,255,255,.45)';
    for (const f of flakes){ f.y += f.s * dt * 3; if (f.y > 1) f.y = 0; const x = (f.x + Math.sin(now * 0.4 + f.d) * 0.01) * W, y = f.y * kbTop, r = f.r * U * 1.4;
      if (TH.decor === 'dots') ctx.fillRect(Math.round(x), Math.round(y), Math.round(r * 2), Math.round(r * 2)); else { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); } } }
  const o = opts(), pps = G ? (hitY - topY) / G.look : 1, rad = Math.min(TH.radius, 16) * U;
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, hitY + 2); ctx.clip();
  updateFocus();
  if (G && (state === 'playing' || state === 'demo' || state === 'results')){
    const nu = G.wait ? nextUnhit() : null;
    laneGlow(now);
    for (const n of G.notes){
      const k = keys[keyFor(n.midi)];
      let yb = hitY - (n.t - G.time) * pps; const yt = hitY - (n.t + n.d * 0.88 - G.time) * pps;
      if (yt > hitY || yb < -20) continue;
      if (n.hit) yb = Math.min(yb, hitY);
      if (yb - yt < 2) continue;
      const col = n.missed ? TH.border : PC_COLOR[n.midi % 12];
      const w = Math.round(Math.min(115 * U, k.w * (k.black ? 0.9 : 0.82))), x = Math.round(k.x + (k.w - w) / 2);
      const headH = Math.min(yb - yt, 56 * U);
      ctx.globalAlpha = n.missed ? 0.45 : 1;
      if (yb - yt > headH + 2){ noteTail(x + w / 2, yt, yb - headH + 6, col, (n.missed ? 0.45 : 1) * (n.hit ? 0.95 : 0.55)); ctx.globalAlpha = n.missed ? 0.45 : 1; }
      if (n.hit || n === nu){ ctx.shadowColor = col; ctx.shadowBlur = n.hit ? 24 : reducedMotion ? 20 : 16 + Math.sin(now * 8) * 10; }
      noteBlock(x, yb - headH, w, headH, col, rad);
      ctx.shadowBlur = 0;
      if (n === nu && focus.midi !== null && !n.hit){ // pulsing outline around the expected note
        const gp = (4 + 2 * pulse(now, 6) + (reducedMotion ? 0 : 6 * focus.nudge)) * U; // reduced motion: the nudge brightens, the outline does not grow
        rrect(x - gp, yb - headH - gp, w + gp * 2, headH + gp * 2, rad + gp); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3 * U; ctx.stroke();
      }
      if (o.labels !== 'none' && headH > 26 * U && !n.hit){
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
  ctx.fillStyle = TH.reward; ctx.shadowColor = TH.reward; ctx.shadowBlur = 12; ctx.fillRect(0, hitY - 3 * U, W, 6 * U); ctx.shadowBlur = 0;
  drawKeyboard(now);
  for (let i = fx.parts.length - 1; i >= 0; i--){ const p = fx.parts[i]; p.age += dt; if (p.age > p.life){ fx.parts.splice(i, 1); continue; }
    ctx.globalAlpha = 1 - p.age / p.life;
    if (p.kind === 'glow'){ drawn.glows++; const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r); g.addColorStop(0, p.c); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); continue; }
    drawn.particles++;
    if (p.kind === 'ring'){ ctx.strokeStyle = p.c; ctx.lineWidth = 4 * U; ctx.beginPath(); ctx.arc(p.x, p.y, p.r + (p.age / p.life) * 70 * U, 0, 7); ctx.stroke(); continue; }
    if (p.kind === 'bubbles') p.vy -= 200 * dt * U; else p.vy += 420 * dt * U;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.kind === 'squares'){ ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.round(p.r), Math.round(p.r)); }
    else if (p.kind === 'bubbles'){ ctx.strokeStyle = p.c; ctx.lineWidth = 2 * U; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.4, 0, 7); ctx.stroke(); }
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
  const nowMs = performance.now(), o = opts(), kr = Math.min(TH.radius, 12) * U;
  ctx.fillStyle = KEY_COLORS[THK].bed; ctx.fillRect(0, kbTop, W, kbH);
  let hint = null; const fk = focus.key, fp = focus.waiting ? 1 : 0;
  if (o.hint && G && state === 'playing'){ const n = nextUnhit(); if (n && n.t - G.time < G.beat * 1.2) hint = keyFor(n.midi); }
  const drawKey = m => {
    const sd = decay(fx.soft[m], SOFT_MS);
    const k = keys[m], h = k.black ? Math.round(kbH * 0.58) : kbH - 8 * U, x = Math.round(k.x + (k.black ? 0 : 2) + wobble(sd)), w = Math.round(k.w - (k.black ? 0 : 4));
    const fl = fx.keyFlash[m], fa = fl ? Math.max(0, 1 - (nowMs - fl.at) / 450) : 0;
    rrect(x, kbTop + 2, w, h, kr); ctx.fillStyle = keyFill(k.black, kbTop + 2, h); ctx.fill();
    ctx.save(); rrect(x, kbTop + 2, w, h, kr); ctx.clip();
    keyDecor(x, kbTop + 2, w, h, k.black, now);
    if (m === fk){ ctx.globalAlpha = Math.min(1, fp * (0.5 + 0.15 * pulse(now, 6)) + 0.4 * focus.nudge); ctx.fillStyle = PC_COLOR[focus.midi % 12]; ctx.fillRect(x, kbTop, w, h + 2); ctx.globalAlpha = 1; }
    else if (m === hint){ ctx.globalAlpha = reducedMotion ? 0.5 : 0.45 + 0.2 * Math.sin(now * 7); ctx.fillStyle = PC_COLOR[m % 12]; ctx.fillRect(x, kbTop, w, h + 2); ctx.globalAlpha = 1; }
    if (fx.heardKey[m] && nowMs - fx.heardKey[m] < 160 && !fa){ ctx.fillStyle = 'rgba(120,140,220,.4)'; ctx.fillRect(x, kbTop, w, h + 2); }
    if (fa){ ctx.globalAlpha = fa; ctx.fillStyle = fl.c; ctx.fillRect(x, kbTop, w, h + 2); ctx.globalAlpha = 1; }
    ctx.restore();
    if (m === fk){ const lw = (4 + 1.5 * pulse(now, 6) * fp + 3 * focus.nudge) * U; rrect(x + lw / 2, kbTop + 2 + lw / 2, w - lw, h - lw, kr); ctx.strokeStyle = FOCUS_EDGE; ctx.lineWidth = lw; ctx.stroke(); }
    if (sd){ ctx.globalAlpha = sd; rrect(x + 1.5 * U, kbTop + 2 + 1.5 * U, w - 3 * U, h - 3 * U, kr); ctx.strokeStyle = NEUTRAL; ctx.lineWidth = 3 * U; ctx.stroke(); ctx.globalAlpha = 1; }
    // Once the computer keyboard is used, show which letter plays each key.
    const kl = fx.kbLetters && letterFor(m);
    if (kl){ ctx.fillStyle = k.black ? 'rgba(255,255,255,.8)' : 'rgba(24,35,53,.55)'; ctx.font = '700 ' + Math.round(Math.min(18 * U, w * 0.36)) + 'px ' + LBL(); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(kl, x + w / 2, kbTop + 2 + (k.black ? h - 24 * U : 8 * U)); }
    if (!k.black){
      const cx = x + w / 2, sh = Math.round(Math.min(30 * U, h * 0.16)), sw = Math.round(w * 0.86), cy = kbTop + h - sh - 6 * U;
      rrect(cx - sw / 2, cy, sw, sh, Math.min(kr, sh / 2)); ctx.fillStyle = PC_COLOR[m % 12]; ctx.fill();
      if (o.labels !== 'none'){ ctx.fillStyle = '#182335'; ctx.font = '800 ' + Math.round(Math.min(24 * U, w * 0.24)) + 'px ' + LBL(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(noteName(m), cx, cy + sh / 2 + 1); }
    }
  };
  for (let m = LO; m <= HI; m++) if (!isBlack(m)) drawKey(m);
  for (let m = LO; m <= HI; m++) if (isBlack(m)) drawKey(m);
}
