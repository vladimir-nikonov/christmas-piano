// McLeod pitch detection (NSDF). Pure function, no DOM.

const nsdf = new Float32Array(1024);
export function detectPitch(buf, sr){
  const N = 1024, off = buf.length - N, maxLag = Math.min(Math.floor(sr / 110), N - 64);
  for (let tau = 0; tau <= maxLag; tau++){ let acf = 0, m = 0;
    for (let j = 0, n = N - tau; j < n; j++){ const a = buf[off + j], b = buf[off + j + tau]; acf += a * b; m += a * a + b * b; }
    nsdf[tau] = m > 0 ? 2 * acf / m : 0; }
  const peaks = []; let pos = false, cm = 0, ci = 0;
  for (let tau = 1; tau <= maxLag; tau++){ const v = nsdf[tau];
    if (!pos){ if (v > 0 && nsdf[tau - 1] <= 0){ pos = true; cm = v; ci = tau; } }
    else { if (v > cm){ cm = v; ci = tau; } if (v <= 0){ peaks.push(ci); pos = false; } } }
  if (pos && cm > 0 && ci < maxLag) peaks.push(ci);
  if (!peaks.length) return null;
  let gmax = 0; for (const p of peaks) gmax = Math.max(gmax, nsdf[p]);
  const p = peaks.find(q => nsdf[q] >= 0.88 * gmax);
  const y0 = nsdf[p - 1], y1 = nsdf[p], y2 = nsdf[p + 1] ?? y1, den = y0 - 2 * y1 + y2;
  return { freq: sr / (p + (den ? 0.5 * (y0 - y2) / den : 0)), clarity: y1 };
}
