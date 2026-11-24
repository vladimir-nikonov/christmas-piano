// Entry point: wires the modules together and starts the app.

import { detectPitch } from './core/pitch.js';
import { db, storeKind, save, loadDB, askPersist } from './data/storage.js';
import { state, G, fx, onPlayed, frame } from './game/game.js';
import { detectLang, LANG, useLang } from './i18n/index.js';
import { layout, invalidateBg, keys, kbTop, kbH, isBlack } from './ui/canvas.js';
import { hydrateIcons } from './ui/icons.js';
import { focus } from './ui/render.js';
import { translateDom } from './ui/lang.js';
import { renderHome, goHome } from './ui/screens/home.js';
import { openProfiles, wizAt, wizStep, renderMe } from './ui/screens/profiles.js';
import { showSplash } from './ui/splash.js';
// Modules that only attach event handlers when loaded:
import './input/touch.js';
import './input/keyboard.js';
import './ui/screens/settings.js';

// Resize / rotation: recompute canvas and re-render screens whose pixel sizes depend on U
let rsT = 0;
function onResize(){ layout(); clearTimeout(rsT); rsT = setTimeout(() => { if (state === 'home') renderHome(); else if (state === 'profiles') openProfiles(); else if (state === 'newp') wizStep(wizAt); else if (state === 'me') renderMe(); }, 120); }
addEventListener('resize', onResize);
if (window.visualViewport) visualViewport.addEventListener('resize', onResize);

layout();
hydrateIcons();
useLang(detectLang()); translateDom();
askPersist();
loadDB().catch(() => {}).then(() => { goHome(); if (db.profiles.length) showSplash(); });
requestAnimationFrame(frame);
if (document.fonts) document.fonts.ready.then(() => invalidateBg());

window.__sn = { detectPitch, onPlayed: m => onPlayed(m, performance.now(), 'touch'), get game(){ return G; }, get fx(){ return fx; }, get focus(){ return focus; }, get state(){ return state; }, get db(){ return db; }, get lang(){ return LANG; }, get storeKind(){ return storeKind; }, loadDB, save,
  keyPoint: m => ({ x: keys[m].x + keys[m].w / 2, y: kbTop + kbH * (isBlack(m) ? 0.3 : 0.85) }) };
