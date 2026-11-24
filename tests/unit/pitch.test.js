import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectPitch } from '../../src/core/pitch.js';

const SR = 48000;
const buffer = (fn, n = 2048) => Float32Array.from({ length: n }, (_, i) => fn(i / SR));
const midiOf = f => 69 + 12 * Math.log2(f / 440);

test('finds the pitch of a pure tone across the keyboard range', () => {
  for (const midi of [60, 64, 67, 69, 72]) {
    const f = 440 * 2 ** ((midi - 69) / 12);
    const r = detectPitch(buffer(t => 0.5 * Math.sin(2 * Math.PI * f * t)), SR);
    assert.ok(r, 'no pitch for midi ' + midi);
    assert.ok(Math.abs(midiOf(r.freq) - midi) < 0.1, `midi ${midi}: got ${r.freq.toFixed(1)} Hz`);
    assert.ok(r.clarity > 0.9);
  }
});

test('a piano-like tone with overtones still gives the fundamental', () => {
  const f = 261.63;
  const r = detectPitch(buffer(t => Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(4 * Math.PI * f * t) + 0.3 * Math.sin(6 * Math.PI * f * t)), SR);
  assert.ok(Math.abs(midiOf(r.freq) - 60) < 0.1, `got ${r.freq.toFixed(1)} Hz`);
});

test('silence has no pitch', () => {
  assert.equal(detectPitch(new Float32Array(2048), SR), null);
});

test('noise is not a clear note', () => {
  let s = 1;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const r = detectPitch(buffer(rnd), SR);
  assert.ok(!r || r.clarity < 0.8, 'noise reported as a clear note');
});
