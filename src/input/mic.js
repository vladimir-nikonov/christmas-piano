// Microphone input: level meter, onset tracking, note detection.

import { audio } from '../audio/synth.js';
import { detectPitch } from '../core/pitch.js';
import { dev } from '../data/storage.js';
import { $ } from '../dom.js';
import { noteName } from '../ui/labels.js';

/* ================= Microphone: McLeod pitch + onset tracking ================= */
let mic = null, noiseFloor = 0.004, micPending = null;
// Why the microphone could not start: 'denied' (permission), 'missing' (no device), 'busy' (used by another app) or 'other'.
function micErrorKind(e){
  const n = e && e.name;
  if (n === 'NotAllowedError' || n === 'PermissionDeniedError' || n === 'SecurityError') return 'denied';
  if (n === 'NotFoundError' || n === 'DevicesNotFoundError' || n === 'OverconstrainedError') return 'missing';
  if (n === 'NotReadableError' || n === 'TrackStartError' || n === 'AbortError') return 'busy';
  return 'other';
}
// Resolves to { ok:true } or { ok:false, kind }. Never rejects. Concurrent calls share one request.
export function startMic(){
  if (mic) return Promise.resolve({ ok:true });
  if (micPending) return micPending;
  const req = (async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return { ok:false, kind:'other' };
      const stream = await navigator.mediaDevices.getUserMedia({ audio:{ echoCancellation:false, noiseSuppression:false, autoGainControl:false } });
      const a = audio(), src = a.createMediaStreamSource(stream), analyser = a.createAnalyser();
      analyser.fftSize = 2048; analyser.smoothingTimeConstant = 0; src.connect(analyser);
      mic = { analyser, buf: new Float32Array(2048), sr: a.sampleRate, calib: [], calibUntil: performance.now() + 700 };
      return { ok:true };
    } catch(e){ return { ok:false, kind: micErrorKind(e) }; }
  })();
  micPending = req; req.then(() => { if (micPending === req) micPending = null; });
  return req;
}
// Calls cb(state) with the microphone permission ('granted' | 'denied' | 'prompt') now and on every change,
// where the Permissions API knows it. Does nothing otherwise.
export async function watchMicPermission(cb){
  try {
    if (!navigator.permissions || !navigator.permissions.query) return;
    const st = await navigator.permissions.query({ name:'microphone' });
    cb(st.state);
    st.addEventListener('change', () => cb(st.state));
  } catch(e){ /* microphone is not a known permission name in this browser */ }
}
const trk = { held:null, cand:null, candN:0, candAt:0, attackAt:-1, lastEmit:0, hist:[] };
let micBarsLvl = -1;
// Calls emit(midi, atMs, 'mic') for every new note it hears.
export function micFrame(nowMs, emit){
  if (!mic) return;
  const { analyser, buf } = mic; analyser.getFloatTimeDomainData(buf);
  let s = 0; for (let i = buf.length - 1024; i < buf.length; i++) s += buf[i] * buf[i];
  const rms = Math.sqrt(s / 1024);
  const lv = Math.min(4, Math.floor(rms * 60)); if (lv !== micBarsLvl){ micBarsLvl = lv; document.querySelectorAll('#micbars i').forEach((b, i) => { b.className = i < lv ? 'on' : ''; b.style.height = (25 + i * 25) + '%'; }); }
  if (nowMs < mic.calibUntil){ mic.calib.push(rms); return; }
  if (mic.calib.length){ const c = mic.calib.sort((a, b) => a - b); noiseFloor = Math.max(0.002, c[Math.floor(c.length / 2)]); mic.calib = []; }
  const sensMul = 1 + (10 - dev().sens) * 0.7;
  const floor = Math.max(noiseFloor * 1.1 * sensMul, 0.003 * sensMul);
  const hist = trk.hist; hist.push(rms); if (hist.length > 9) hist.shift();
  if (rms < floor){ trk.held = null; trk.cand = null; trk.candN = 0; showHeard(null); return; }
  let mn = Infinity; for (let i = 0; i < hist.length - 1; i++) mn = Math.min(mn, hist[i]);
  if (hist.length > 3 && rms > mn * 1.45 && rms - mn > floor * 0.5 && nowMs - trk.lastEmit > 120 && trk.attackAt < 0) trk.attackAt = nowMs;
  if (trk.attackAt > 0 && nowMs - trk.attackAt > 220) trk.attackAt = -1;
  const r = detectPitch(buf, mic.sr);
  if (!r || r.clarity < 0.8 || r.freq < 100 || r.freq > 2200) return;
  const mf = 69 + 12 * Math.log2(r.freq / 440), m = Math.round(mf);
  if (Math.abs(mf - m) > 0.42) return;
  if (m === trk.cand) trk.candN++; else { trk.cand = m; trk.candN = 1; trk.candAt = nowMs; }
  if (trk.candN >= 2){
    showHeard(m);
    if ((m !== trk.held || trk.attackAt > 0) && nowMs - trk.lastEmit > 110){
      const at = trk.attackAt > 0 ? Math.min(trk.attackAt, trk.candAt) : trk.candAt;
      trk.held = m; trk.attackAt = -1; trk.lastEmit = nowMs; emit(m, at, 'mic');
    }
  }
}
let heardShown = null;
function showHeard(m){ if (m === heardShown) return; heardShown = m; $('#heard').textContent = m == null ? '—' : noteName(m); }
export function resetHeard(){ heardShown = undefined; }
