import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDB, normHist, freshDB, freshProg, prog, unlocked, DEF_OPTS, DEF_DEV, HIST_MAX } from '../../src/data/storage.js';
import { SONG_KEYS } from '../../src/core/songs.js';
import { LEVELS } from '../../src/core/levels.js';

test('empty or broken input gives a fresh database', () => {
  for (const d of [null, undefined, 'x', 42, []]) {
    const r = normalizeDB(d);
    assert.deepEqual(r.profiles, []);
    assert.equal(r.current, null);
    assert.deepEqual(r.device, DEF_DEV);
  }
  assert.deepEqual(normalizeDB(null), freshDB());
});

test('old records are upgraded and defaults filled in', () => {
  const r = normalizeDB({ profiles: [
    { id: 'a', name: 'Ann', theme: 'gone', opts: { labels: 'ru', unlockAll: true }, level: '2', avatar: 3.7 },
    { id: 'b', opts: { labels: 'en' } },
  ], current: 'missing', device: { latency: 120 } });
  const [a, b] = r.profiles;
  assert.equal(a.theme, 'pixel');
  assert.equal(a.opts.labels, 'native');
  assert.equal(b.opts.labels, 'letters');
  assert.equal('unlockAll' in a.opts, false);
  assert.equal(a.opts.tempo, DEF_OPTS.tempo);
  assert.equal(a.level, 2);
  assert.equal(a.avatar, 3);
  assert.equal(b.name, '');
  assert.deepEqual(a.sel, { level: 0, part: 'short' });
  assert.equal(r.current, 'a', 'unknown current player falls back to the first one');
  assert.deepEqual(r.device, { ...DEF_DEV, latency: 120 });
});

test('profiles without a valid id are dropped', () => {
  const r = normalizeDB({ profiles: [null, { name: 'x' }, { id: '' }, { id: 7 }, { id: 'ok' }] });
  assert.deepEqual(r.profiles.map(p => p.id), ['ok']);
});

test('result history is cleaned, capped and feeds the best result', () => {
  const many = Array.from({ length: HIST_MAX + 5 }, (_, i) => ({ at: i, pct: i * 5, stars: 1, score: 10 }));
  const h = normHist({ '0:short': many, 'birthday:2:full': [{ pct: 140, stars: 9 }, { pct: 'x' }], 'bad key': [{ pct: 1 }], '1:half': 'nope' });
  assert.deepEqual(Object.keys(h).sort(), ['0:short', 'birthday:2:full']);
  assert.equal(h['0:short'].length, HIST_MAX);
  assert.equal(h['0:short'].at(-1).pct, (HIST_MAX + 4) * 5);
  assert.deepEqual(h['birthday:2:full'], [{ at: 0, pct: 100, stars: 3, score: 0 }]);
  const r = normalizeDB({ profiles: [{ id: 'a', hist: { '0:short': [{ pct: 40 }, { pct: 90 }] }, top: { '0:short': 50 } }] });
  assert.equal(r.profiles[0].top['0:short'], 90);
});

test('per-song progress: old records give every song their level and streak', () => {
  const [p] = normalizeDB({ profiles: [{ id: 'a', level: 2, streak: 1 }] }).profiles;
  for (const k of SONG_KEYS) assert.deepEqual(p.prog[k], { level: 2, streak: 1 });
  assert.equal(p.level, 2);
});

test('per-song progress is clamped and p.level is the highest song level', () => {
  const [p] = normalizeDB({ profiles: [{ id: 'a', level: 0, prog: { jingle: { level: 99, streak: -3 }, birthday: { level: 1, streak: 1 } } }] }).profiles;
  assert.deepEqual(p.prog.jingle, { level: LEVELS.length - 1, streak: 0 });
  assert.deepEqual(p.prog.birthday, { level: 1, streak: 1 });
  assert.equal(p.level, LEVELS.length - 1);
  assert.deepEqual(freshProg(), Object.fromEntries(SONG_KEYS.map(k => [k, { level: 0, streak: 0 }])));
});

test('levels open one by one only when the parent asks, per song', () => {
  const [p] = normalizeDB({ profiles: [{ id: 'a', sel: { song: 'birthday', level: 0, part: 'short' }, prog: { jingle: { level: 3 }, birthday: { level: 1 } } }] }).profiles;
  assert.equal(prog(p).level, 1, 'selected song');
  assert.equal(unlocked(p, 4), true, 'all levels open by default');
  p.opts.lockLevels = true;
  assert.equal(unlocked(p, 2), false);
  assert.equal(unlocked(p, 2, 'jingle'), true);
});
