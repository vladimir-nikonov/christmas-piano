// Central navigation state machine (docs/ux/navigation.mmd). Pure: no DOM, no timers.
// Screens and handlers dispatch events; one UI subscriber (src/ui/nav.js) maps the state to the visible screens.
// An event that has no edge from the current state, or whose guard fails, is ignored and dispatch() returns false:
// that is what makes double taps, late taps and overlapping timers harmless.

export const S = Object.freeze({
  BOOT: 'boot',
  PROFILES: 'profiles', NEW_PLAYER: 'newPlayer', ME: 'me', // the "Profiles" group of the diagram
  HOME: 'home', SETTINGS: 'settings', PREVIEW: 'preview', MIC_SETUP: 'micSetup',
  COUNTDOWN: 'countdown', PLAYING: 'playing', WAITING: 'waiting', PAUSED: 'paused',
  RESULTS: 'results', LEVEL_UP: 'levelUp',
  // Party ("Together", src/core/party.js): pick the team, draw the order, hand the tablet over, a try's result,
  // the end of a round, the team's fireworks
  PARTY_SETUP: 'partySetup', PARTY_DRAW: 'partyDraw', PARTY_TURN: 'partyTurn', PARTY_RESULT: 'partyResult',
  PARTY_ROUND: 'partyRound', PARTY_FINAL: 'partyFinal',
});

export const E = Object.freeze({
  HOME: 'home',             // go to home: player chosen or created, close, exit, end of the demo
  NEW_PLAYER: 'newPlayer',  // the new player wizard (no profile yet, or "+" on the player list)
  PROFILES: 'profiles',     // the player list (avatar on home, Back in the wizard)
  ME: 'me',                 // the child's own page
  SETTINGS: 'settings',     // parent settings over home
  LISTEN: 'listen',         // demo of the tune; starts with the entry transition
  PLAY: 'play',             // payload { mic }: with mic the microphone is asked first (MicSetup)
  MIC_READY: 'micReady', MIC_FAILED: 'micFailed', CANCEL: 'cancel',
  ENTERED: 'entered',       // the entry transition from home is over: the game screen is shown
  GO: 'go',                 // the count-in is over
  WAIT: 'wait', NOTE_OK: 'noteOk', // waiting levels: the clock stops at a note / the right note was played
  PAUSE: 'pause',
  RESUME: 'resume',         // payload { timed }: a timed level counts the child back in
  REPLAY: 'replay', NEXT: 'next',
  FINISH: 'finish', LEVEL_UP: 'levelUp', REWARD_DONE: 'rewardDone', // FINISH payload { party }: a party try's result
  PARTY: 'party',           // party setup (Together on home, back from the new player wizard, play together again)
  DRAW: 'draw',             // draw the order
  TURN: 'turn',             // the hand-over screen of the next (or the same, after leaving a try) player
  ROUND: 'round',           // the round is over
  FINAL: 'final',           // the party is over (or stopped): fireworks
});

const st = (name, data = {}) => Object.freeze({ name, data: Object.freeze(data) });
// Countdown kinds: 'start' (count-in before the first note) or 'resume' (count-in after a pause on a timed level).
// entering: the entry transition from home is still running, home stays on screen.
const countdown = (kind, entering = false) => st(S.COUNTDOWN, { kind, entering });
const pause = (d, p, s) => st(S.PAUSED, { from: s });
const play = (d, p) => p.mic ? st(S.MIC_SETUP, { pending: true }) : countdown('start', true);
const startOver = () => countdown('start');
const fromHome = { [E.PARTY]: S.PARTY_SETUP, [E.PROFILES]: S.PROFILES, [E.ME]: S.ME, [E.SETTINGS]: S.SETTINGS, [E.LISTEN]: () => st(S.PREVIEW, { entering: true }), [E.PLAY]: play };
const unlessEntering = f => (d, p, s) => d.entering ? null : f(d, p, s);

