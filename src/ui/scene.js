// Themed scenery behind the falling notes: a static scene (painted once into the background cache),
// light ambient motion drawn every frame, and the hit line.
//   pixel   = pixel night sky, moon, stepped mountains; twinkling pixel stars and a shooting star
//   plastic = soft toy-room clouds and polka dots; rising bubbles and floating music notes
//   winter  = northern lights, snowy hills with fir trees; falling snow in two depths, shimmering aurora
//   anime   = big moon with a halo, star field, far mountains; falling sakura petals and sparkles

const rnd = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------- static scenes ---------- */
// x: 2D context of the cache canvas; play area is 0..hitY
export function paintScene(x, k, T, W, H, hitY, U){
  const sky = x.createLinearGradient(0, 0, 0, hitY);
  if (k === 'pixel'){
    // banded sky, like a dithered pixel gradient
    const bands = ['#0b1224', '#0f1830', T.bg, '#172442', '#1c2b4d'], bh = hitY / bands.length;
    bands.forEach((c, i) => { x.fillStyle = c; x.fillRect(0, Math.floor(i * bh), W, Math.ceil(bh) + 1); });
    const p = Math.max(3, Math.round(5 * U));
    // pixel moon
    const mx = Math.round(W * 0.82 / p) * p, my = Math.round(hitY * 0.18 / p) * p, R = 6;
    for (let gy = -R; gy <= R; gy++) for (let gx = -R; gx <= R; gx++){ const d = gx * gx + gy * gy; if (d > R * R) continue;
      x.fillStyle = d > (R - 1.2) * (R - 1.2) ? '#d9d3a8' : ((gx + 2) * (gx + 2) + (gy - 1) * (gy - 1) < 4 || (gx - 2) * (gx - 2) + (gy + 3) * (gy + 3) < 2) ? '#e3dcb0' : '#fff6cf';
      x.fillRect(mx + gx * p, my + gy * p, p, p); }
    // stepped mountains in two layers
    [[T.panel, 0.62, 13], ['#1a2740', 0.78, 7]].forEach(([c, base, seed]) => { x.fillStyle = c;
      for (let px = 0; px < W; px += p * 2){ const t = px / W, h = (Math.sin(t * 9 + seed) * 0.5 + Math.sin(t * 23 + seed * 2) * 0.25 + 0.9) * hitY * 0.16;
        const top = Math.round((hitY * base + (hitY * 0.22 - h)) / p) * p; x.fillRect(px, top, p * 2, hitY - top); } });
    return;
  }
  if (k === 'plastic'){
    sky.addColorStop(0, '#2c2766'); sky.addColorStop(1, T.bg); x.fillStyle = sky; x.fillRect(0, 0, W, hitY);
    const g = x.createRadialGradient(W / 2, -hitY * 0.1, 0, W / 2, -hitY * 0.1, Math.max(W, hitY) * 0.8); g.addColorStop(0, T.border + 'aa'); g.addColorStop(1, T.bg + '00');
    x.fillStyle = g; x.fillRect(0, 0, W, hitY);
    // polka dots
    x.fillStyle = 'rgba(255,255,255,.05)'; const st = 46 * U;
    for (let yy = st / 2, r = 0; yy < hitY; yy += st, r++) for (let xx = (r % 2 ? st / 2 : 0); xx < W; xx += st){ x.beginPath(); x.arc(xx, yy, 5 * U, 0, 7); x.fill(); }
    // soft toy clouds along the bottom
    [['rgba(145,131,215,.35)', 0.80, 120], ['rgba(98,86,166,.55)', 0.90, 90]].forEach(([c, base, r0]) => { x.fillStyle = c;
      for (let cx = -r0 * U * 0.5, i = 0; cx < W + r0 * U; cx += r0 * U * 1.1, i++){ const r = r0 * U * (0.75 + 0.35 * Math.sin(i * 2.3)); x.beginPath(); x.arc(cx, hitY * base + r * 0.35, r, 0, 7); x.fill(); } });
    return;
  }
  if (k === 'winter'){
    sky.addColorStop(0, '#071c27'); sky.addColorStop(0.7, T.bg); sky.addColorStop(1, '#1d4a5a'); x.fillStyle = sky; x.fillRect(0, 0, W, hitY);
    // moon
    x.fillStyle = 'rgba(255,246,228,.12)'; x.beginPath(); x.arc(W * 0.16, hitY * 0.17, 54 * U, 0, 7); x.fill();
    x.fillStyle = '#FFF6E4'; x.beginPath(); x.arc(W * 0.16, hitY * 0.17, 30 * U, 0, 7); x.fill();
    x.fillStyle = '#071c27'; x.globalAlpha = 0.9; x.beginPath(); x.arc(W * 0.16 + 12 * U, hitY * 0.17 - 6 * U, 26 * U, 0, 7); x.fill(); x.globalAlpha = 1;
    // snowy hills with fir trees
    const hill = (base, amp, col, trees) => {
      x.fillStyle = col; x.beginPath(); x.moveTo(0, hitY);
      for (let px = 0; px <= W; px += 8){ const t = px / W; x.lineTo(px, hitY * base - (Math.sin(t * 5 + base * 9) * 0.5 + 0.5) * amp); }
      x.lineTo(W, hitY); x.closePath(); x.fill();
      // snowy ridge: a light band along the top edge only, so notes stay readable over the hill
      x.strokeStyle = 'rgba(232,246,251,.75)'; x.lineWidth = 5 * U; x.beginPath();
      for (let px = 0; px <= W; px += 8){ const t = px / W, yy = hitY * base - (Math.sin(t * 5 + base * 9) * 0.5 + 0.5) * amp + 2 * U; if (px) x.lineTo(px, yy); else x.moveTo(px, yy); }
      x.stroke();
      if (!trees) return;
      for (let i = 0; i < trees.n; i++){ const t = (i + 0.5) / trees.n + Math.sin(i * 7.1) * 0.03, px = t * W, gy = hitY * base - (Math.sin(t * 5 + base * 9) * 0.5 + 0.5) * amp, th = trees.h * U * (0.7 + 0.5 * Math.abs(Math.sin(i * 3.7)));
        x.fillStyle = trees.c; for (let j = 0; j < 3; j++){ const w = th * (0.5 - j * 0.11), yb = gy - j * th * 0.26; x.beginPath(); x.moveTo(px - w / 2, yb); x.lineTo(px + w / 2, yb); x.lineTo(px, yb - th * 0.42); x.closePath(); x.fill(); }
        x.fillStyle = 'rgba(244,251,255,.85)'; x.beginPath(); x.moveTo(px - th * 0.07, gy - th * 0.6); x.lineTo(px + th * 0.07, gy - th * 0.6); x.lineTo(px, gy - th * 0.78); x.closePath(); x.fill(); }
    };
    hill(0.80, hitY * 0.10, '#2a5c6b', { n: 9, h: 46, c: '#173f4a' });
    hill(0.93, hitY * 0.07, '#1f4d5b', { n: 6, h: 70, c: '#0f333d' });
    return;
  }
  // anime
  sky.addColorStop(0, '#0f0e26'); sky.addColorStop(0.65, T.bg); sky.addColorStop(1, '#3a2a5e'); x.fillStyle = sky; x.fillRect(0, 0, W, hitY);
  const mx = W * 0.78, my = hitY * 0.24, mr = 58 * U;
  const halo = x.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 3); halo.addColorStop(0, 'rgba(244,154,209,.35)'); halo.addColorStop(1, 'rgba(244,154,209,0)');
  x.fillStyle = halo; x.fillRect(0, 0, W, hitY);
  const moon = x.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr); moon.addColorStop(0, '#fffaff'); moon.addColorStop(1, '#f7cfe8');
  x.fillStyle = moon; x.beginPath(); x.arc(mx, my, mr, 0, 7); x.fill();
  for (let i = 0; i < 70; i++){ const sx = (Math.sin(i * 91.7) * 0.5 + 0.5) * W, sy = (Math.sin(i * 37.3) * 0.5 + 0.5) * hitY * 0.7, r = (i % 7 === 0 ? 2.2 : 1) * U;
    x.fillStyle = i % 5 === 0 ? '#FFD98D' : '#ffffff'; x.globalAlpha = 0.35 + (i % 3) * 0.2; x.beginPath(); x.arc(sx, sy, r, 0, 7); x.fill(); }
  x.globalAlpha = 1;
  [['#2a2550', 0.78, 3], ['#211d42', 0.9, 8]].forEach(([c, base, seed]) => { x.fillStyle = c; x.beginPath(); x.moveTo(0, hitY);
    for (let px = 0; px <= W; px += 10){ const t = px / W; x.lineTo(px, hitY * base - Math.abs(Math.sin(t * 6 + seed)) * hitY * 0.12); }
    x.lineTo(W, hitY); x.closePath(); x.fill(); });
}

