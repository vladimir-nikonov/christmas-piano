// Canvas drawing: falling notes, keyboard, effects, count-in.

import { PC_COLOR } from '../core/music.js';
import { opts } from '../data/storage.js';
import { state, G, fx, flakes, nextUnhit, keyFor } from '../game/game.js';
import { ctx, W, H, DPR, U, LO, HI, isBlack, keys, kbTop, kbH, hitY, topY, bgCache, setBgCache } from './canvas.js';
import { ICON } from './icons.js';
import { noteName } from './labels.js';
import { TH } from './theme.js';

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
function noteBlock(x, y, w, h, col, radius){
  rrect(x, y, w, h, radius); ctx.fillStyle = col; ctx.fill();
  ctx.save(); ctx.clip();
  if (TH.radius <= 3){ const b = 4 * U; ctx.fillStyle = 'rgba(255,255,255,.32)'; ctx.fillRect(x, y, w, b); ctx.fillRect(x, y, b, h); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x, y + h - b, w, b); ctx.fillRect(x + w - b, y, b, h); }
  else { ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(x, y, w, Math.min(h * 0.38, 18 * U)); }
  ctx.restore();
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
export function draw(now, dt){
  ctx.drawImage(background(), 0, 0, W, H);
  if (TH.decor !== 'glow'){ ctx.fillStyle = 'rgba(255,255,255,.45)';
    for (const f of flakes){ f.y += f.s * dt * 3; if (f.y > 1) f.y = 0; const x = (f.x + Math.sin(now * 0.4 + f.d) * 0.01) * W, y = f.y * kbTop, r = f.r * U * 1.4;
      if (TH.decor === 'dots') ctx.fillRect(Math.round(x), Math.round(y), Math.round(r * 2), Math.round(r * 2)); else { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); } } }
  const o = opts(), pps = G ? (hitY - topY) / G.look : 1, rad = Math.min(TH.radius, 16) * U;
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, hitY + 2); ctx.clip();
  if (G && (state === 'playing' || state === 'demo' || state === 'results')){
    const nu = G.wait ? nextUnhit() : null;
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
      if (yb - yt > headH + 2){ const tw = Math.round(16 * U * 1.1); ctx.globalAlpha *= n.hit ? 0.95 : 0.55; rrect(x + (w - tw) / 2, yt, tw, yb - yt - headH + 6, TH.radius > 3 ? tw / 2 : 0); ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = n.missed ? 0.45 : 1; }
      if (n.hit || n === nu){ ctx.shadowColor = col; ctx.shadowBlur = n.hit ? 24 : 16 + Math.sin(now * 8) * 10; }
      noteBlock(x, yb - headH, w, headH, col, rad);
      ctx.shadowBlur = 0;
      if (o.labels !== 'none' && headH > 26 * U && !n.hit){
        ctx.fillStyle = 'rgba(18,24,46,.92)'; ctx.font = '800 ' + Math.round(Math.min(30 * U, w * 0.3)) + 'px ' + LBL();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(noteName(n.midi), x + w / 2, yb - headH / 2 + 1);
      }
      ctx.globalAlpha = 1;
    }
    if (state === 'playing' && G.wait && G.waiting && nu){
      const k = keys[keyFor(nu.midi)];
      drawIcon('arrow-down', TH.reward, k.x + k.w / 2, hitY - 56 * U - 50 * U - Math.abs(Math.sin(now * 5)) * 16 * U, 56 * U);
    }
  }
  ctx.restore();
  ctx.fillStyle = TH.reward; ctx.shadowColor = TH.reward; ctx.shadowBlur = 12; ctx.fillRect(0, hitY - 3 * U, W, 6 * U); ctx.shadowBlur = 0;
  drawKeyboard(now);
  for (let i = fx.parts.length - 1; i >= 0; i--){ const p = fx.parts[i]; p.age += dt; if (p.age > p.life){ fx.parts.splice(i, 1); continue; }
    ctx.globalAlpha = 1 - p.age / p.life;
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
    const sc = p.age < 0.12 ? p.age / 0.12 * 1.2 : 1; ctx.globalAlpha = 1 - Math.max(0, p.age - 0.4) / 0.4;
    drawIcon(p.icon, p.c, p.x, p.y - p.age * 40 * U, p.size * sc, p.fill); }
  ctx.globalAlpha = 1;
  if (G && (state === 'playing' || state === 'demo') && G.time < 0){
    const c = Math.ceil(-G.time / G.beat);
    if (c <= 4){ const fs = Math.round(Math.min(170 * U, H * 0.22)); ctx.font = '900 ' + fs + 'px ' + LBL(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = TH.accentDark; ctx.fillText(c, W / 2, hitY * 0.5 + 6 * U); ctx.fillStyle = TH.text; ctx.fillText(c, W / 2, hitY * 0.5); }
  }
}
function drawKeyboard(now){
  const nowMs = performance.now(), o = opts(), kr = Math.min(TH.radius, 12) * U;
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, kbTop, W, kbH);
  let hint = null;
  if (o.hint && G && state === 'playing'){ const n = nextUnhit(); if (n && n.t - G.time < G.beat * 1.2) hint = keyFor(n.midi); }
  const drawKey = m => {
    const k = keys[m], h = k.black ? Math.round(kbH * 0.58) : kbH - 8 * U, x = Math.round(k.x + (k.black ? 0 : 2)), w = Math.round(k.w - (k.black ? 0 : 4));
    const fl = fx.keyFlash[m], fa = fl ? Math.max(0, 1 - (nowMs - fl.at) / 450) : 0;
    rrect(x, kbTop + 2, w, h, kr); ctx.fillStyle = k.black ? '#202435' : '#F5F5FA'; ctx.fill();
    ctx.save(); rrect(x, kbTop + 2, w, h, kr); ctx.clip();
    if (TH.radius <= 3){ ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x, kbTop + h - 6 * U, w, 6 * U); }
    if (m === hint){ ctx.globalAlpha = 0.45 + 0.2 * Math.sin(now * 7); ctx.fillStyle = PC_COLOR[m % 12]; ctx.fillRect(x, kbTop, w, h + 2); ctx.globalAlpha = 1; }
    if (fx.heardKey[m] && nowMs - fx.heardKey[m] < 160 && !fa){ ctx.fillStyle = 'rgba(120,140,220,.4)'; ctx.fillRect(x, kbTop, w, h + 2); }
    if (fa){ ctx.globalAlpha = fa; ctx.fillStyle = fl.c; ctx.fillRect(x, kbTop, w, h + 2); ctx.globalAlpha = 1; }
    ctx.restore();
    if (!k.black){
      const cx = x + w / 2, sh = Math.round(Math.min(30 * U, h * 0.16)), sw = Math.round(w * 0.86), cy = kbTop + h - sh - 6 * U;
      rrect(cx - sw / 2, cy, sw, sh, Math.min(kr, sh / 2)); ctx.fillStyle = PC_COLOR[m % 12]; ctx.fill();
      if (o.labels !== 'none'){ ctx.fillStyle = '#182335'; ctx.font = '800 ' + Math.round(Math.min(24 * U, w * 0.24)) + 'px ' + LBL(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(noteName(m), cx, cy + sh / 2 + 1); }
    }
  };
  for (let m = LO; m <= HI; m++) if (!isBlack(m)) drawKey(m);
  for (let m = LO; m <= HI; m++) if (isBlack(m)) drawKey(m);
}
