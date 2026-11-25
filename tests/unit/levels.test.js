import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAR_AT, GOAL, PERFECT, starsFor, goalPart } from '../../src/core/levels.js';

test('stars: 1 from 50%, 2 from 70%, 3 from 85%; three stars are the goal that opens the next level', () => {
  assert.deepEqual(STAR_AT, [50, 70, 85]);
  assert.equal(GOAL, 85);
  assert.deepEqual([0, 49, 50, 69, 70, 84, 85, 99, 100].map(starsFor), [0, 0, 1, 1, 2, 2, 3, 3, 3]);
  assert.equal(PERFECT, 100);
});

test('the gauge: how far a best result is towards the goal, 0..1', () => {
  assert.equal(goalPart(0), 0);
  assert.equal(goalPart(undefined), 0);
  assert.equal(goalPart(42.5), 0.5);
  assert.equal(goalPart(85), 1);
  assert.equal(goalPart(100), 1);
});