/* ---------- ambient motion ---------- */
let amb = null, ambKey = '', shoot = null;
function init(k){
  ambKey = k; shoot = null;
  if (k === 'pixel') amb = Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random() * 0.6, ph: rnd(0, 6), sp: rnd(1.5, 4) }));
  else if (k === 'plastic') amb = Array.from({ length: 22 }, (_, i) => ({ x: Math.random(), y: Math.random(), r: rnd(6, 18), s: rnd(0.02, 0.05), ph: rnd(0, 6), note: i % 4 === 0 }));
  else if (k === 'winter') amb = Array.from({ length: 70 }, (_, i) => ({ x: Math.random(), y: Math.random(), r: i % 3 ? rnd(0.8, 1.6) : rnd(2, 3.2), s: i % 3 ? rnd(0.012, 0.025) : rnd(0.03, 0.05), d: rnd(0, 6) }));
  else amb = Array.from({ length: 26 }, () => ({ x: Math.random(), y: Math.random(), s: rnd(0.025, 0.05), rot: rnd(0, 6), vr: rnd(-2, 2), sw: rnd(0, 6), r: rnd(4, 7) }));
}
function sparkle(c, cx, cy, r){ c.beginPath(); c.moveTo(cx, cy - r); c.quadraticCurveTo(cx, cy, cx + r, cy); c.quadraticCurveTo(cx, cy, cx, cy + r); c.quadraticCurveTo(cx, cy, cx - r, cy); c.quadraticCurveTo(cx, cy, cx, cy - r); c.fill(); }
// Returns how many ambient elements were drawn (0 under reduced motion).
export function drawAmbient(c, k, T, now, dt, W, top, U){
  if (ambKey !== k) init(k);
  if (k === 'pixel'){
    const p = Math.max(3, Math.round(4 * U));
    for (const s of amb){ const tw = Math.sin(now * s.sp + s.ph); if (tw < -0.2) continue;
      c.fillStyle = tw > 0.8 ? '#ffffff' : 'rgba(255,255,255,.55)'; const x = Math.round(s.x * W / p) * p, y = Math.round(s.y * top / p) * p;
      c.fillRect(x, y, p, p); if (tw > 0.85){ c.fillRect(x - p, y, p, p); c.fillRect(x + p, y, p, p); c.fillRect(x, y - p, p, p); c.fillRect(x, y + p, p, p); } }
    if (!shoot && Math.random() < dt * 0.12) shoot = { x: rnd(0.1, 0.7) * W, y: rnd(0.05, 0.3) * top, age: 0 };
    if (shoot){ shoot.age += dt; const t = shoot.age / 0.9; if (t > 1) shoot = null; else { c.fillStyle = T.reward; for (let i = 0; i < 6; i++){ c.globalAlpha = (1 - t) * (1 - i / 6); c.fillRect(Math.round((shoot.x + t * 260 * U - i * p * 2) / p) * p, Math.round((shoot.y + t * 110 * U - i * p) / p) * p, p, p); } c.globalAlpha = 1; } }
    return amb.length;
  }
  if (k === 'plastic'){
    for (const b of amb){ b.y -= b.s * dt; if (b.y < -0.05){ b.y = 1.05; b.x = Math.random(); }
      const x = (b.x + Math.sin(now * 0.8 + b.ph) * 0.012) * W, y = b.y * top, r = b.r * U;
      if (b.note){ c.fillStyle = 'rgba(255,255,255,.28)'; c.beginPath(); c.ellipse(x, y, r * 0.7, r * 0.52, -0.4, 0, 7); c.fill(); c.fillRect(x + r * 0.5, y - r * 2, r * 0.18, r * 2); c.fillRect(x + r * 0.5, y - r * 2, r * 0.7, r * 0.3); continue; }
      c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2 * U; c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(x - r * 0.35, y - r * 0.35, r * 0.22, 0, 7); c.fill(); }
    return amb.length;
  }
  if (k === 'winter'){
    // aurora: two soft wavy bands that slowly breathe
    for (let band = 0; band < 2; band++){
      const base = top * (0.16 + band * 0.1), a = 0.10 + 0.05 * Math.sin(now * 0.5 + band);
      const g = c.createLinearGradient(0, base - 40 * U, 0, base + 50 * U); g.addColorStop(0, 'rgba(90,255,190,0)'); g.addColorStop(0.5, band ? 'rgba(120,200,255,' + a + ')' : 'rgba(90,255,190,' + a + ')'); g.addColorStop(1, 'rgba(90,255,190,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(0, base + 50 * U);
      for (let x = 0; x <= W; x += 24){ c.lineTo(x, base + Math.sin(x / W * 7 + now * 0.35 + band * 2) * 26 * U - 40 * U); }
      c.lineTo(W, base + 50 * U); c.closePath(); c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,.75)';
    for (const f of amb){ f.y += f.s * dt * 3; if (f.y > 1) f.y = 0; const x = (f.x + Math.sin(now * 0.4 + f.d) * 0.012) * W, y = f.y * top, r = f.r * U * 1.3;
      c.globalAlpha = f.r > 1.9 ? 0.9 : 0.55; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
    c.globalAlpha = 1;
    return amb.length;
  }
  // anime: sakura petals and sparkles, an occasional shooting star
  for (const p of amb){ p.y += p.s * dt; p.rot += p.vr * dt; if (p.y > 1.03){ p.y = -0.03; p.x = Math.random(); }
    const x = (p.x + Math.sin(now * 0.7 + p.sw) * 0.03) * W, y = p.y * top, r = p.r * U;
    c.save(); c.translate(x, y); c.rotate(p.rot); c.fillStyle = 'rgba(255,183,213,.8)'; c.beginPath(); c.ellipse(0, 0, r, r * 0.55, 0, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,230,242,.8)'; c.beginPath(); c.ellipse(-r * 0.3, -r * 0.1, r * 0.35, r * 0.18, 0, 0, 7); c.fill(); c.restore(); }
  c.fillStyle = '#ffffff';
  for (let i = 0; i < 8; i++){ const tw = Math.sin(now * 2.2 + i * 1.7); if (tw < 0.4) continue; c.globalAlpha = (tw - 0.4) / 0.6; sparkle(c, (Math.sin(i * 53.1) * 0.5 + 0.5) * W, (Math.sin(i * 17.9) * 0.5 + 0.5) * top * 0.6, 6 * U); }
  c.globalAlpha = 1;
  if (!shoot && Math.random() < dt * 0.1) shoot = { x: rnd(0.1, 0.6) * W, y: rnd(0.05, 0.25) * top, age: 0 };
  if (shoot){ shoot.age += dt; const t = shoot.age / 0.8; if (t > 1) shoot = null; else {
    const hx = shoot.x + t * 300 * U, hy = shoot.y + t * 120 * U, g = c.createLinearGradient(hx, hy, hx - 120 * U, hy - 48 * U);
    g.addColorStop(0, 'rgba(255,217,141,' + (1 - t) + ')'); g.addColorStop(1, 'rgba(255,217,141,0)'); c.strokeStyle = g; c.lineWidth = 3 * U;
    c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx - 120 * U, hy - 48 * U); c.stroke(); } }
  return amb.length;
}

/* ---------- hit line ---------- */
export function drawHitLine(c, k, T, now, W, y, U){
  if (k === 'pixel'){
    const b = Math.round(10 * U), g = Math.round(4 * U), h = Math.round(6 * U);
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, y - h / 2 + g / 2, W, h);
    c.fillStyle = T.reward; for (let x = 0; x < W; x += b + g) c.fillRect(x, Math.round(y - h / 2), b, h);
    return;
  }
  if (k === 'plastic'){
    const h = 9 * U; c.fillStyle = T.accentDark; c.beginPath(); c.roundRect ? c.roundRect(0, y - h / 2 + 2 * U, W, h, h / 2) : c.rect(0, y - h / 2 + 2 * U, W, h); c.fill();
    c.fillStyle = T.reward; c.beginPath(); c.roundRect ? c.roundRect(0, y - h / 2, W, h, h / 2) : c.rect(0, y - h / 2, W, h); c.fill();
    c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(0, y - h / 2 + 2 * U, W, 2 * U);
    return;
  }
  if (k === 'winter'){
    c.shadowColor = '#bff3ff'; c.shadowBlur = 10; c.fillStyle = '#e6fbff'; c.fillRect(0, y - 2.5 * U, W, 5 * U); c.shadowBlur = 0;
    c.fillStyle = T.reward; c.fillRect(0, y - 1 * U, W, 2 * U);
    c.fillStyle = 'rgba(230,251,255,.9)';
    for (let x = 6 * U, i = 0; x < W; x += 22 * U, i++){ const l = (4 + (i * 7) % 6) * U; c.beginPath(); c.moveTo(x - 2.5 * U, y + 2 * U); c.lineTo(x + 2.5 * U, y + 2 * U); c.lineTo(x, y + 2 * U + l); c.closePath(); c.fill(); }
    return;
  }
  const g = c.createLinearGradient(0, 0, W, 0), sh = (now * 0.15) % 1;
  g.addColorStop(0, T.accent); g.addColorStop(lerp(0.2, 0.8, sh), T.reward); g.addColorStop(1, T.accent);
  c.shadowColor = T.accent; c.shadowBlur = 16; c.fillStyle = g; c.fillRect(0, y - 3 * U, W, 6 * U); c.shadowBlur = 0;
  c.fillStyle = '#fff'; for (let i = 0; i < 3; i++){ const t = (now * 0.12 + i / 3) % 1; c.globalAlpha = Math.sin(t * Math.PI); sparkle(c, t * W, y, 7 * U); } c.globalAlpha = 1;
}
