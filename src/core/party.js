// Party ("Together") mode: several players share one tablet and play as one team. Pure: no DOM, no timers.
//
// The order is drawn once at the start. A round is one turn per player, in that order; a turn is TRIES games in a row
// of the player's own current level of the party song. The best COUNTED tries of each turn go to the team bank
// (% of notes played right, so up to COUNTED * 100 per turn). The goal is shared: collect as much of the maximum
// (players x rounds x COUNTED * 100) as possible. At the end the team gets fireworks; how big depends on the share.

export const TRIES = 3, COUNTED = 2, TURN_MAX = COUNTED * 100;
export const MIN_PLAYERS = 2, MAX_PLAYERS = 6;
export const ROUNDS = Object.freeze([1, 2, 3, 4, 5]);
export const DEF_ROUNDS = 3;
// Fireworks by the team's share of the maximum, in %: sparklers, fireworks, big fireworks, golden fireworks.
export const TIERS = Object.freeze([0, 50, 75, 90]);
export const tierFor = pct => TIERS.reduce((t, min, i) => pct >= min ? i : t, 0);

// Fisher-Yates with an injectable random source (tests pass a fixed one).
export function shuffle(list, rnd = Math.random){
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// A new party: ids in drawn order, rounds to play. turns: the finished turns { id, round, tries }; cur: the turn in progress.
export function newParty(ids, rounds, song, rnd = Math.random){
  const uniq = [...new Set(ids)];
  if (uniq.length < MIN_PLAYERS || uniq.length > MAX_PLAYERS) throw new Error('party: ' + MIN_PLAYERS + '-' + MAX_PLAYERS + ' players');
  if (!ROUNDS.includes(rounds)) throw new Error('party: rounds ' + rounds);
  const order = shuffle(uniq, rnd);
  return { order, rounds, song, round: 0, turn: 0, tries: [], turns: [] };
}

// Indices of the tries that count (the COUNTED best; earlier tries win ties), and their sum.
export function countedIdx(tries){
  return tries.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).slice(0, COUNTED).map(x => x[1]).sort((a, b) => a - b);
}
export const turnPoints = tries => countedIdx(tries).reduce((t, i) => t + tries[i], 0);

export const currentId = pt => pt.order[pt.turn];
export const totalTurns = pt => pt.order.length * pt.rounds;
export const maxPoints = pt => totalTurns(pt) * TURN_MAX;
export const collected = pt => pt.turns.reduce((t, x) => t + turnPoints(x.tries), 0);
export const byPlayer = (pt, id) => pt.turns.filter(x => x.id === id).reduce((t, x) => t + turnPoints(x.tries), 0);
export const roundPoints = (pt, round) => pt.turns.filter(x => x.round === round).reduce((t, x) => t + turnPoints(x.tries), 0);
export const isOver = pt => pt.turns.length >= totalTurns(pt);

// Records one finished try of the current player and says what comes next:
//   'again' another try of this turn, 'turn' the next player's turn, 'round' the round is over, 'final' the party is over.
// A finished turn moves into turns at once, so the bank already holds it; next() then moves on to the next turn.
export function addTry(pt, pct){
  if (isOver(pt)) return 'final';
  pt.tries.push(Math.max(0, Math.min(100, Math.round(+pct || 0))));
  if (pt.tries.length < TRIES) return 'again';
  pt.turns.push({ id: currentId(pt), round: pt.round, tries: pt.tries });
  pt.tries = [];
  if (isOver(pt)) return 'final';
  return pt.turn + 1 < pt.order.length ? 'turn' : 'round';
}
// After a finished turn: the next player, or the first player of the next round (the drawn order stays).
export function next(pt){
  if (isOver(pt) || pt.tries.length) return false;
  const done = pt.turns.length;
  pt.round = Math.floor(done / pt.order.length);
  pt.turn = done % pt.order.length;
  return true;
}
// The share the fireworks are judged on, in %. Stopped early: only the turns actually played count, so stopping
// never takes the fireworks away. Nothing played yet: 0.
export function share(pt, early = false){
  const max = early ? pt.turns.length * TURN_MAX : maxPoints(pt);
  return max ? Math.round(collected(pt) / max * 100) : 0;
}
