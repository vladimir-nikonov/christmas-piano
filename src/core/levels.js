// Difficulty levels. Pure data.

// Levels: % of the song's original tempo and timing window (seconds).
// Even the first level stays at 70% or more so the tune is still recognisable.
// part: how much of the song the level plays by default (a parent can change it per song and level).
export const LEVELS = [
  { mat:'wood',    name:'Wood',    wait:true,  pct:70,  tol:null, part:'short' },
  { mat:'stone',   name:'Stone',   wait:false, pct:78,  tol:0.50, part:'half' },
  { mat:'iron',    name:'Iron',    wait:false, pct:86,  tol:0.35, part:'full' },
  { mat:'gold',    name:'Gold',    wait:false, pct:93,  tol:0.25, part:'full' },
  { mat:'diamond', name:'Diamond', wait:false, pct:100, tol:0.18, part:'full' }
];
