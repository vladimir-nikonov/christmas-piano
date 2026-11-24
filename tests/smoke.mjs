// Browser smoke test: drives the real app in headless Chrome through the main flows.
//   npm run test:smoke
// Uses the installed Google Chrome (channel "chrome"); set CHROME_PATH to use another binary.
// Set SMOKE_URL to test an already running server instead of starting one.
/* global history, AudioContext -- used inside page.evaluate() callbacks, which run in the browser */
import { chromium } from 'playwright-core';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { startServer } from '../scripts/serve.mjs';
import { KEY_CODES } from '../src/core/keymap.js';

const started = process.env.SMOKE_URL ? null : await startServer();
const url = process.env.SMOKE_URL || started.url;
const launchOpts = process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' };
const browser = await chromium.launch(launchOpts);
const errors = [];
// Fake microphone input: 1.5 s of silence (noise calibration), then the note in short bursts with gaps,
// so every burst is a new attack. Chrome loops the file.
function toneWav(freq, sr = 48000){
  const secs = 12, n = sr * secs, data = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++){ const t = i / sr, ph = (t - 1.5) % 0.7;
    const on = t > 1.5 && ph < 0.45, env = on ? Math.min(1, ph / 0.01) * Math.min(1, (0.45 - ph) / 0.02) : 0;
    data.writeInt16LE(Math.round(Math.sin(2 * Math.PI * freq * t) * env * 0.5 * 32767), i * 2); }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(sr, 24); h.writeUInt32LE(sr * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}
let step = 'start';
const log = s => { step = s; console.log('  · ' + s); };
// Tablet viewports: MatePad 11 landscape, with Chrome's bars (712, 720), a smaller tablet, portrait.
const VIEWPORTS = [[1280, 800], [1280, 712], [1280, 720], [1024, 640], [800, 1280]];
// In the visible screens, no button may stick out of the viewport, nothing may scroll, and every .b button
// must be at least 64 logical units (64 * --u CSS px) on both sides.
function layoutProblems(sels){
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;width:calc(64*var(--u))'; document.body.appendChild(probe);
  const min = probe.getBoundingClientRect().width - 0.5; probe.remove();
  const W = window.innerWidth, H = window.innerHeight, bad = [];
  for (const sel of sels){
    const scr = document.querySelector(sel);
    if (!scr || !scr.getClientRects().length){ bad.push(sel + ' not visible'); continue; }
    for (const el of scr.querySelectorAll('button')){
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
      const id = sel + ' ' + (el.id ? '#' + el.id : el.className);
      if (r.left < -0.5 || r.top < -0.5 || r.right > W + 0.5 || r.bottom > H + 0.5) bad.push(id + ' is clipped');
      if (el.classList.contains('b') && (r.width < min || r.height < min)) bad.push(id + ' is ' + Math.round(r.width) + 'x' + Math.round(r.height) + ', below ' + Math.round(min));
    }
    if (scr.scrollHeight > scr.clientHeight + 1) bad.push(sel + ' scrolls');
  }
  const de = document.scrollingElement;
  if (de.scrollHeight > H + 1 || de.scrollWidth > W + 1) bad.push('the page scrolls');
  return bad;
}
async function checkLayoutOn(pg, sels){
  for (const [width, height] of VIEWPORTS){
    await pg.setViewportSize({ width, height });
    await pg.waitForTimeout(250); // home re-renders 120 ms after a resize
    assert.deepEqual(await pg.evaluate(layoutProblems, sels), [], sels.join(', ') + ' at ' + width + 'x' + height);
  }
  await pg.setViewportSize({ width: 1280, height: 800 });
  await pg.waitForTimeout(250);
}

