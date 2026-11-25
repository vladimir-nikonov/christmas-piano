// Video-card recorder: films the game canvas, the camera window where it sits on screen, the app's sounds and
// the microphone (a real piano), and ends the film with a card showing the stars and the score.
// One card is kept in memory until it is saved, deleted or replaced by the next recording.
//
// Start: arm() on home records the next game from its count-in; start() records right away (HUD button).
// Stop: on its own after the end card when the game is over, when the player leaves the game, or stop().
// While the game is paused the recording pauses too, so the film has no frozen stretch.

import { audio, master } from '../audio/synth.js';
import { flow, S } from '../core/flow.js';
import { $ } from '../dom.js';
import { tx } from '../i18n/index.js';
import { micNode } from '../input/mic.js';
import { cv } from '../ui/canvas.js';

const TYPES = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
const MAX_W = 1280, FPS = 30, END_MS = 3000;
const IN_GAME = [S.COUNTDOWN, S.PLAYING, S.WAITING, S.PAUSED];

export const supported = () => !!(window.MediaRecorder && HTMLCanvasElement.prototype.captureStream && window.MediaStream);
const pickType = () => TYPES.find(t => { try { return MediaRecorder.isTypeSupported(t); } catch(e){ return false; } }) || '';

let rec = null, armed = false, card = null;
const listeners = new Set();
// cb() runs whenever recording starts or stops, the arm flag changes or a card is ready or deleted.
export function onRecChange(cb){ listeners.add(cb); return () => listeners.delete(cb); }
const emit = () => listeners.forEach(cb => { try { cb(); } catch(e){ console.error(e); } });

export const isRecording = () => !!rec;
export const isArmed = () => armed;
// The last finished card: { blob, url, type, ext, at, name } or null.
export const getCard = () => card;

export function arm(on){ armed = !!on && supported(); emit(); }

// Starts filming now. Returns false where the browser cannot record.
export function start(){
  if (rec || !supported()) return false;
  armed = false;
  const ow = Math.min(MAX_W, innerWidth), w = Math.max(2, Math.round(ow / 2) * 2), h = Math.max(2, Math.round(ow * innerHeight / innerWidth / 2) * 2);
  const out = document.createElement('canvas'); out.width = w; out.height = h;
  const ctx = out.getContext('2d');
  const a = audio(), dest = a.createMediaStreamDestination();
  master().connect(dest);
  const mic = micNode(); if (mic) mic.connect(dest);
  const tracks = [...out.captureStream(FPS).getVideoTracks(), ...dest.stream.getAudioTracks()];
  const type = pickType();
  let mr;
  try { mr = new MediaRecorder(new MediaStream(tracks), type ? { mimeType: type, videoBitsPerSecond: 2500000 } : undefined); }
  catch(e){ tracks.forEach(t => t.stop()); try { master().disconnect(dest); } catch(err){ /* already gone */ } return false; }
  const css = getComputedStyle(document.documentElement);
  rec = { mr, out, ctx, dest, mic, tracks, chunks: [], raf: 0, endAt: 0, summary: null, w, h,
          theme: { reward: css.getPropertyValue('--reward').trim() || '#FFD35C', text: css.getPropertyValue('--text').trim() || '#fff',
                   border: css.getPropertyValue('--border').trim() || '#405775', font: css.getPropertyValue('--font-ui').trim() || 'sans-serif' } };
  const r = rec;
  mr.ondataavailable = e => { if (e.data && e.data.size) r.chunks.push(e.data); };
  mr.onstop = () => finishCard(r);
  mr.start(1000);
  paint(); emit();
  return true;
}
// Stops filming; the card becomes available a moment later (onRecChange fires).
export function stop(){
  const r = rec; if (!r) return;
  rec = null; cancelAnimationFrame(r.raf);
  try { if (r.mr.state !== 'inactive') r.mr.stop(); else finishCard(r); } catch(e){ finishCard(r); }
  emit();
}
// The game passes its result here when it ends; the end card shows it.
export function noteResult(summary){ if (rec) rec.summary = summary; }

export function deleteCard(){ if (card){ try { URL.revokeObjectURL(card.url); } catch(e){ /* ignore */ } card = null; emit(); } }

function finishCard(r){
  r.tracks.forEach(t => t.stop());
  try { master().disconnect(r.dest); } catch(e){ /* already gone */ }
  if (r.mic) try { r.mic.disconnect(r.dest); } catch(e){ /* already gone */ }
  if (!r.chunks.length) { emit(); return; }
  const type = (r.mr.mimeType || r.chunks[0].type || 'video/webm').split(';')[0];
  deleteCard();
  const blob = new Blob(r.chunks, { type });
  card = { blob, url: URL.createObjectURL(blob), type, ext: type.includes('mp4') ? 'mp4' : 'webm', at: Date.now(), name: r.summary ? r.summary.name : '' };
  emit();
}

