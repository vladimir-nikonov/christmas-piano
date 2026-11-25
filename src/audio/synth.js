// Sound output: Web Audio context, simple piano-like tone, metronome tick.

/* ================= Audio out ================= */
let actx = null, bus = null;
export function audio(){ if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); return actx; }
// Every sound the app makes goes through one bus, so the video-card recorder can listen to it too.
export function master(){ const a = audio(); if (!bus){ bus = a.createGain(); bus.connect(a.destination); } return bus; }
export function tone(midi, dur){
  const a = audio(), t = a.currentTime, f = 440 * Math.pow(2, (midi - 69) / 12);
  const g = a.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.28, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.08, t + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.3, dur)); g.connect(master());
  [[1,'triangle',1],[2,'sine',.25],[3,'sine',.1]].forEach(([h, type, v]) => { const o = a.createOscillator(), og = a.createGain(); o.type = type; o.frequency.value = f * h; og.gain.value = v; o.connect(og); og.connect(g); o.start(t); o.stop(t + Math.max(0.3, dur) + 0.05); });
}
export function tick(accent){
  const a = audio(), t = a.currentTime, o = a.createOscillator(), g = a.createGain();
  o.type = 'square'; o.frequency.value = accent ? 1760 : 1320; g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  o.connect(g); g.connect(master()); o.start(t); o.stop(t + 0.06);
}
