// Entry point: wires the modules together and starts the app.

import { detectPitch } from './core/pitch.js';
import { db, storeKind, save, loadDB, askPersist } from './data/storage.js';
import { flow } from './core/flow.js';
import { state, paused, G, fx, onPlayed, frame } from './game/game.js';
import { detectLang, LANG, useLang } from './i18n/index.js';
import { layout, invalidateBg, keys, kbTop, kbH, isBlack } from './ui/canvas.js';
import { reducedMotion } from './ui/motion.js';
import { hydrateIcons } from './ui/icons.js';
import { focus, drawn, handHint } from './ui/render.js';
import { translateDom } from './ui/lang.js';
import { renderHome, goHome } from './ui/screens/home.js';
import { renderProfiles, wizAt, wizStep, renderMe } from './ui/screens/profiles.js';
import { showSplash } from './ui/splash.js';
import { restoreCamera } from './ui/camwin.js';
import { getCard, isRecording } from './record/recorder.js';
import './ui/screens/vcard.js';
import { getCamStream } from './input/camera.js';
// Modules that only attach event handlers when loaded:
import './input/touch.js';
import './input/keyboard.js';
import './ui/screens/settings.js';
import './ui/back.js';
import './ui/nav.js';

// Deploy version, written by scripts/stamp.mjs ('dev' when run from the repo). If the page that loaded this
// module came from an older deploy (a cached index.html whose ?v= no longer matches the files on the server),
// its markup may not fit this code: fetch a fresh page into the cache and reload once.
const BUILD = 'dev';
const pageBuild = new URL(import.meta.url).searchParams.get('v');
if (pageBuild && pageBuild !== BUILD){
  let first = true;
  try { first = sessionStorage.getItem('sn-reloaded') !== BUILD; sessionStorage.setItem('sn-reloaded', BUILD); } catch(e){ /* storage blocked: reload anyway */ }
  if (first) fetch(location.href, { cache: 'reload' }).catch(() => {}).then(() => location.reload());
}

// Resize / rotation: recompute canvas and re-render screens whose pixel sizes depend on U
let rsT = 0;
function onResize(){ layout(); clearTimeout(rsT); rsT = setTimeout(() => { if (state === 'home') renderHome(); else if (state === 'profiles') renderProfiles(); else if (state === 'newp') wizStep(wizAt); else if (state === 'me') renderMe(); }, 120); }
addEventListener('resize', onResize);
if (window.visualViewport) visualViewport.addEventListener('resize', onResize);

layout();
hydrateIcons();
useLang(detectLang()); translateDom();
askPersist();
loadDB().catch(() => {}).then(() => { goHome(); restoreCamera(); if (db.profiles.length) showSplash(); });
requestAnimationFrame(frame);
if (document.fonts) document.fonts.ready.then(() => invalidateBg());

window.__sn = { detectPitch, onPlayed: m => onPlayed(m, performance.now(), 'touch'), get game(){ return G; }, get fx(){ return fx; }, get focus(){ return focus; }, get handHint(){ return handHint; }, get state(){ return state; }, get nav(){ return flow.state.name; }, get paused(){ return paused; }, get db(){ return db; }, get lang(){ return LANG; }, get storeKind(){ return storeKind; }, get camStream(){ return getCamStream(); }, get recording(){ return isRecording(); }, get card(){ const c = getCard(); return c && { size: c.blob.size, type: c.type, ext: c.ext }; }, loadDB, save,
  keyPoint: m => ({ x: keys[m].x + keys[m].w / 2, y: kbTop + kbH * (isBlack(m) ? 0.3 : 0.85) }) };
// Motion state for the smoke test (read-only).
Object.defineProperties(window.__sn, { reducedMotion: { get: () => reducedMotion }, drawn: { get: () => ({ ...drawn }) } });
