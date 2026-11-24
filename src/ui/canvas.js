// Game canvas: size, scale (U) and keyboard geometry for the design grid 1280x800.

import { $ } from '../dom.js';

/* ================= Canvas layout (design grid 1280x800) ================= */
export const cv = $('#stage'), ctx = cv.getContext('2d');
export let W = 0, H = 0, DPR = 1, U = 1;
export const LO = 60, HI = 72;
export const isBlack = m => [1,3,6,8,10].includes(m % 12);
export let keys = {}, kbTop = 0, kbH = 0, hitY = 0, topY = 0;
export function layout(){
  DPR = Math.min(window.devicePixelRatio || 1, 2.5); W = innerWidth; H = innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  U = H > W ? Math.min(W / 820, H / 1180) : Math.min(W / 1280, H / 800); U = Math.max(0.5, Math.min(1.6, U));
  kbH = Math.round(Math.min(Math.max(H * 0.25, 120), 260 * U + 40)); kbTop = H - kbH; hitY = kbTop - 8 * U; topY = 84 * U;
  const whites = []; for (let m = LO; m <= HI; m++) if (!isBlack(m)) whites.push(m);
  const pad = Math.max(10, W * 0.025), kw = (W - pad * 2) / whites.length;
  keys = {}; whites.forEach((m, i) => keys[m] = { x: pad + i * kw, w: kw, black:false });
  for (let m = LO; m <= HI; m++) if (isBlack(m)){ const bw = kw * 0.58; keys[m] = { x: keys[m - 1].x + kw - bw / 2, w: bw, black:true }; }
  invalidateBg();
}
export const px = n => Math.round(n * U);
// Cached static background: rebuilt after a resize, a theme change or once web fonts load.
export let bgCache = null;
export function setBgCache(v){ bgCache = v; }
export function invalidateBg(){ bgCache = null; }
