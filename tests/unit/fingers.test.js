import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SONGS, SONG_KEYS, PART_KEYS, fingerFor } from '../../src/core/songs.js';

test('every note of every song has a hand and a finger', () => {
  for (const s of SONG_KEYS) for (const part of PART_KEYS) for (const [m] of SONGS[s].parts[part]){
    const f = fingerFor(s, m);
    assert.ok(f, s + ' ' + m);
    assert.match(f.hand, /^[LR]$/);
    assert.ok(f.finger >= 1 && f.finger <= 5);
  }
});

test('each finger of a hand plays only one note within a song', () => {
  for (const s of SONG_KEYS){
    const seen = {};
    for (const [m, f] of Object.entries(SONGS[s].fingers)){ assert.equal(seen[f], undefined, s + ' ' + f); seen[f] = m; }
  }
});

test('unknown song or note has no fingering', () => {
  assert.equal(fingerFor('nope', 60), null);
  assert.equal(fingerFor('jingle', 71), null);
  assert.deepEqual(fingerFor('birthday', 60), { hand: 'L', finger: 5 });
});
