import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { S, E, TABLE, createFlow, viewOf } from '../../src/core/flow.js';

// Runs a list of events ([event, payload] or event) on a fresh machine; every step must be accepted.
function run(steps){
  const f = createFlow();
  for (const s of steps){ const [e, p] = Array.isArray(s) ? s : [s]; assert.ok(f.dispatch(e, p), 'step ' + e + ' from ' + f.state.name); }
  return f;
}
const MIC = [E.PLAY, { mic: true }], TOUCH = [E.PLAY, { mic: false }];
const AT = {
  Boot: [],
  Profiles: [E.HOME, E.PROFILES],
  Home: [E.HOME],
  Settings: [E.HOME, E.SETTINGS],
  Preview: [E.HOME, E.LISTEN, E.ENTERED],
  MicSetup: [E.HOME, MIC],
  MicSetupFailed: [E.HOME, MIC, [E.MIC_FAILED, { kind: 'denied' }]],
  Countdown: [E.HOME, TOUCH, E.ENTERED],
  Playing: [E.HOME, TOUCH, E.ENTERED, E.GO],
  Waiting: [E.HOME, TOUCH, E.ENTERED, E.GO, E.WAIT],
  Results: [E.HOME, TOUCH, E.ENTERED, E.GO, E.FINISH],
  LevelUp: [E.HOME, TOUCH, E.ENTERED, E.GO, E.FINISH, E.LEVEL_UP],
};
AT.Paused = [...AT.Playing, E.PAUSE];
AT.PartySetup = [E.HOME, E.PARTY];
AT.PartyDraw = [...AT.PartySetup, E.DRAW];
AT.PartyTurn = [...AT.PartyDraw, E.TURN];
AT.PartyPlaying = [...AT.PartyTurn, E.PLAY, E.GO];
AT.PartyResult = [...AT.PartyPlaying, [E.FINISH, { party: true }]];
AT.PartyRound = [...AT.PartyResult, E.ROUND];
AT.PartyFinal = [...AT.PartyTurn, E.FINAL];
// Diagram state -> machine states it stands for (Profiles covers the player list, the wizard and the child's page).
const GROUP = { Profiles: [S.PROFILES, S.NEW_PLAYER, S.ME], Boot: [S.BOOT], Home: [S.HOME], Settings: [S.SETTINGS], Preview: [S.PREVIEW],
  MicSetup: [S.MIC_SETUP], Countdown: [S.COUNTDOWN], Playing: [S.PLAYING], Waiting: [S.WAITING], Paused: [S.PAUSED], Results: [S.RESULTS], LevelUp: [S.LEVEL_UP],
  PartySetup: [S.PARTY_SETUP], PartyDraw: [S.PARTY_DRAW], PartyTurn: [S.PARTY_TURN], PartyResult: [S.PARTY_RESULT], PartyRound: [S.PARTY_ROUND], PartyFinal: [S.PARTY_FINAL] };

