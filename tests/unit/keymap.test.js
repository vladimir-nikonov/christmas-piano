import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KEY_CODES, midiForCode, letterFor } from '../../src/core/keymap.js';

test('every note of the drawn keyboard C4..C5 has exactly one computer key', () => {
  const notes = Object.values(KEY_CODES).sort((a, b) => a - b);
  assert.deepEqual(notes, Array.from({ length: 13 }, (_, i) => 60 + i));
});

test('home row plays white keys, the row above plays black keys', () => {
  assert.equal(midiForCode('KeyA'), 60);
  assert.equal(midiForCode('KeyK'), 72);
  assert.equal(midiForCode('KeyW'), 61);
  assert.equal(midiForCode('KeyQ'), null);
  assert.equal(midiForCode('toString'), null);
  assert.equal(letterFor(64), 'D');
  assert.equal(letterFor(59), '');
});