try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
  // Web fonts are not needed for the test; answer with empty CSS so the run works offline.
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const sn = (fn, arg) => page.evaluate(fn, arg);
  const visible = sel => page.locator(sel).waitFor({ state: 'visible', timeout: 10000 });
  // Results: exactly one primary button, which action it runs, which secondary icons are shown, and the slot positions.
  const resultsButtons = () => sn(() => {
    const vis = el => !el.hidden && window.getComputedStyle(el).visibility !== 'hidden';
    const btns = [...document.querySelectorAll('#results button')], x = id => Math.round(document.getElementById(id).getBoundingClientRect().left);
    return { primaries: btns.filter(b => vis(b) && b.classList.contains('primary')).map(b => b.id), go: document.querySelector('#btnMain').dataset.go,
      again: vis(document.querySelector('#btnAgain')), next: vis(document.querySelector('#btnNext')), levelUp: !document.querySelector('#resLevelUp').hidden,
      x: { home: x('btnHome'), again: x('btnAgain'), main: x('btnMain') } };
  });
  const playLevel1Perfectly = async () => {
    await page.waitForFunction(() => window.__sn.state === 'playing');
    const n = await sn(() => window.__sn.game.notes.length);
    for (let i = 0; i < n; i++){
      await waitAtNextNote();
      await sn(() => { const n = window.__sn.game.notes.find(n => !n.hit && !n.missed); window.__sn.onPlayed(n.midi); });
    }
    await visible('#results');
  };
  // Level 1 stops the clock at each note until it is played: wait until the clock stands at the next unplayed note.
  const waitAtNextNote = () => page.waitForFunction(() => { const g = window.__sn.game, n = g && g.notes.find(n => !n.hit && !n.missed);
    return !!(n && g.waiting && g.time >= n.t); }, null, { timeout: 15000 });
  const checkLayout = (...sels) => checkLayoutOn(page, sels);

  log('first launch opens the new player wizard');
  await page.goto(url);
  await visible('#newp');
  assert.equal(await sn(() => window.__sn.db.profiles.length), 0);

  log('create a player');
  await page.fill('#newName', 'Tester');
  await page.click('#btnStep2');
  await visible('#themePick');
  await page.click('#btnNewOk');
  await visible('#home');
  assert.equal(await sn(() => window.__sn.db.profiles[0].name), 'Tester');
  assert.equal(await page.locator('#btnWho .nm').textContent(), 'Tester');
  assert.ok(await page.locator('#songs button').count() >= 2);

  log('home: one primary button, the current level is marked and selected');
  assert.equal(await page.locator('#home .b.primary:visible').count(), 1);   // the hidden mic state has its own Try again
  assert.equal(await page.locator('#levels .tile.cur').count(), 1);
  assert.equal(await page.locator('#levels .tile').nth(0).getAttribute('data-current'), '1');
  assert.equal(await page.locator('#levels .tile').nth(0).getAttribute('aria-pressed'), 'true');

  log('switching the song selects that song\'s current level');
  await sn(() => { window.__sn.db.profiles[0].prog.birthday.level = 2; });
  await page.locator('#levels .tile').nth(1).click();
  assert.equal(await sn(() => window.__sn.db.profiles[0].sel.level), 1);
  await page.locator('#songs button').nth(1).click();
  assert.equal(await sn(() => window.__sn.db.profiles[0].sel.song), 'birthday');
  assert.equal(await sn(() => window.__sn.db.profiles[0].sel.level), 2);
  assert.equal(await page.locator('#levels .tile').nth(2).getAttribute('data-current'), '1');
  assert.equal(await page.locator('#levels .tile').nth(2).getAttribute('aria-pressed'), 'true');
  await page.locator('#songs button').nth(0).click();
  assert.equal(await sn(() => window.__sn.db.profiles[0].sel.level), 0);
  await sn(() => { window.__sn.db.profiles[0].prog.birthday.level = 0; return window.__sn.save(); });

  log('parent settings: count screen taps');
  await page.click('#btnSettings');
  await visible('#settings');
  await page.check('#sTouch');
  await page.click('#btnSetClose');
  assert.equal(await sn(() => window.__sn.db.device.touch), true);

  log('home: falling decor is drawn when motion is allowed');
  assert.equal(await sn(() => window.__sn.reducedMotion), false);
  assert.ok(await sn(() => window.__sn.drawn.flakes) > 0);

  log('home fits every tablet viewport');
  await checkLayout('#home');

  log('play level 1 (notes wait for the player) without mistakes, after the zoom-in entry');
  await page.click('#btnPlay');
  assert.ok(await sn(() => document.querySelector('#levels .tile[aria-pressed="true"]').getAnimations().some(a => a.playState === 'running' && !a.animationName)), 'entry zoom on the selected tile');
  await page.waitForFunction(() => window.__sn.state === 'playing');
  assert.equal(await page.locator('#home').isHidden(), true);
  await playLevel1Perfectly();
  assert.equal(await page.locator('#resPct').textContent(), '100%');
  log('results fit every tablet viewport');
  await checkLayout('#results');
  assert.equal(await sn(() => window.__sn.db.profiles[0].best['0:short']), 3);
  assert.deepEqual(await sn(() => window.__sn.db.profiles[0].prog.jingle), { level: 0, streak: 1 });
  assert.deepEqual(await sn(() => window.__sn.db.profiles[0].prog.birthday), { level: 0, streak: 0 });

  log('results with 3 stars and no new level: replay is the one primary action, next level is a small icon');
  const r3 = await resultsButtons();
  assert.deepEqual(r3.primaries, ['btnMain']);
  assert.equal(r3.go, 'again');
  assert.deepEqual([r3.again, r3.next, r3.levelUp], [false, true, false]);

  log('Enter on the results replays; a second clean game opens the next level');
  await page.keyboard.press('Enter');
  await playLevel1Perfectly();
  const rUp = await resultsButtons();
  assert.deepEqual(rUp.primaries, ['btnMain']);
  assert.equal(rUp.go, 'next');
  assert.deepEqual([rUp.again, rUp.next, rUp.levelUp], [true, false, true]);
  assert.equal(await page.locator('#btnMain').getAttribute('aria-label'), 'Play the new level');
  assert.deepEqual(rUp.x, r3.x, 'Home, Replay and the primary keep their slots');
  assert.deepEqual(await sn(() => window.__sn.db.profiles[0].prog.jingle), { level: 1, streak: 0 });

  log('a wrong note in level 1 is counted against the note, with soft feedback only (key hint off)');
  await sn(() => { window.__sn.db.profiles[0].opts.hint = false; });
  await page.click('#btnAgain');
  await waitAtNextNote();
  assert.equal(await sn(() => window.__sn.focus.midi === window.__sn.game.notes[0].midi), true, 'waiting focuses the expected note');
  await sn(() => { const n = window.__sn.game.notes[0]; window.__sn.onPlayed(n.midi + 2); });
  assert.equal(await sn(() => window.__sn.game.notes[0].wrong), 1);
  assert.equal(await sn(() => window.__sn.fx.pops.some(p => p.icon === 'cross')), false, 'a wrong note shows no cross');
  assert.equal(await sn(() => Object.keys(window.__sn.fx.soft).length), 1, 'a wrong note gets a soft wobble on the played key');
  assert.equal(await sn(() => window.__sn.fx.nudge.midi === window.__sn.game.notes[0].midi), true, 'a wrong note nudges the expected key');
  await sn(() => window.__sn.onPlayed(window.__sn.game.notes[0].midi));
  assert.equal(await sn(() => window.__sn.game.notes[0].grade), 'good');

  log('play notes with the computer keyboard and with screen taps');
  assert.ok(await page.locator('#micPill').isHidden(), 'no microphone status in screen mode');
  const codeFor = m => Object.keys(KEY_CODES).find(c => KEY_CODES[c] === m);
  for (let i = 1; i <= 4; i++){
    await waitAtNextNote();
    const m = await sn(() => window.__sn.game.notes.find(n => !n.hit && !n.missed).midi);
    if (i % 2){ await page.keyboard.press(codeFor(m)); }
    else { const p = await sn(mm => window.__sn.keyPoint(mm), m); await page.mouse.click(p.x, p.y); }
    await page.waitForFunction(k => window.__sn.game.notes[k].hit, i, { timeout: 2000 });
  }
  assert.equal(await page.locator('#hud .qfull svg').count(), 1, 'full-screen button in the game HUD');
  await page.keyboard.press('Escape');
  await visible('#pause');
  log('switch to the microphone from the pause menu and back');
  await page.locator('#pause .qinput').click();
  assert.equal(await sn(() => window.__sn.db.device.touch), false);
  await page.locator('#pause .qinput').click();
  assert.equal(await sn(() => window.__sn.db.device.touch), true);
  await page.click('#btnResume');
  await page.click('#btnPause');
  await visible('#pause');
  assert.equal(await page.locator('#pause .qfull').count(), 0, 'full screen lives in the HUD, not the pause menu');
  assert.equal(await page.locator('#pause .qlang, #pause .qtheme').count(), 0, 'no language/theme buttons in the pause menu');
  assert.equal(await page.locator('#pause button:visible').count(), 4, 'pause: resume, replay, home and input mode only');
  log('pause menu and HUD fit every tablet viewport');
  await checkLayout('#pause', '#hud');
  await page.click('#btnQuit');
  await visible('#home');

  log('system Back: during a game it pauses, in pause it goes home, overlays close');
  const appUrl = page.url();
  await page.click('#btnPlay');
  await page.waitForFunction(() => window.__sn.state === 'playing');
  await page.goBack();
  await visible('#pause');
  assert.equal(await sn(() => window.__sn.paused), true);
  assert.equal(page.url(), appUrl);
  await page.goBack();
  await visible('#home');
  assert.equal(page.url(), appUrl);
  await page.click('#btnSettings');
  await visible('#settings');
  await page.goBack();
  await page.locator('#settings').waitFor({ state: 'hidden' });
  await visible('#home');
  await page.click('#btnWho');
  await visible('#profiles');
  await page.goBack();
  await visible('#home');
  // Going home through the app's own buttons consumes the history entry, so entries never pile up.
  const histLen = await sn(() => history.length);
  for (let i = 0; i < 3; i++){
    await page.click('#btnPlay');
    await page.waitForFunction(() => window.__sn.state === 'playing');
    await page.click('#btnPause');
    await page.click('#btnQuit');
    await visible('#home');
  }
  await page.waitForTimeout(100);
  assert.ok(await sn(() => history.length) <= histLen + 1, 'history entries do not accumulate');
  assert.equal(await sn(() => !!(history.state && history.state.sn)), false, 'no trap entry left on the home screen');

  log('double-tapping Play while the microphone is asked starts one game; blur and mic loss pause');
  await page.click('#btnSettings');
  await page.uncheck('#sTouch');
  await page.click('#btnSetClose');
  await sn(() => {
    window.__gum = 0;
    navigator.mediaDevices.getUserMedia = () => {
      window.__gum++;
      const ac = new AudioContext(), stream = ac.createMediaStreamDestination().stream;
      window.__track = stream.getAudioTracks()[0];
      return new Promise(r => setTimeout(() => r(stream), 300));
    };
    const b = document.querySelector('#btnPlay'); b.click(); b.click();
  });
  await page.waitForFunction(() => window.__sn.state === 'playing');
  await sn(() => { window.__g1 = window.__sn.game; });
  await page.waitForTimeout(400);
  assert.equal(await sn(() => window.__gum), 1, 'one microphone request');
  assert.equal(await sn(() => window.__sn.game === window.__g1), true, 'one game');
  await sn(() => window.dispatchEvent(new Event('blur')));
  await visible('#pause');
  await page.click('#btnResume');
  assert.equal(await sn(() => window.__sn.paused), false);
  await sn(() => window.__track.dispatchEvent(new Event('ended')));
  await visible('#pause');
  await page.click('#btnQuit');
  await visible('#home');
  await page.click('#btnSettings');
  await page.check('#sTouch');
  await page.click('#btnSetClose');

  log('switch language from the quick picker');
  await page.locator('#home .qlang').click();
  await visible('#pop');
  await page.click('#popLangs [lang=ru]');
  assert.equal(await page.title(), 'Снежные ноты');
  assert.equal(await sn(() => window.__sn.db.profiles[0].lang), 'ru');
  await page.click('#btnPopClose');

  log('listen to the tune with reduced motion (fade only), then stop');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.click('#btnListen');
  assert.deepEqual(await sn(() => [...new Set(document.getAnimations().map(a => a.effect.target.id))]), ['home']);
  await page.waitForFunction(() => window.__sn.state === 'demo');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForTimeout(800);
  await page.click('#btnPause');
  await visible('#home');

  log('back up to a file and restore from it');
  await page.click('#btnSettings');
  await visible('#settings');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btnBackup')]);
  const file = join(await mkdtemp(join(tmpdir(), 'sn-smoke-')), dl.suggestedFilename());
  await dl.saveAs(file);
  const backup = JSON.parse(await readFile(file, 'utf8'));
  assert.equal(backup.format, 'snezhnye-noty-backup');
  assert.equal(backup.profiles[0].name, 'Tester');
  await sn(() => { window.__sn.db.profiles[0].name = 'Changed'; return window.__sn.save(); });
  await page.setInputFiles('#restoreFile', file);
  await visible('#btnRestoreYes');
  await page.click('#btnRestoreYes');
  await visible('#home');
  assert.equal(await sn(() => window.__sn.db.profiles[0].name), 'Tester');

  log('a broken backup file is rejected');
  await page.click('#btnSettings');
  await page.setInputFiles('#restoreFile', { name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"other"}') });
  await visible('#restoreAsk');
  assert.equal(await page.locator('#btnRestoreYes').isHidden(), true);
  await page.click('#btnSetClose');

  log('data survives a reload (IndexedDB)');
  await page.reload();
  await visible('#home');
  log('splash shows the theme mascots for a returning player and closes on tap');
  await visible('#splash');
  assert.equal(await page.locator('#splash .sp-cast svg.av').count(), 3);
  await page.click('#splash');
  await page.locator('#splash').waitFor({ state: 'hidden', timeout: 5000 });
  assert.equal(await sn(() => window.__sn.storeKind), 'IndexedDB');
  assert.equal(await sn(() => window.__sn.db.profiles[0].best['0:short']), 3);
  assert.equal(await page.title(), 'Снежные ноты');

  log('player list and child page');
  await page.click('#btnWho');
  await visible('#profiles');
  assert.equal(await page.locator('#ptiles button').count(), 2);
  await page.locator('#ptiles button').first().click();
  await visible('#home');
  await page.click('#btnMe');
  await visible('#me');
  await page.fill('#meName', 'Kid');
  await page.click('#btnMeOk');
  await visible('#home');
  assert.equal(await sn(() => window.__sn.db.profiles[0].name), 'Kid');

  log('theme from the quick picker');
  await page.locator('#home .qtheme').click();
  await visible('#popThemes');
  await page.locator('#popThemes button').nth(2).click();
  assert.equal(await sn(() => document.documentElement.dataset.theme), await sn(() => window.__sn.db.profiles[0].theme));
  assert.notEqual(await sn(() => window.__sn.db.profiles[0].theme), 'pixel');
  await page.click('#btnPopClose');

  log('timed level: unplayed notes are missed and the result is kept in the history');
  await page.click('#btnSettings');
  await sn(() => { const el = document.querySelector('#sTempo'); el.value = 130; el.dispatchEvent(new Event('input')); });
  assert.equal(await sn(() => window.__sn.db.profiles[0].opts.tempo), 130);
  await page.click('#btnSetClose');
  await page.locator('#levels button').nth(1).click({ force: true });   // the current level tile bobs, so it is never "stable"
  await page.click('#btnSettings');
  await page.click('#btnSetClose');
  assert.equal(await sn(() => window.__sn.db.profiles[0].sel.level), 1, 'a level picked by hand survives closing settings');
  await page.click('#btnPlay');
  await page.waitForFunction(() => window.__sn.state === 'playing' && !window.__sn.game.wait);

  log('resume on a timed level counts in again and keeps the game');
  await page.waitForFunction(() => window.__sn.game.time > 0.3);
  await page.click('#btnPause');
  await visible('#pause');
  const snap = () => sn(() => { const g = window.__sn.game; return { time: g.time, score: g.score, missed: g.notes.filter(n => n.missed).length }; });
  const before = await snap();
  await page.waitForTimeout(300);
  assert.deepEqual(await snap(), before, 'nothing moves in pause');
  await page.click('#btnResume');
  assert.ok(await sn(() => window.__sn.game.resumeIn > 0), 'count-in after resume');
  await page.waitForTimeout(150);
  assert.deepEqual(await snap(), before, 'the clock waits for the count-in');
  await page.click('#btnPause');
  await page.click('#btnResume');
  assert.ok(await sn(() => window.__sn.game.resumeIn > 0), 'a pause during the count-in resumes into the count-in');
  await page.waitForFunction(() => window.__sn.game.resumeIn === 0, null, { timeout: 10000 });
  await page.waitForFunction(t => window.__sn.game.time > t, before.time);
  await page.locator('#results').waitFor({ state: 'visible', timeout: 30000 });
  assert.equal(await page.locator('#resPct').textContent(), '0%');
  assert.equal(await sn(() => window.__sn.game.notes.every(n => n.missed)), true);
  assert.equal(await sn(() => window.__sn.db.profiles[0].hist['1:short'].length), 1);
  const r0 = await resultsButtons();
  assert.deepEqual(r0.primaries, ['btnMain'], '0 stars: one primary');
  assert.equal(r0.go, 'again');
  assert.deepEqual([r0.again, r0.next, r0.levelUp], [false, false, false]);
  assert.equal(r0.x.home, r3.x.home);
  await page.click('#btnHome');
  await visible('#home');
  assert.equal(await sn(() => { const p = window.__sn.db.profiles[0]; return p.sel.level === p.prog.jingle.level; }), true, 'back home after a game selects the current level');
  log('results buttons do nothing once the results are gone (a late second tap)');
  const selBefore = await sn(() => window.__sn.db.profiles[0].sel.level);
  await sn(() => { document.querySelector('#btnNext').click(); document.querySelector('#btnAgain').click(); });
  assert.equal(await sn(() => window.__sn.state), 'home');
  assert.equal(await sn(() => window.__sn.db.profiles[0].sel.level), selBefore);

  log('portrait layout');
  await page.setViewportSize({ width: 800, height: 1280 });
  await page.waitForTimeout(300);
  await visible('#home');

  log('delete the player from parent settings');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.click('#btnSettings');
  await page.click('#btnDelete');
  await page.click('#btnDelete');
  await visible('#newp');
  assert.equal(await sn(() => window.__sn.db.profiles.length), 0);
  await ctx.close();

  log('microphone denied: mic state with a hint per error kind');
  {
    const dctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await dctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    // getUserMedia fails with window.__micMode as the error name until it is set to 'ok'; then it returns a silent stream.
    // The microphone permission is a stub whose state the test flips.
    await dctx.addInitScript(() => {
      window.__micMode = 'NotAllowedError'; window.__gumCalls = 0;
      navigator.mediaDevices.getUserMedia = async () => {
        window.__gumCalls++; await new Promise(r => setTimeout(r, 50));
        if (window.__micMode !== 'ok') throw new DOMException('stub', window.__micMode);
        return new window.AudioContext().createMediaStreamDestination().stream;
      };
      const perm = new EventTarget(); perm.state = 'denied'; window.__perm = perm;
      const query = navigator.permissions.query.bind(navigator.permissions);
      navigator.permissions.query = d => d && d.name === 'microphone' ? Promise.resolve(perm) : query(d);
    });
    const dp = await dctx.newPage();
    dp.on('pageerror', e => errors.push('pageerror: ' + e.message));
    dp.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    const dsn = (fn, arg) => dp.evaluate(fn, arg);
    await dp.goto(url);
    await dp.fill('#newName', 'NoMic');
    await dp.click('#btnStep2');
    await dp.click('#btnNewOk');
    await dp.locator('#home').waitFor({ state: 'visible' });
    await dp.click('#btnPlay');
    await dp.locator('#micErr').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await dsn(() => window.__sn.state), 'home', 'the game does not start without the microphone');
    assert.equal(await dp.locator('#micHint').getAttribute('data-t'), 'micDenied');
    assert.ok(await dp.locator('#btnMicRetry').isVisible());
    assert.ok(await dp.locator('#btnMicTouch').isVisible());
    assert.ok(await dp.locator('#micErr .micbadge svg').count() >= 2, 'mic icon with a badge');
    assert.ok(await dp.locator('#micErr').isVisible());
    await checkLayoutOn(dp, ['#home']);   // home with the mic state shown
    assert.ok(await dp.locator('#micErr').isVisible(), 'the mic state survives a resize');
    for (const [mode, key] of [['NotFoundError', 'micMissing'], ['NotReadableError', 'micBusy'], ['TypeError', 'micOther']]){
      await dsn(m => { window.__micMode = m; }, mode);
      await dp.click('#btnMicRetry');
      await dp.waitForFunction(k => !document.querySelector('#micErr').hidden && document.querySelector('#micHint').dataset.t === k, key, { timeout: 5000 });
    }

    log('microphone denied: two quick taps ask the browser once');
    const calls = await dsn(() => window.__gumCalls);
    await dsn(() => { const b = document.querySelector('#btnPlay'); b.click(); b.click(); });
    await dp.locator('#micErr').waitFor({ state: 'visible' });
    await dp.waitForTimeout(150);
    assert.equal(await dsn(() => window.__gumCalls), calls + 1);

    log('microphone denied: play with screen taps');
    await dp.click('#btnMicTouch');
    await dp.waitForFunction(() => window.__sn.state === 'playing');
    assert.equal(await dsn(() => window.__sn.db.device.touch), true);
    assert.ok(await dp.locator('#micErr').isHidden());
    await dp.click('#btnPause');
    await dp.click('#btnQuit');
    await dp.locator('#home').waitFor({ state: 'visible' });
    await dsn(() => { window.__sn.db.device.touch = false; return window.__sn.save(); });

    log('microphone allowed later: the error clears and Try again starts the game');
    await dsn(() => { window.__micMode = 'NotAllowedError'; });
    await dp.click('#btnPlay');
    await dp.locator('#micErr').waitFor({ state: 'visible' });
    await dsn(() => { window.__perm.state = 'granted'; window.__perm.dispatchEvent(new Event('change')); });
    await dp.locator('#micErr').waitFor({ state: 'hidden', timeout: 2000 });
    await dsn(() => { window.__perm.state = 'denied'; });
    await dp.click('#btnPlay');
    await dp.locator('#micErr').waitFor({ state: 'visible' });
    await dsn(() => { window.__micMode = 'ok'; });
    await dp.click('#btnMicRetry');
    await dp.waitForFunction(() => window.__sn.state === 'playing');
    assert.ok(await dp.locator('#micErr').isHidden());
    await dctx.close();
  }

  log('reduced motion: no falling decor and no particles on the canvas');
  {
    const rctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
    await rctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    const rp = await rctx.newPage();
    rp.on('pageerror', e => errors.push('pageerror: ' + e.message));
    await rp.goto(url);
    await rp.fill('#newName', 'Calm');
    await rp.click('#btnStep2');
    await rp.click('#btnNewOk');
    await rp.locator('#home').waitFor({ state: 'visible' });
    assert.equal(await rp.evaluate(() => window.__sn.reducedMotion), true);
    // Collect what the canvas draws over a number of frames.
    const watch = ms => rp.evaluate(ms => new Promise(res => { const t0 = performance.now(), m = { flakes: 0, particles: 0, glows: 0 };
      const f = () => { const d = window.__sn.drawn; for (const k in m) m[k] = Math.max(m[k], d[k]); if (performance.now() - t0 < ms) window.requestAnimationFrame(f); else res(m); };
      window.requestAnimationFrame(f); }), ms);
    assert.equal((await watch(300)).flakes, 0);
    await rp.click('#btnSettings');
    await rp.check('#sTouch');
    await rp.click('#btnSetClose');
    await rp.click('#btnPlay');
    await rp.waitForFunction(() => { const g = window.__sn.game, n = g && g.notes.find(n => !n.hit && !n.missed); return !!(n && g.waiting && g.time >= n.t); }, null, { timeout: 15000 });
    const seen = watch(500);
    await rp.evaluate(() => { const n = window.__sn.game.notes.find(n => !n.hit && !n.missed); window.__sn.onPlayed(n.midi); });
    const m = await seen;
    assert.equal(m.particles, 0, 'no particles');
    assert.equal(m.flakes, 0, 'no flakes');
    assert.ok(m.glows > 0, 'a hit shows a static glow instead');
    await rctx.close();
  }

  log('microphone: a played E4 is heard and counted');
  const wav = join(await mkdtemp(join(tmpdir(), 'sn-mic-')), 'e4.wav');
  await writeFile(wav, toneWav(329.63));
  const micBrowser = await chromium.launch({ ...launchOpts, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-audio-capture=' + wav, '--autoplay-policy=no-user-gesture-required'] });
  try {
    const mp = await micBrowser.newPage();
    mp.on('pageerror', e => errors.push('pageerror: ' + e.message));
    await mp.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await mp.goto(url);
    await mp.fill('#newName', 'Mic');
    await mp.click('#btnStep2');
    await mp.click('#btnNewOk');
    await mp.click('#btnPlay');
    await mp.waitForFunction(() => window.__sn.state === 'playing');
    await mp.waitForFunction(() => window.__sn.game.notes[0].hit, null, { timeout: 20000 });
    assert.equal(await mp.locator('#heard').textContent(), 'E');
  } finally { await micBrowser.close(); }

  assert.deepEqual(errors, []);
  console.log('smoke: OK');
} catch (e) {
  console.error('smoke: FAILED at "' + step + '"');
  if (errors.length) console.error('page errors:\n' + errors.join('\n'));
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser.close();
  started?.server.close();
}