// One or more ways to take each edge of navigation.mmd: [start steps, event(s) taken on the edge].
const EDGES = {
  'Boot->Profiles': [[AT.Boot, [E.NEW_PLAYER]]],
  'Boot->Home': [[AT.Boot, [E.HOME]]],
  'Profiles->Home': [[AT.Profiles, [E.HOME]], [[E.NEW_PLAYER], [E.HOME]], [[E.HOME, E.ME], [E.HOME]]],
  'Home->Profiles': [[AT.Home, [E.PROFILES]], [AT.Home, [E.ME]]],
  'Home->Settings': [[AT.Home, [E.SETTINGS]]],
  'Settings->Home': [[AT.Settings, [E.HOME]]],
  'Home->Preview': [[AT.Home, [E.LISTEN, E.ENTERED]]],
  'Preview->Home': [[AT.Preview, [E.HOME]]],
  'Home->MicSetup': [[AT.Home, [MIC]]],
  'MicSetup->Home': [[AT.MicSetupFailed, [E.CANCEL]]],
  'MicSetup->Countdown': [[AT.MicSetup, [E.MIC_READY]], [AT.MicSetupFailed, [TOUCH]]],
  'Home->Countdown': [[AT.Home, [TOUCH]]],
  'Countdown->Playing': [[AT.Countdown, [E.GO]]],
  'Playing->Waiting': [[AT.Playing, [E.WAIT]]],
  'Waiting->Playing': [[AT.Waiting, [E.NOTE_OK]]],
  'Playing->Paused': [[AT.Playing, [E.PAUSE]]],
  'Waiting->Paused': [[AT.Waiting, [E.PAUSE]]],
  'Countdown->Paused': [[AT.Countdown, [E.PAUSE]]],
  'Paused->Playing': [[AT.Paused, [[E.RESUME, { timed: false }]]]],
  'Paused->Waiting': [[[...AT.Waiting, E.PAUSE], [E.RESUME]]],
  'Paused->Countdown': [[AT.Paused, [E.REPLAY]], [AT.Paused, [[E.RESUME, { timed: true }]]], [[...AT.Countdown, E.PAUSE], [E.RESUME]]],
  'Paused->Home': [[AT.Paused, [E.HOME]]],
  'Playing->Results': [[AT.Playing, [E.FINISH]]],
  'Results->LevelUp': [[AT.Results, [E.LEVEL_UP]]],
  'LevelUp->Results': [[AT.LevelUp, [E.REWARD_DONE]]],
  'Results->Countdown': [[AT.Results, [E.REPLAY]], [AT.Results, [E.NEXT]]],
  'Results->Home': [[AT.Results, [E.HOME]]],
  'Home->PartySetup': [[AT.Home, [E.PARTY]]],
  'PartySetup->Home': [[AT.PartySetup, [E.HOME]]],
  'PartySetup->Profiles': [[AT.PartySetup, [E.NEW_PLAYER]]],
  'Profiles->PartySetup': [[[...AT.PartySetup, E.NEW_PLAYER], [E.PARTY]]],
  'PartySetup->PartyDraw': [[AT.PartySetup, [E.DRAW]]],
  'PartyDraw->Home': [[AT.PartyDraw, [E.HOME]]],
  'PartyDraw->PartyTurn': [[AT.PartyDraw, [E.TURN]]],
  'PartyTurn->Countdown': [[AT.PartyTurn, [E.PLAY]]],
  'Playing->PartyResult': [[AT.PartyPlaying, [[E.FINISH, { party: true }]]]],
  'Paused->PartyTurn': [[[...AT.PartyPlaying, E.PAUSE], [E.TURN]]],
  'PartyResult->Countdown': [[AT.PartyResult, [E.REPLAY]]],
  'PartyResult->PartyTurn': [[AT.PartyResult, [E.TURN]]],
  'PartyResult->PartyRound': [[AT.PartyResult, [E.ROUND]]],
  'PartyResult->PartyFinal': [[AT.PartyResult, [E.FINAL]]],
  'PartyRound->PartyTurn': [[AT.PartyRound, [E.TURN]]],
  'PartyRound->PartyFinal': [[AT.PartyRound, [E.FINAL]]],
  'PartyTurn->PartyFinal': [[AT.PartyTurn, [E.FINAL]]],
  'PartyFinal->Home': [[AT.PartyFinal, [E.HOME]]],
  'PartyFinal->PartySetup': [[AT.PartyFinal, [E.PARTY]]],
};

const diagram = readFileSync(new URL('../../docs/ux/navigation.mmd', import.meta.url), 'utf8')
  .split('\n').map(l => l.match(/^\s*(\w+)\s*-->\s*(\w+)/)).filter(Boolean).map(m => m[1] + '->' + m[2]);

test('the diagram is read and every machine state is in it', () => {
  assert.ok(diagram.length >= 25);
  const named = new Set(diagram.flatMap(e => e.split('->')).flatMap(n => GROUP[n] || []));
  assert.deepEqual([...named].sort(), Object.values(S).sort());
  assert.deepEqual(Object.keys(TABLE).sort(), Object.values(S).sort());
});

for (const edge of diagram){
  test('edge ' + edge, () => {
    const ways = EDGES[edge];
    assert.ok(ways, 'no test for the edge ' + edge);
    const [from, to] = edge.split('->');
    for (const [start, steps] of ways){
      const f = run(start);
      assert.ok(GROUP[from].includes(f.state.name), 'start in ' + from + ', got ' + f.state.name);
      for (const s of steps){ const [e, p] = Array.isArray(s) ? s : [s]; assert.ok(f.dispatch(e, p), e + ' from ' + f.state.name); }
      assert.ok(GROUP[to].includes(f.state.name), edge + ': got ' + f.state.name);
    }
  });
}

test('every tested edge is in the diagram', () => {
  assert.deepEqual(Object.keys(EDGES).filter(e => !diagram.includes(e)), []);
});

test('level-up reward: Replay, Next and Home skip it', () => {
  for (const [e, to] of [[E.REPLAY, S.COUNTDOWN], [E.NEXT, S.COUNTDOWN], [E.HOME, S.HOME]]){
    const f = run(AT.LevelUp);
    assert.ok(f.dispatch(e)); assert.equal(f.state.name, to);
  }
});

test('pause returns to the state it came from', () => {
  for (const at of ['Playing', 'Waiting', 'Countdown']){
    const f = run(AT[at]), before = f.state;
    f.dispatch(E.PAUSE);
    assert.equal(f.state.name, S.PAUSED);
    assert.equal(f.state.data.from, before);
    f.dispatch(E.RESUME, { timed: false });
    assert.equal(f.state, before, at);
  }
});

test('resume on a running timed level counts in again; a pause during that count-in resumes into it', () => {
  const f = run([...AT.Playing, E.PAUSE]);
  f.dispatch(E.RESUME, { timed: true });
  assert.deepEqual([f.state.name, f.state.data.kind], [S.COUNTDOWN, 'resume']);
  f.dispatch(E.PAUSE);
  assert.deepEqual([f.state.data.from.name, f.state.data.from.data.kind], [S.COUNTDOWN, 'resume']);
  f.dispatch(E.RESUME, { timed: true });
  assert.deepEqual([f.state.name, f.state.data.kind], [S.COUNTDOWN, 'resume']);
  f.dispatch(E.GO);
  assert.equal(f.state.name, S.PLAYING);
});

