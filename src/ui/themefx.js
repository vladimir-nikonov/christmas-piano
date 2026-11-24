// Theme flavour for the shared transitions: level entry, unlock, reward flight, profile expand, next level, replay.
// One mechanic for every theme; the per-theme differences come only from THEME_MOTION (theme-data.js).
// Everything runs on the Web Animations API in pointer-events:none layers, so nothing blocks a tap,
// and every effect ends within its transition (no decoration stays over the notes or the hit line).
// Reduced motion: a quick fade only, no particles, rings or movement.

import { THEME_MOTION } from './theme-data.js';
import { THK } from './theme.js';
import { px } from './canvas.js';
import { icon } from './icons.js';

export const calm = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
export const motion = () => THEME_MOTION[THK] || THEME_MOTION.pixel;
const anim = (el, frames, opts) => (el && el.animate ? el.animate(frames, opts) : null);

// A full-screen layer for effects; pass a parent to keep it inside a screen (the results reward layer).
export function fxLayer(parent){
  const l = document.createElement('div'); l.className = 'tfx'; (parent || document.body).appendChild(l); return l;
}
export function dropLayer(l){ if (!l) return; l.getAnimations({ subtree: true }).forEach(a => a.cancel()); l.remove(); }

// Theme particles burst from (x, y). delay/life in ms; scale shrinks them for small targets.
export function particles(layer, x, y, { delay = 0, life, n, scale = 1 } = {}){
  if (calm() || !layer) return [];
  const p = motion().part, out = [], cnt = n || p.n, dur = life || p.life;
  for (let i = 0; i < cnt; i++){
    const el = document.createElement('i'); el.className = 'tp tp-' + p.kind + (i % 3 === 2 ? ' alt' : '');
    if (p.kind === 'puff') el.innerHTML = icon('star', { fill: true });
    const s = px((p.kind === 'pixel' ? 10 : p.kind === 'puff' ? 24 : p.kind === 'lantern' ? 18 : 16) * (0.7 + 0.6 * ((i * 7) % 5) / 4) * scale);
    el.style.cssText = 'width:' + s + 'px;height:' + s + 'px;left:' + (x - s / 2) + 'px;top:' + (y - s / 2) + 'px';
    layer.appendChild(el);
    const a = (i / cnt) * Math.PI * 2 + (i % 2 ? 0.3 : -0.2), d = px(p.spread * scale) * (0.55 + 0.45 * ((i * 5) % 4) / 3);
    const dx = Math.cos(a) * d, dy = Math.sin(a) * d * 0.8 + px(p.rise * scale);
    out.push(anim(el, [
      { transform: 'translate(0,0) scale(.3) rotate(0deg)', opacity: 0 },
      { transform: 'translate(' + dx * 0.6 + 'px,' + dy * 0.6 + 'px) scale(1) rotate(' + p.spin * 0.5 + 'deg)', opacity: 1, offset: 0.35 },
      { transform: 'translate(' + dx + 'px,' + (dy + px(p.fall * scale)) + 'px) scale(' + p.end + ') rotate(' + p.spin + 'deg)', opacity: 0 }
    ], { duration: dur, delay, easing: p.ease, fill: 'both' }));
  }
  return out;
}
// The theme's opening shape (pixel block opening, soft puff, lit square, crystal portal) at (x, y).
export function ring(layer, x, y, { delay = 0, dur = 300, size = 150, behind = false } = {}){
  if (calm() || !layer) return null;
  const el = document.createElement('i'), s = px(size); el.className = 'tr tr-' + motion().ring;
  el.style.cssText = 'width:' + s + 'px;height:' + s + 'px;left:' + (x - s / 2) + 'px;top:' + (y - s / 2) + 'px' + (behind ? ';z-index:-1' : '');
  layer.appendChild(el);
  const m = motion(), t = m.entry.turn; // only a turning theme (the crystal portal) spins its ring
  return anim(el, [{ transform: 'scale(.2) rotate(0deg)', opacity: 0 }, { transform: 'scale(1) rotate(' + t + 'deg)', opacity: 1, offset: 0.45 }, { transform: 'scale(2) rotate(' + t * 2 + 'deg)', opacity: 0 }],
    { duration: dur, delay, easing: m.ease.startsWith('steps') ? m.ease : 'ease-out', fill: 'both' });
}