/* Follow the game: pause with it, stop when the player leaves, keep the end card on screen for a while. */
flow.subscribe(s => {
  if (armed && s.name === S.COUNTDOWN && s.data.kind === 'start' && !s.data.entering) start();
  if (!rec) return;
  const mr = rec.mr;
  if (s.name === S.PAUSED){ if (mr.state === 'recording') try { mr.pause(); } catch(e){ /* ignore */ } return; }
  if (mr.state === 'paused') try { mr.resume(); } catch(e){ /* ignore */ }
  if (s.name === S.RESULTS || s.name === S.LEVEL_UP){ if (!rec.endAt) rec.endAt = performance.now(); return; }
  if (!IN_GAME.includes(s.name)) stop();
});

/* Drawing: one frame of the film */
function paint(){
  const r = rec; if (!r) return;
  r.raf = requestAnimationFrame(paint);
  const { ctx, w, h } = r, sx = w / innerWidth, sy = h / innerHeight;
  ctx.drawImage(cv, 0, 0, w, h);
  const win = $('#cam'), v = $('#camVideo');
  if (win && !win.hidden && v && !v.hidden && v.videoWidth){
    const b = win.getBoundingClientRect(), x = b.left * sx, y = b.top * sy, cw = b.width * sx, ch = b.height * sy;
    const k = Math.max(cw / v.videoWidth, ch / v.videoHeight), vw = cw / k, vh = ch / k; // object-fit: cover
    ctx.save();
    roundRect(ctx, x, y, cw, ch, Math.min(cw, ch) * 0.06); ctx.clip();
    ctx.translate(x + cw, y); ctx.scale(-1, 1);                                              // mirrored, as on screen
    ctx.drawImage(v, (v.videoWidth - vw) / 2, (v.videoHeight - vh) / 2, vw, vh, 0, 0, cw, ch);
    ctx.restore();
    ctx.save(); roundRect(ctx, x, y, cw, ch, Math.min(cw, ch) * 0.06); ctx.lineWidth = Math.max(2, 4 * sx); ctx.strokeStyle = r.theme.border; ctx.stroke(); ctx.restore();
  }
  if (r.endAt){
    const t = performance.now() - r.endAt;
    endCard(r, Math.min(1, t / 400));
    if (t > END_MS) stop();
  }
}
function roundRect(ctx, x, y, w, h, rad){
  ctx.beginPath(); ctx.moveTo(x + rad, y); ctx.arcTo(x + w, y, x + w, y + h, rad); ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad); ctx.arcTo(x, y, x + w, y, rad); ctx.closePath();
}
function star(ctx, cx, cy, R){
  ctx.beginPath();
  for (let i = 0; i < 10; i++){ const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? R * 0.45 : R; ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
  ctx.closePath();
}
function endCard(r, k){
  const { ctx, w, h, theme } = r, s = r.summary || {}, u = Math.min(w / 1280, h / 800);
  ctx.save();
  ctx.globalAlpha = k;
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const stars = Math.max(0, Math.min(3, s.stars || 0)), R = 54 * u;
  for (let i = 0; i < 3; i++){
    star(ctx, w / 2 + (i - 1) * R * 2.4, h * 0.27, R);
    ctx.fillStyle = i < stars ? theme.reward : 'rgba(255,255,255,.18)'; ctx.fill();
    ctx.lineWidth = 3 * u; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.stroke();
  }
  ctx.fillStyle = theme.reward; ctx.font = '900 ' + Math.round(110 * u) + 'px ' + theme.font;
  if (s.metric != null) ctx.fillText(s.metric + '%', w / 2, h * 0.44);
  ctx.fillStyle = theme.text; ctx.font = '800 ' + Math.round(40 * u) + 'px ' + theme.font;
  ctx.fillText([s.name, s.song].filter(Boolean).join(' · '), w / 2, h * 0.57);
  ctx.globalAlpha = k * 0.8; ctx.font = '700 ' + Math.round(28 * u) + 'px ' + theme.font;
  ctx.fillText(tx('title'), w / 2, h * 0.65);
  ctx.restore();
}

// File name for saving: snezhnye-noty-<player>-2026-11-25-1830.mp4
export function cardFileName(c = card){
  if (!c) return '';
  const d = new Date(c.at), pad = n => String(n).padStart(2, '0');
  const who = (c.name || '').trim().replace(/[\\/:*?"<>|\s]+/g, '-').slice(0, 20);
  return 'snezhnye-noty-' + (who ? who + '-' : '') + d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + '.' + c.ext;
}