test('a pause during the start count-in goes back to that count-in, not to a resume count-in', () => {
  const f = run([...AT.Countdown, E.PAUSE]);
  f.dispatch(E.RESUME, { timed: true });
  assert.deepEqual([f.state.name, f.state.data.kind], [S.COUNTDOWN, 'start']);
});

test('invalid events are ignored: the state does not change and subscribers are not called', () => {
  const allEvents = Object.values(E);
  for (const [name, steps] of Object.entries(AT)){
    const f = run(steps), before = f.state;
    let calls = 0; f.subscribe(() => calls++);
    for (const e of allEvents){
      if (f.can(e, { mic: true }) || f.can(e, { mic: false }) || f.can(e, { timed: true })) continue;
      assert.equal(f.dispatch(e), false, name + ' accepts ' + e);
      assert.equal(f.state, before);
    }
    assert.equal(calls, 0, name);
  }
});

test('double taps: a second Play, Replay, Next or Home is a no-op', () => {
  let f = run(AT.Home);
  assert.ok(f.dispatch(...MIC));
  assert.equal(f.dispatch(...MIC), false, 'Play while the microphone is asked');
  assert.equal(f.dispatch(...TOUCH), false);
  f = run(AT.Home);
  assert.ok(f.dispatch(...TOUCH));
  assert.equal(f.dispatch(...TOUCH), false, 'Play during the entry transition');
  assert.equal(f.dispatch(E.PAUSE), false, 'no pause during the entry transition');
  for (const e of [E.REPLAY, E.NEXT, E.HOME]){
    f = run(AT.Results);
    assert.ok(f.dispatch(e));
    assert.equal(f.dispatch(E.REPLAY), false); assert.equal(f.dispatch(E.NEXT), false);
  }
  f = run(AT.Paused);
  assert.ok(f.dispatch(E.RESUME));
  assert.equal(f.dispatch(E.RESUME), false, 'a second Resume');
});

test('the mic state: a late result after leaving is ignored; Cancel waits for the request', () => {
  let f = run(AT.MicSetup);
  assert.equal(f.dispatch(E.CANCEL), false, 'the permission flips to granted while the request is open');
  assert.ok(f.dispatch(E.SETTINGS));
  assert.equal(f.dispatch(E.MIC_READY), false);
  assert.equal(f.dispatch(E.MIC_FAILED, { kind: 'denied' }), false);
  f = run(AT.MicSetup);
  f.dispatch(E.MIC_FAILED, { kind: 'busy' });
  assert.deepEqual(f.state.data, { pending: false, kind: 'busy' });
  assert.equal(f.dispatch(E.MIC_READY), false);
  assert.ok(f.dispatch(...MIC), 'Try again');
});

test('subscribers get the new and the previous state and the event', () => {
  const f = createFlow(), seen = [];
  const off = f.subscribe((s, prev, e) => seen.push([prev.name, e, s.name]));
  f.dispatch(E.HOME); f.dispatch(E.SETTINGS);
  off(); f.dispatch(E.HOME);
  assert.deepEqual(seen, [[S.BOOT, E.HOME, S.HOME], [S.HOME, E.SETTINGS, S.SETTINGS]]);
});

test('the older state strings stay as a derived view', () => {
  const v = steps => viewOf(run(steps).state);
  assert.equal(v(AT.Boot), 'home');
  assert.equal(v(AT.Settings), 'home');
  assert.equal(v(AT.MicSetup), 'home');
  assert.equal(v([E.HOME, TOUCH]), 'home', 'home stays during the entry transition');
  assert.equal(v(AT.Countdown), 'playing');
  assert.equal(v(AT.Waiting), 'playing');
  assert.equal(v(AT.Paused), 'playing');
  assert.equal(v([E.HOME, E.LISTEN]), 'home');
  assert.equal(v(AT.Preview), 'demo');
  assert.equal(v(AT.LevelUp), 'results');
  assert.equal(v(AT.Profiles), 'profiles');
  assert.equal(v([E.NEW_PLAYER]), 'newp');
  assert.equal(v([E.HOME, E.ME]), 'me');
  assert.equal(v(AT.PartyTurn), 'party');
  assert.equal(v(AT.PartyPlaying), 'playing');
  assert.equal(v(AT.PartyResult), 'party');
});

test('party: a finished game without the party flag still goes to the ordinary results', () => {
  const f = run(AT.PartyPlaying);
  assert.ok(f.dispatch(E.FINISH));
  assert.equal(f.state.name, S.RESULTS);
});

test('party: Play on the hand-over screen starts the count-in at once, a second tap is a no-op', () => {
  const f = run(AT.PartyTurn);
  assert.ok(f.dispatch(E.PLAY, { mic: true }));
  assert.deepEqual([f.state.name, f.state.data.entering], [S.COUNTDOWN, false]);
  assert.equal(f.dispatch(E.PLAY, { mic: true }), false);
});
