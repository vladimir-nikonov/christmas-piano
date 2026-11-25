import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRIES, TURN_MAX, TIERS, tierFor, shuffle, newParty, countedIdx, turnPoints, currentId, maxPoints, collected,
  byPlayer, roundPoints, isOver, addTry, next, share } from '../../src/core/party.js';

// A fixed random source, so the drawn order is known.
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };

test('shuffle keeps every player once and follows the random source', () => {
  assert.deepEqual(shuffle(['a', 'b', 'c'], seq(0)), ['b', 'c', 'a']);
  assert.deepEqual(shuffle(['a', 'b', 'c'], seq(0.99)), ['a', 'b', 'c']);
  const r = shuffle(['a', 'b', 'c', 'd', 'e']);
  assert.deepEqual([...r].sort(), ['a', 'b', 'c', 'd', 'e']);
});

test('a party needs 2-6 different players and a known number of rounds', () => {
  assert.throws(() => newParty(['a'], 3, 'jingle'));
  assert.throws(() => newParty(['a', 'a'], 3, 'jingle'), 'the same player twice counts once');
  assert.throws(() => newParty(['a', 'b', 'c', 'd', 'e', 'f', 'g'], 3, 'jingle'));
  assert.throws(() => newParty(['a', 'b'], 0, 'jingle'));
  assert.throws(() => newParty(['a', 'b'], 6, 'jingle'));
  const pt = newParty(['a', 'b', 'c'], 2, 'birthday', seq(0));
  assert.deepEqual([pt.order, pt.rounds, pt.song, pt.round, pt.turn], [['b', 'c', 'a'], 2, 'birthday', 0, 0]);
  assert.equal(maxPoints(pt), 3 * 2 * TURN_MAX);
});

test('the two best tries of three count; earlier tries win ties', () => {
  assert.deepEqual(countedIdx([60, 90, 80]), [1, 2]);
  assert.deepEqual(countedIdx([70, 70, 70]), [0, 1]);
  assert.deepEqual(countedIdx([100, 10, 100]), [0, 2]);
  assert.equal(turnPoints([60, 90, 80]), 170);
  assert.equal(turnPoints([50]), 50, 'a turn in progress counts what it has');
  assert.equal(turnPoints([]), 0);
});

test('a whole party: three tries per turn, every player once per round, in the drawn order', () => {
  const pt = newParty(['a', 'b'], 2, 'jingle', seq(0.99));
  const seen = [];
  const results = [];
  for (let t = 0; t < 4; t++){
    seen.push([currentId(pt), pt.round]);
    assert.equal(addTry(pt, 50), 'again');
    assert.equal(addTry(pt, 100), 'again');
    const r = addTry(pt, 80);
    results.push(r);
    if (r !== 'final') assert.ok(next(pt));
  }
  assert.deepEqual(seen, [['a', 0], ['b', 0], ['a', 1], ['b', 1]]);
  assert.deepEqual(results, ['turn', 'round', 'turn', 'final']);
  assert.ok(isOver(pt));
  assert.equal(collected(pt), 4 * 180);
  assert.equal(byPlayer(pt, 'a'), 360);
  assert.equal(roundPoints(pt, 1), 360);
  assert.equal(share(pt), 90);
  assert.equal(addTry(pt, 100), 'final', 'nothing is added after the end');
  assert.equal(collected(pt), 720);
  assert.equal(next(pt), false);
});

test('next() waits until the turn is finished', () => {
  const pt = newParty(['a', 'b'], 1, 'jingle', seq(0.99));
  addTry(pt, 40);
  assert.equal(next(pt), false);
  assert.equal(currentId(pt), 'a');
});

test('percent is clamped and rounded', () => {
  const pt = newParty(['a', 'b'], 1, 'jingle', seq(0.99));
  addTry(pt, 140); addTry(pt, -5); addTry(pt, 33.6);
  assert.deepEqual(pt.turns[0].tries, [100, 0, 34]);
});

test('stopping early judges only the turns played, so it never takes the fireworks away', () => {
  const pt = newParty(['a', 'b', 'c'], 3, 'jingle', seq(0.99));
  assert.equal(share(pt, true), 0);
  for (let i = 0; i < TRIES; i++) addTry(pt, 95);
  assert.equal(share(pt, true), 95);
  assert.equal(share(pt), Math.round(190 / maxPoints(pt) * 100));
});

test('fireworks tiers', () => {
  assert.deepEqual(TIERS, [0, 50, 75, 90]);
  assert.deepEqual([0, 49, 50, 74, 75, 89, 90, 100].map(tierFor), [0, 0, 1, 1, 2, 2, 3, 3]);
});
