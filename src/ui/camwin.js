// Self-view window: the player sees themself from the front camera in a small window that can be
// dragged anywhere on the screen. Tap the window to change its size, the cross to close it.
// State lives in device.cam = { on, x, y, size }; x and y are fractions of the free space, so the
// window stays on screen after a rotation. The quick .qcam buttons (home, game HUD) turn it on and off.

import { dev, save } from '../data/storage.js';
import { $ } from '../dom.js';
import { tx } from '../i18n/index.js';
import { startCamera, stopCamera, onCamChange } from '../input/camera.js';
import { icon } from './icons.js';

const SIZES = [200, 300, 420];           // window width in design units; the picture is 4:3
const TAP_PX = 8;                        // a pointer that moved less than this is a tap, not a drag
const win = $('#cam'), video = $('#camVideo'), msg = $('#camMsg');
let error = null;

const cfg = () => {
  const d = dev();
  if (!d.cam || typeof d.cam !== 'object') d.cam = {};
  const c = d.cam;
  c.on = !!c.on;
  c.x = Number.isFinite(+c.x) ? Math.min(1, Math.max(0, +c.x)) : 1;
  c.y = Number.isFinite(+c.y) ? Math.min(1, Math.max(0, +c.y)) : 0.14;
  c.size = [0, 1, 2].includes(c.size) ? c.size : 0;
  return c;
};
const unit = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--u')) || 1;
function place(){
  const c = cfg(), u = unit(), w = SIZES[c.size] * u, h = w * 3 / 4;
  win.style.width = w + 'px'; win.style.height = h + 'px';
  win.style.left = Math.round(c.x * Math.max(0, innerWidth - w)) + 'px';
  win.style.top = Math.round(c.y * Math.max(0, innerHeight - h)) + 'px';
}
function render(){
  const c = cfg();
  win.hidden = !c.on;
  msg.hidden = !error; video.hidden = !!error;
  if (error) msg.textContent = tx({ denied:'camDenied', missing:'camMissing', busy:'camBusy' }[error] || 'camOther');
  document.querySelectorAll('.qcam').forEach(b => {
    b.dataset.ta = c.on ? 'camOff' : 'camOn';
    b.setAttribute('aria-label', tx(b.dataset.ta)); b.title = tx(b.dataset.ta);
    b.setAttribute('aria-pressed', c.on);
    if (!b.firstChild) b.innerHTML = icon('camera');
  });
  if (c.on) place();
}
async function open(){
  error = null; render();
  const r = await startCamera();
  if (!cfg().on) return;                  // closed while waiting for the permission prompt
  if (!r.ok){ error = r.kind; render(); }
}
export function setCamera(on){
  cfg().on = !!on; save();
  if (on) open(); else { stopCamera(); error = null; }
  render();
}
onCamChange(s => { video.srcObject = s; if (s) video.play().catch(() => {}); });

/* Drag to move, tap to resize */
let drag = null;
win.addEventListener('pointerdown', e => {
  if (e.target.closest('button')) return;
  e.preventDefault(); e.stopPropagation();
  const r = win.getBoundingClientRect();
  drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, moved: false };
  try { win.setPointerCapture(e.pointerId); } catch(err){ /* synthetic pointer */ }
  win.classList.add('drag');
});
win.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.id) return;
  if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < TAP_PX) return;
  drag.moved = true;
  const w = win.offsetWidth, h = win.offsetHeight, fw = Math.max(1, innerWidth - w), fh = Math.max(1, innerHeight - h);
  const c = cfg();
  c.x = Math.min(1, Math.max(0, (e.clientX - drag.dx) / fw));
  c.y = Math.min(1, Math.max(0, (e.clientY - drag.dy) / fh));
  place();
});
function endDrag(e){
  if (!drag || e.pointerId !== drag.id) return;
  const tap = !drag.moved && e.type === 'pointerup'; drag = null; win.classList.remove('drag');
  const c = cfg();
  if (tap){
    if (error){ open(); return; }        // tap on the error message tries again
    // Grow or shrink around the window's centre, so a tap does not throw it to another corner.
    const r = win.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    c.size = (c.size + 1) % SIZES.length;
    const w = SIZES[c.size] * unit(), h = w * 3 / 4;
    c.x = Math.min(1, Math.max(0, (cx - w / 2) / Math.max(1, innerWidth - w)));
    c.y = Math.min(1, Math.max(0, (cy - h / 2) / Math.max(1, innerHeight - h)));
    place();
  }
  save();
}
win.addEventListener('pointerup', endDrag);
win.addEventListener('pointercancel', endDrag);
$('#btnCamClose').onclick = () => setCamera(false);
document.addEventListener('click', e => { if (e.target.closest('.qcam')) setCamera(!cfg().on); });
addEventListener('resize', () => { if (cfg().on) place(); });
if (window.visualViewport) visualViewport.addEventListener('resize', () => { if (cfg().on) place(); });
// Language changes re-label the buttons and the message.
export const updateCamera = render;
// After the saved data loads: show the window again if it was on, without a prompt where the camera is already allowed.
export function restoreCamera(){
  if (!cfg().on){ render(); return; }
  render();
  (async () => {
    try {
      if (navigator.permissions && navigator.permissions.query){
        const st = await navigator.permissions.query({ name:'camera' });
        if (st.state !== 'granted'){ cfg().on = false; render(); return; }
      }
    } catch(e){ /* camera is not a known permission name here: just try */ }
    open();
  })();
}
