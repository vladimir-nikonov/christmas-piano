// Difficulty levels. Pure data.

// Levels: % of the song's original tempo and timing window (seconds).
// Even the first level stays at 70% or more so the tune is still recognisable.
export const LEVELS = [
  { mat:'wood',    name:'Wood',    wait:true,  pct:70,  tol:null },
  { mat:'stone',   name:'Stone',   wait:false, pct:78,  tol:0.50 },
  { mat:'iron',    name:'Iron',    wait:false, pct:86,  tol:0.35 },
  { mat:'gold',    name:'Gold',    wait:false, pct:93,  tol:0.25 },
  { mat:'diamond', name:'Diamond', wait:false, pct:100, tol:0.18 }
];
