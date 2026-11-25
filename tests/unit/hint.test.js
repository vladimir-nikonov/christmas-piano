import { test } from 'node:test';
import assert from 'node:assert/strict';
import { homeHint } from '../../src/core/hint.js';

const base = { sel: 1, cur: 1, last: 4 };

test('a new level opened: the level opens on home and Play pulses', () => {
  assert.deepEqual(homeHint({ ...base, from: 'results', cur: 2, sel: 2, played: 1, levelUp: true, streak: 0 }),
    { key: 'hLevelUp', level: 2, play: true, tile: 'unlock' });
});

test('one more good game opens the next level: the progress pip pulses', () => {
  assert.deepEqual(homeHint({ ...base, from: 'results', played: 1, levelUp: false, streak: 1 }), { key: 'hOneMore', level: 2, tile: 'pip' });
  assert.equal(homeHint({ ...base, from: 'results', played: 1, levelUp: false, streak: 0 }), null, 'no streak yet');
  assert.equal(homeHint({ ...base, from: 'results', played: 0, levelUp: false, streak: 1 }), null, 'a replayed level does not count');
  assert.equal(homeHint({ ...base, from: 'results', cur: 4, sel: 4, played: 4, levelUp: false, streak: 1 }), null, 'the top level has no next one');
});

test('after listening, for a new player and a player switch: Play pulses', () => {
  assert.deepEqual(homeHint({ ...base, from: 'demo' }), { key: 'hAfterDemo', play: true });
  assert.deepEqual(homeHint({ ...base, from: 'newPlayer' }), { key: 'hStart', play: true });
  assert.deepEqual(homeHint({ ...base, from: 'player', name: 'Ann' }), { key: 'hHello', name: 'Ann', play: true });
  assert.deepEqual(homeHint({ ...base, from: 'player', name: '' }), { key: 'hIdle', play: true });
});

test('actions on home explain themselves', () => {
  assert.deepEqual(homeHint({ ...base, from: 'song', cur: 3, sel: 3 }), { key: 'hSong', level: 3, tile: 'cur' });
  assert.deepEqual(homeHint({ ...base, from: 'pick', sel: 0, cur: 2 }), { key: 'hReplay', level: 0 });
  assert.deepEqual(homeHint({ ...base, from: 'pick', sel: 3, cur: 2 }), { key: 'hAhead', level: 3 });
  assert.equal(homeHint({ ...base, from: 'pick', sel: 2, cur: 2 }), null, 'back to the current level');
});

test('idle nudges towards Play; other ways home stay quiet', () => {
  assert.deepEqual(homeHint({ ...base, from: 'idle' }), { key: 'hIdle', play: true });
  for (const from of ['boot', 'paused', 'settings', 'me', undefined]) assert.equal(homeHint({ ...base, from }), null, String(from));
});
