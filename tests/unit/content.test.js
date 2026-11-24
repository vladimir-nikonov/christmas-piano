// Consistency of the app's data: songs, levels and UI strings.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SONGS, SONG_KEYS, PART_KEYS, bestKey } from '../../src/core/songs.js';
import { LEVELS } from '../../src/core/levels.js';
import { I18N, LANGS } from '../../src/i18n/index.js';
import { NOTE_NATIVE, PC_COLOR } from '../../src/core/music.js';

const KEYBOARD = [60, 72]; // C4..C5, the drawn keyboard (ui/canvas.js LO..HI)

test('every song has all parts, playable on the drawn keyboard', () => {
  assert.deepEqual(Object.keys(SONGS).sort(), [...SONG_KEYS].sort());
  for (const k of SONG_KEYS) {
    const s = SONGS[k];
    assert.ok(s.bpm > 0 && s.meter > 0, k);
    assert.equal(typeof s.title(), 'string');
    let prev = 0;
    for (const part of PART_KEYS) {
      const notes = s.parts[part];
      assert.ok(notes.length > prev, `${k}.${part} must be longer than the previous part`);
      prev = notes.length;
      for (const [m, d] of notes) {
        assert.ok(m >= KEYBOARD[0] && m <= KEYBOARD[1], `${k}.${part}: note ${m} is off the keyboard`);
        assert.ok(d > 0, `${k}.${part}: duration ${d}`);
      }
    }
  }
});

test('best-score keys stay compatible with saved progress', () => {
  assert.equal(bestKey('jingle', 0, 'short'), '0:short');
  assert.equal(bestKey('birthday', 2, 'full'), 'birthday:2:full');
});

test('levels get faster and stricter', () => {
  for (let i = 1; i < LEVELS.length; i++) {
    assert.ok(LEVELS[i].pct > LEVELS[i - 1].pct);
    if (LEVELS[i - 1].tol != null) assert.ok(LEVELS[i].tol < LEVELS[i - 1].tol);
  }
  assert.equal(LEVELS[0].wait, true);
});

test('every UI string exists in all five languages', () => {
  assert.deepEqual(LANGS.map(l => l.id).sort(), Object.keys(I18N).sort());
  const keys = Object.keys(I18N.en).sort();
  for (const { id } of LANGS) {
    assert.deepEqual(Object.keys(I18N[id]).sort(), keys, `language ${id}`);
    for (const k of keys) {
      const v = I18N[id][k], e = I18N.en[k];
      assert.equal(typeof v, typeof e, `${id}.${k}`);
      if (Array.isArray(e)) assert.equal(v.length, e.length, `${id}.${k} length`);
      else assert.ok(v.length > 0, `${id}.${k} is empty`);
    }
    assert.equal(I18N[id].levels.length, LEVELS.length, `${id}.levels`);
    assert.equal(I18N[id].parts.length, PART_KEYS.length, `${id}.parts`);
  }
});

test('note names and colours cover all 12 pitch classes', () => {
  for (const id of Object.keys(NOTE_NATIVE)) assert.equal(NOTE_NATIVE[id].length, 12, id);
  assert.equal(PC_COLOR.filter(Boolean).length, 12);
});
