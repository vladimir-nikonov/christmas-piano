// Theme data: every theme has a complete motion descriptor within the spec's timing limits.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { THEMES, THEME_MOTION } from '../../src/ui/theme-data.js';

test('every theme has a motion descriptor', () => {
  assert.deepEqual(Object.keys(THEME_MOTION).sort(), Object.keys(THEMES).sort());
});
test('motion descriptors are complete and keep the timing limits', () => {
  for (const [k, m] of Object.entries(THEME_MOTION)){
    for (const f of ['ease', 'entry', 'ring', 'part', 'unlock', 'flight']) assert.ok(m[f] !== undefined, k + ': ' + f);
    assert.ok(m.entry.dur >= 250 && m.entry.dur <= 400, k + ': entry takes 250-400 ms');
    assert.ok(m.part.life <= 600, k + ': particles are short');
    assert.ok(m.part.n > 0 && m.part.n <= 20, k + ': a light particle count');
    for (const f of ['kind', 'spread', 'rise', 'fall', 'spin', 'end', 'ease']) assert.ok(m.part[f] !== undefined, k + ': part.' + f);
  }
});
