// Browser smoke test: drives the real app in headless Chrome through the main flows.
//   npm run test:smoke
// Uses the installed Google Chrome (channel "chrome"); set CHROME_PATH to use another binary.
// Set SMOKE_URL to test an already running server instead of starting one.
import { chromium } from 'playwright-core';
import { readFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { startServer } from '../scripts/serve.mjs';

const started = process.env.SMOKE_URL ? null : await startServer();
const url = process.env.SMOKE_URL || started.url;
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' });
const errors = [];
let step = 'start';
const log = s => { step = s; console.log('  · ' + s); };

try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
  // Web fonts are not needed for the test; answer with empty CSS so the run works offline.
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const sn = (fn, arg) => page.evaluate(fn, arg);
  const visible = sel => page.locator(sel).waitFor({ state: 'visible', timeout: 10000 });
  // Level 1 stops the clock at each note until it is played: wait until the clock stands at the next unplayed note.
  const waitAtNextNote = () => page.waitForFunction(() => { const g = window.__sn.game, n = g && g.notes.find(n => !n.hit && !n.missed);
    return !!(n && g.waiting && g.time >= n.t); }, null, { timeout: 15000 });

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

  log('parent settings: count screen taps');
  await page.click('#btnSettings');
  await visible('#settings');
  await page.check('#sTouch');
  await page.click('#btnSetClose');
  assert.equal(await sn(() => window.__sn.db.device.touch), true);

  log('play level 1 (notes wait for the player) without mistakes');
  await page.click('#btnPlay');
  await page.waitForFunction(() => window.__sn.state === 'playing');
  const total = await sn(() => window.__sn.game.notes.length);
  for (let i = 0; i < total; i++){
    await waitAtNextNote();
    await sn(() => { const n = window.__sn.game.notes.find(n => !n.hit && !n.missed); window.__sn.onPlayed(n.midi); });
  }
  await visible('#results');
  assert.equal(await page.locator('#resPct').textContent(), '100%');
  assert.equal(await sn(() => window.__sn.db.profiles[0].best['0:short']), 3);
  assert.equal(await sn(() => window.__sn.db.profiles[0].streak), 1);

  log('a wrong note in level 1 is counted against the note');
  await page.click('#btnAgain');
  await waitAtNextNote();
  await sn(() => { const n = window.__sn.game.notes[0]; window.__sn.onPlayed(n.midi + 2); });
  assert.equal(await sn(() => window.__sn.game.notes[0].wrong), 1);
  await sn(() => window.__sn.onPlayed(window.__sn.game.notes[0].midi));
  assert.equal(await sn(() => window.__sn.game.notes[0].grade), 'good');
  await page.click('#btnPause');
  await visible('#pause');
  await page.click('#btnQuit');
  await visible('#home');

  log('switch language from the quick picker');
  await page.locator('#home .qlang').click();
  await visible('#pop');
  await page.click('#popLangs [lang=ru]');
  assert.equal(await page.title(), 'Снежные ноты');
  assert.equal(await sn(() => window.__sn.db.profiles[0].lang), 'ru');
  await page.click('#btnPopClose');

  log('listen to the tune, then stop');
  await page.click('#btnListen');
  await page.waitForFunction(() => window.__sn.state === 'demo');
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

  log('portrait layout');
  await page.setViewportSize({ width: 800, height: 1280 });
  await page.waitForTimeout(300);
  await visible('#home');

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