/* ---- Level entry: keyframes for the selected tile and the effects around it ---- */
export function entryTiming(){ const e = motion().entry; return calm() ? { dur: 160, easing: 'ease-in' } : { dur: e.dur, easing: e.squash ? 'cubic-bezier(.5,-0.35,.6,1)' : motion().ease.startsWith('steps') ? motion().ease : 'ease-in-out' }; }
export function entryFrames(dx, dy){
  const e = motion().entry, to = s => 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ') rotate(' + e.turn + 'deg)';
  const lit = e.light ? 'brightness(1.5) drop-shadow(0 0 ' + px(18) + 'px var(--reward))' : 'none';
  const f = [{ transform: 'none', opacity: 1, filter: 'none' }];
  if (e.squash) f.push({ transform: 'scale(1.14,.86)', opacity: 1, filter: 'none', offset: 0.18 });
  f.push({ transform: to(e.scale * 0.86), opacity: 1, filter: lit, offset: 0.7 }, { transform: to(e.scale), opacity: 0, filter: lit });
  return f;
}
// Particles leave the block as it lifts, and the theme's ring opens where it lands. Returns the layer to drop at the end.
export function entryFx(from, to, dur){
  if (calm()) return null;
  const l = fxLayer();
  particles(l, from.x, from.y, { life: dur, delay: 0 });
  ring(l, to.x, to.y, { delay: dur * 0.35, dur: dur * 0.65, size: 220 });
  return l;
}

/* ---- Level-up block: the lock leaves the theme's way and the theme's particles fly off it ---- */
export function unlockFx(blk, layer){
  const lk = blk && blk.querySelector('.lk'); if (!lk) return;
  lk.style.animationName = 'lk-' + motion().unlock;
  if (calm() || !layer) return;
  const r = blk.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  ring(layer, x, y, { delay: 120, dur: 520, size: 170, behind: true });
  particles(layer, x, y, { delay: 260, life: 460, scale: 0.8 });
}

/* ---- Reward: the fly element and its flight ---- */
export function flyContent(){
  const m = motion();
  return m.from && !calm() ? '<i class="ff">' + icon(m.from) + '</i><i class="ft">' + icon('star', { fill: true }) + '</i>' : icon('star', { fill: true });
}
export function flight(el, dx, dy, delay){
  const m = motion(), opts = { duration: 560, delay, easing: m.flight, fill: 'both' };
  // Energy into a star: the starting icon fades out while the star fades in mid-flight
  const ff = el.querySelector('.ff'), ft = el.querySelector('.ft');
  if (ff && ft){ anim(ff, [{ opacity: 1 }, { opacity: 1, offset: 0.3 }, { opacity: 0, offset: 0.6 }, { opacity: 0 }], opts); anim(ft, [{ opacity: 0 }, { opacity: 0, offset: 0.3 }, { opacity: 1, offset: 0.6 }, { opacity: 1 }], opts); }
  return anim(el, [
    { transform: 'translate(0,0) scale(.4)', opacity: 0.4 },
    { transform: 'translate(' + dx * 0.5 + 'px,' + (dy * 0.5 - 60) + 'px) scale(1.2)', opacity: 1, offset: 0.6 },
    { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(1)', opacity: 1 }
  ], opts);
}
// A small puff of theme particles where a star lands (the XP it adds).
export const landFx = (layer, x, y) => particles(layer, x, y, { n: 6, life: 300, scale: 0.55 });

/* ---- Spatial navigation ---- */
// Profiles: the list expands from the avatar button.
export function expandFrom(el, r){
  if (!el || !r || !r.width) return;
  if (calm()){ anim(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: 'ease-out' }); return; }
  el.style.transformOrigin = (r.left + r.width / 2) + 'px ' + (r.top + r.height / 2) + 'px';
  const a = anim(el, [{ transform: 'scale(.12)', opacity: 0, borderRadius: '50%' }, { transform: 'none', opacity: 1, borderRadius: '0' }], { duration: 280, easing: motion().ease.startsWith('steps') ? 'steps(6,end)' : 'cubic-bezier(.2,.8,.3,1)' });
  if (a) a.onfinish = a.oncancel = () => { el.style.transformOrigin = ''; };
}
// Next level: the game field arrives from the right (the camera moves right).
export function moveRight(els){
  const r = calm();
  els.forEach(el => anim(el, r ? [{ opacity: 0 }, { opacity: 1 }] : [{ transform: 'translateX(22vw)', opacity: 0 }, { transform: 'none', opacity: 1 }],
    { duration: r ? 150 : 320, easing: r ? 'ease-out' : motion().ease }));
}
// Replay: a short fade and the field starts again.
export function fadeReset(els){
  els.forEach(el => anim(el, [{ opacity: 0 }, { opacity: 1 }], { duration: calm() ? 150 : 220, easing: 'ease-out' }));
}
// Home: the camera zooms out, with the theme's easing.
export function zoomOutFrames(){
  return calm() ? { frames: [{ opacity: 0 }, { opacity: 1 }], dur: 150, easing: 'ease-out' }
    : { frames: [{ opacity: 0, transform: 'scale(1.06)' }, { opacity: 1, transform: 'none' }], dur: 280, easing: motion().ease };
}
