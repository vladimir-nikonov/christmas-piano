// Splash screen: the current theme's mascots, shown once per launch for returning players.

import { $ } from '../dom.js';
import { SPLASH_CAST, avatarSVG } from './art.js';
import { THEMES } from './theme-data.js';

const SHOW_MS = 2600;
let shown = false;

export function showSplash(){
  if (shown) return; shown = true;
  const el = $('#splash'), th = THEMES[document.documentElement.dataset.theme] ? document.documentElement.dataset.theme : 'pixel';
  el.querySelector('.sp-cast').innerHTML = SPLASH_CAST[th].map(i => avatarSVG(i, 150, th)).join('');
  el.querySelector('.sp-sub').textContent = THEMES[th].name;
  let fx = ''; for (let i = 0; i < 18; i++) fx += '<i style="left:' + ((i * 37 + 5) % 100) + '%;animation-duration:' + (5 + (i * 7) % 6) + 's;animation-delay:-' + ((i * 13) % 9) + 's"></i>';
  el.querySelector('.sp-fx').innerHTML = fx;
  el.classList.remove('out'); el.hidden = false;
  let done = false;
  const hide = () => { if (done) return; done = true; el.classList.add('out'); setTimeout(() => { el.hidden = true; }, 380); };
  const t = setTimeout(hide, SHOW_MS);
  el.onclick = () => { clearTimeout(t); hide(); };
  el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); clearTimeout(t); hide(); } };
}
