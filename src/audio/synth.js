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

/* ================= Applause ================= */
// A concert hall clapping for the player: many clappers, each a short band-passed noise burst at its own pace,
// under one swell-and-fade envelope. More stars bring a bigger, longer ovation; even a game with no star gets
// a warm round. Returns a stop function that fades it out (the results screen calls it when it closes).
let noise = null;
function noiseBuf(a){
  if (!noise){ noise = a.createBuffer(1, a.sampleRate, a.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  return noise;
}
export function applause(stars){
  const a = audio(), t0 = a.currentTime + 0.05, buf = noiseBuf(a);
  const people = 8 + stars * 6, dur = 2.2 + stars * 0.8, peak = 0.26 + stars * 0.05;
  const out = a.createGain(); out.connect(master());
  out.gain.setValueAtTime(0.0001, t0); out.gain.exponentialRampToValueAtTime(peak, t0 + 0.5);
  out.gain.setValueAtTime(peak, t0 + dur - 1.4); out.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  for (let p = 0; p < people; p++){
    // Each clapper has their own hands (pitch, brightness) and pace, starts a little late and stops a little early
    const f = 700 + Math.random() * 1800, rate = 3.2 + Math.random() * 2, vol = 0.5 + Math.random() * 0.5;
    const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 0.9; bp.connect(out);
    let t = t0 + Math.random() * 0.35;
    const stop = t0 + dur - Math.random() * 0.8;
    while (t < stop){
      const s = a.createBufferSource(), g = a.createGain();
      s.buffer = buf; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.035 + Math.random() * 0.02);
      s.connect(g); g.connect(bp); s.start(t, Math.random() * 0.9, 0.07);
      t += (1 + (Math.random() - 0.5) * 0.25) / rate;
    }
  }
  return () => { const t = a.currentTime; if (out.gain.cancelAndHoldAtTime) out.gain.cancelAndHoldAtTime(t); else { out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(out.gain.value, t); } out.gain.linearRampToValueAtTime(0, t + 0.25); setTimeout(() => out.disconnect(), 400); };
}
