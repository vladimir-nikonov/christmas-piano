// Difficulty levels. Pure data.
//
// Each level teaches one new skill, and the help fades as the child climbs:
//   Wood     waits for each note, the start of the song, every cue (hand and finger, lit key, note names, colours)
//   Stone    waits for each note, the whole song, no hand
//   Iron     notes keep moving (timed), slow, half the song, the lit key and colours
//   Gold     timed, faster, the whole song, colours only
//   Diamond  timed at the original tempo, the whole song, only the notes
// pct: % of the song's original tempo (70% or more, so the tune stays recognisable).
// tol: timing window in seconds on timed levels (null on waiting levels).
// part: how much of the song the level plays by default (a parent can change it per song and level).
// cues: the help the level shows. hand = fingering hand on the key, key = the next key lights up,
// names = note names on the notes and keys, colours = each note in its own colour (otherwise one neutral colour).
export const LEVELS = [
  { mat:'wood',    name:'Wood',    wait:true,  pct:70,  tol:null, part:'short', cues:{ hand:true,  key:true,  names:true,  colors:true } },
  { mat:'stone',   name:'Stone',   wait:true,  pct:70,  tol:null, part:'full',  cues:{ hand:false, key:true,  names:true,  colors:true } },
  { mat:'iron',    name:'Iron',    wait:false, pct:70,  tol:0.50, part:'half',  cues:{ hand:false, key:true,  names:false, colors:true } },
  { mat:'gold',    name:'Gold',    wait:false, pct:85,  tol:0.35, part:'full',  cues:{ hand:false, key:false, names:false, colors:true } },
  { mat:'diamond', name:'Diamond', wait:false, pct:100, tol:0.25, part:'full',  cues:{ hand:false, key:false, names:false, colors:false } }
];
const ALL = Object.freeze({ hand:true, key:true, names:true, colors:true });
// The cues shown right now. The level decides; the player's options can only hide a cue, never bring back one the
// level has faded (labels 'none' hides names, hint off hides the lit key, hands off hides the hand).
// The listen-only demo and home (no level running) show every cue the options allow.
export function cuesFor(level, o, demo){
  const c = !demo && LEVELS[level] ? LEVELS[level].cues : ALL;
  return { hand: c.hand && o.hands !== false, key: c.key && !!o.hint, names: c.names && o.labels !== 'none', colors: c.colors };
}

// Stars for a result (% of notes played right). Three stars is the goal of a level: one game with three stars
// (at the level's own tempo and timing) opens the next level. 100% is a perfect game, shown as one special star.
export const STAR_AT = Object.freeze([50, 70, 85]);
export const GOAL = STAR_AT[2];
export const PERFECT = 100;
export const starsFor = pct => STAR_AT.filter(t => pct >= t).length;
// How far a best result is towards the goal, 0..1 (the progress gauge on home: full = three stars = next level).
export const goalPart = pct => Math.max(0, Math.min(1, (+pct || 0) / GOAL));
