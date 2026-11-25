// Songs: notes as [midi, beats], original tempo and meter, parts of growing length.

import { tx } from '../i18n/index.js';

const C4=60, D4=62, E4=64, F4=65, G4=67, A4=69, Bb4=70, C5=72;
const PART_A = [[E4,1],[E4,1],[E4,2],[E4,1],[E4,1],[E4,2],[E4,1],[G4,1],[C4,1.5],[D4,.5],[E4,4]];
const PART_B = [[F4,1],[F4,1],[F4,1.5],[F4,.5],[F4,1],[E4,1],[E4,1],[E4,.5],[E4,.5],[E4,1],[D4,1],[D4,1],[E4,1],[D4,2],[G4,2]];
const PART_C = [[F4,1],[F4,1],[F4,1.5],[F4,.5],[F4,1],[E4,1],[E4,1],[E4,.5],[E4,.5],[G4,1],[G4,1],[F4,1],[D4,1],[C4,4]];
// Happy Birthday in F major so it fits the C4..C5 keyboard; original 3/4 rhythm with the dotted "hap-py" pickup
const HB_1 = [[C4,.75],[C4,.25],[D4,1],[C4,1],[F4,1],[E4,2]];
const HB_2 = [[C4,.75],[C4,.25],[D4,1],[C4,1],[G4,1],[F4,2]];
const HB_3 = [[C4,.75],[C4,.25],[C5,1],[A4,1],[F4,1],[E4,1],[D4,1]];
const HB_4 = [[Bb4,.75],[Bb4,.25],[A4,1],[F4,1],[G4,1],[F4,2]];
// Songs: bpm is the original tempo (level % applies to it), meter is the count-in length.
// Jingle Bells keeps the old best-score keys ("level:part"); other songs prefix them with "song:".
// fingers: midi -> 'R3' (hand + finger, 1 = thumb .. 5 = little finger). Each song keeps one hand position,
// so a note is always played by the same finger.
//   Jingle Bells: right hand in C position (C=1 .. G=5).
//   Happy Birthday: left hand on C..E (C=5, D=4, E=3), right hand in F position (F=1 .. C=5).
export const SONGS = {
  jingle:   { title:() => 'Jingle Bells', bpm:120, meter:4, fingers:{ [C4]:'R1', [D4]:'R2', [E4]:'R3', [F4]:'R4', [G4]:'R5' }, parts:{ short: PART_A, half: PART_A.concat(PART_B), full: PART_A.concat(PART_B, PART_A, PART_C) } },
  birthday: { title:() => tx('songBirthday'), bpm:100, meter:3,
              fingers:{ [C4]:'L5', [D4]:'L4', [E4]:'L3', [F4]:'R1', [G4]:'R2', [A4]:'R3', [Bb4]:'R4', [C5]:'R5' }, parts:{ short: HB_1, half: HB_1.concat(HB_2), full: HB_1.concat(HB_2, HB_3, HB_4) } }
};
export const SONG_KEYS = ['jingle','birthday'];
export const songKey = p => SONGS[p.sel.song] ? p.sel.song : 'jingle';
export const bestKey = (song, level, part) => (song === 'jingle' ? '' : song + ':') + level + ':' + part;
export const PART_KEYS = ['short','half','full'];
// Which hand and finger play a note of a song: { hand: 'L' | 'R', finger: 1..5 }, or null when the song has no fingering for it.
export function fingerFor(song, midi){
  const f = SONGS[song] && SONGS[song].fingers && SONGS[song].fingers[midi];
  return f ? { hand: f[0], finger: +f[1] } : null;
}