// state -> event -> target state name | state | (data, payload, state) => state | name | null (guard failed)
export const TABLE = Object.freeze({
  [S.BOOT]: { [E.HOME]: S.HOME, [E.NEW_PLAYER]: S.NEW_PLAYER },
  [S.PROFILES]: { [E.HOME]: S.HOME, [E.NEW_PLAYER]: S.NEW_PLAYER, [E.ME]: S.ME },
  [S.NEW_PLAYER]: { [E.HOME]: S.HOME, [E.PROFILES]: S.PROFILES, [E.PARTY]: S.PARTY_SETUP },
  [S.ME]: { [E.HOME]: S.HOME, [E.PROFILES]: S.PROFILES },
  [S.HOME]: { ...fromHome },
  [S.SETTINGS]: { [E.HOME]: S.HOME, [E.ME]: S.ME, [E.NEW_PLAYER]: S.NEW_PLAYER },
  // The mic state lives on home, so home's buttons keep working; Play again (Try again) only once the request is over.
  [S.MIC_SETUP]: {
    ...fromHome,
    [E.PLAY]: (d, p) => d.pending ? null : play(d, p),
    [E.MIC_READY]: d => d.pending ? countdown('start', true) : null,
    [E.MIC_FAILED]: (d, p) => d.pending ? st(S.MIC_SETUP, { pending: false, kind: p.kind || 'other' }) : null,
    [E.CANCEL]: d => d.pending ? null : S.HOME,
  },
  [S.PREVIEW]: {
    [E.ENTERED]: d => d.entering ? st(S.PREVIEW, { entering: false }) : null,
    [E.HOME]: unlessEntering(() => S.HOME),
  },
  [S.COUNTDOWN]: {
    [E.ENTERED]: d => d.entering ? countdown(d.kind) : null,
    [E.GO]: unlessEntering(() => S.PLAYING),
    [E.PAUSE]: unlessEntering(pause),
  },
  [S.PLAYING]: { [E.WAIT]: S.WAITING, [E.PAUSE]: pause, [E.FINISH]: (d, p) => p.party ? S.PARTY_RESULT : S.RESULTS },
  [S.WAITING]: { [E.NOTE_OK]: S.PLAYING, [E.PAUSE]: pause },
  [S.PAUSED]: {
    // Back to where the pause came from; a running timed level (or its resume count-in) counts in again.
    [E.RESUME]: (d, p) => {
      const f = d.from;
      return p.timed && (f.name === S.PLAYING || (f.name === S.COUNTDOWN && f.data.kind === 'resume')) ? countdown('resume') : f;
    },
    [E.REPLAY]: startOver,
    [E.HOME]: S.HOME,
    [E.TURN]: S.PARTY_TURN, // leaving a party try: back to the hand-over screen, the try does not count
  },
  [S.RESULTS]: { [E.LEVEL_UP]: S.LEVEL_UP, [E.REPLAY]: startOver, [E.NEXT]: startOver, [E.HOME]: S.HOME },
  // Replay / Next / Home also skip the reward.
  [S.LEVEL_UP]: { [E.REWARD_DONE]: S.RESULTS, [E.REPLAY]: startOver, [E.NEXT]: startOver, [E.HOME]: S.HOME },
  [S.PARTY_SETUP]: { [E.HOME]: S.HOME, [E.NEW_PLAYER]: S.NEW_PLAYER, [E.DRAW]: S.PARTY_DRAW },
  [S.PARTY_DRAW]: { [E.TURN]: S.PARTY_TURN, [E.HOME]: S.HOME },
  // Play on the hand-over screen starts the count-in at once: the screen itself is the transition
  [S.PARTY_TURN]: { [E.PLAY]: startOver, [E.FINAL]: S.PARTY_FINAL },
  [S.PARTY_RESULT]: { [E.REPLAY]: startOver, [E.TURN]: S.PARTY_TURN, [E.ROUND]: S.PARTY_ROUND, [E.FINAL]: S.PARTY_FINAL },
  [S.PARTY_ROUND]: { [E.TURN]: S.PARTY_TURN, [E.FINAL]: S.PARTY_FINAL },
  [S.PARTY_FINAL]: { [E.HOME]: S.HOME, [E.PARTY]: S.PARTY_SETUP },
});

export function createFlow(initial = st(S.BOOT)){
  let cur = initial;
  const subs = new Set();
  const next = (event, payload) => {
    const row = TABLE[cur.name], h = row && row[event];
    if (h === undefined) return null;
    const r = typeof h === 'function' ? h(cur.data, payload || {}, cur) : h;
    return !r ? null : typeof r === 'string' ? st(r) : r;
  };
  return {
    get state(){ return cur; },
    is: (...names) => names.includes(cur.name),
    can: (event, payload) => !!next(event, payload),
    dispatch(event, payload){
      const n = next(event, payload); if (!n) return false;
      const prev = cur; cur = n;
      subs.forEach(f => f(cur, prev, event));
      return true;
    },
    subscribe(f){ subs.add(f); return () => subs.delete(f); },
  };
}

// The older app-wide state strings, kept as a derived view for the code (and the smoke test) that reads them:
// 'home' | 'profiles' | 'newp' | 'me' | 'playing' | 'demo' | 'results' | 'party'.
export function viewOf(s){
  switch (s.name){
    case S.PROFILES: return 'profiles';
    case S.NEW_PLAYER: return 'newp';
    case S.ME: return 'me';
    case S.COUNTDOWN: return s.data.entering ? 'home' : 'playing';
    case S.PREVIEW: return s.data.entering ? 'home' : 'demo';
    case S.PLAYING: case S.WAITING: case S.PAUSED: return 'playing';
    case S.RESULTS: case S.LEVEL_UP: return 'results';
    case S.PARTY_SETUP: case S.PARTY_DRAW: case S.PARTY_TURN: case S.PARTY_RESULT: case S.PARTY_ROUND: case S.PARTY_FINAL: return 'party';
    default: return 'home'; // boot, home, settings (a panel over home), micSetup (the mic state on home)
  }
}

// The app's single machine. view / paused are live bindings, updated before any other subscriber runs.
export const flow = createFlow();
export let view = viewOf(flow.state), paused = false;
flow.subscribe(s => { view = viewOf(s); paused = s.name === S.PAUSED; });
export const dispatch = (event, payload) => flow.dispatch(event, payload);
export const can = (event, payload) => flow.can(event, payload);
export const is = (...names) => flow.is(...names);
