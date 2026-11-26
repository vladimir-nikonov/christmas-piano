import test from 'node:test';
import assert from 'node:assert/strict';
import { octaveDots, KEY_LO, KEY_HI, STICKER_LOW, STICKER_HIGH } from '../../src/core/music.js';

test('sticker octave dots: one dot from the lowest C of a 61-key keyboard, six on its top C', () => {
  assert.equal(STICKER_HIGH - STICKER_LOW + 1, 61);
  assert.equal(octaveDots(STICKER_LOW), 1);
  assert.equal(octaveDots(STICKER_HIGH), 6);
});

test('the game keys are middle C (three dots) up to the next C (four dots)', () => {
  assert.equal(octaveDots(KEY_LO), 3);
  assert.equal(octaveDots(KEY_HI - 1), 3);
  assert.equal(octaveDots(KEY_HI), 4);
});
