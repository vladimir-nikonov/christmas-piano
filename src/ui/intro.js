// How-to-play intro for a new player: a few slides, each a picture in the current theme's colours plus a title and one line.

import { ICON } from './icons.js';
import { TH } from './theme.js';

// Slide i: [title key, text key, picture]
export const INTRO = [
  ['introFallT', 'introFall', fallPic],
  ['introPlayT', 'introPlay', playPic],
  ['introStarsT', 'introStars', starsPic],
];

const W = 320, H = 200;
const svg = body => '<svg class="ipv" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' + body + '</svg>';
// A stroked or filled pack icon at (x, y) with size s
const ico = (name, x, y, s, col, fill) => '<path d="' + ICON[name] + '" transform="translate(' + x + ' ' + y + ') scale(' + (s / 24) + ')" fill="' + (fill ? col : 'none') + '" stroke="' + col + '" stroke-width="' + (48 / s) + '" stroke-linejoin="round" stroke-linecap="round"/>';

// A small keyboard: 7 white keys with black keys, top-left at (x, y); lit = index of the lit white key
function keyboard(x, y, w, h, lit){
  const kw = w / 7; let s = '';
  for (let i = 0; i < 7; i++) s += '<rect x="' + (x + i * kw + 1) + '" y="' + y + '" width="' + (kw - 2) + '" height="' + h + '" rx="3" fill="' + (i === lit ? TH.accent : '#F6F7FB') + '"/>';
  [0, 1, 3, 4, 5].forEach(i => { s += '<rect x="' + (x + (i + 1) * kw - kw * .3) + '" y="' + y + '" width="' + (kw * .6) + '" height="' + (h * .6) + '" rx="2" fill="#1d2230"/>'; });
  return s;
}

// 1. Notes fall down to the keys: play the key when the note reaches the line
function fallPic(){
  const x = 50, w = 220, kw = w / 7, line = 132;
  const note = (k, y, h, op) => '<rect class="inote" x="' + (x + k * kw + 4) + '" y="' + y + '" width="' + (kw - 8) + '" height="' + h + '" rx="6" fill="' + TH.accent + '" opacity="' + op + '"/>';
  return svg('<rect width="' + W + '" height="' + H + '" rx="14" fill="' + TH.bg + '"/>' +
    note(1, 14, 34, .55) + note(4, 52, 40, .8) + note(2, 92, 40, 1) +
    '<rect x="' + (x - 8) + '" y="' + line + '" width="' + (w + 16) + '" height="5" rx="2.5" fill="' + TH.reward + '"/>' +
    keyboard(x, line + 10, w, 50, 2));
}

// 2. Play on your own piano (the tablet listens) or tap the keys on the screen
function playPic(){
  return svg('<rect width="' + W + '" height="' + H + '" rx="14" fill="' + TH.bg + '"/>' +
    '<circle cx="80" cy="72" r="44" fill="' + TH.panel + '" stroke="' + TH.border + '" stroke-width="3"/>' + ico('mic', 56, 48, 48, TH.accent) +
    '<path d="M132 60Q142 72 132 84M144 52Q160 72 144 92" fill="none" stroke="' + TH.reward + '" stroke-width="4" stroke-linecap="round"/>' +
    keyboard(20, 136, 120, 48, -1) +
    '<text x="160" y="110" text-anchor="middle" font-size="26" font-weight="900" fill="' + TH.text + '" opacity=".6">/</text>' +
    keyboard(180, 96, 120, 88, 3) +
    '<circle cx="' + (180 + 120 / 7 * 3.5) + '" cy="164" r="13" fill="' + TH.reward + '" opacity=".9"/>' +
    '<circle cx="' + (180 + 120 / 7 * 3.5) + '" cy="164" r="22" fill="none" stroke="' + TH.reward + '" stroke-width="3" opacity=".5"/>');
}

// 3. Clean playing earns up to three stars; good results open the next level
function starsPic(){
  const star = (x, y, s, on) => ico('star', x, y, s, on ? TH.reward : TH.border, on);
  return svg('<rect width="' + W + '" height="' + H + '" rx="14" fill="' + TH.bg + '"/>' +
    star(52, 34, 60, true) + star(130, 18, 72, true) + star(220, 34, 60, true) +
    '<rect x="60" y="128" width="56" height="56" rx="' + Math.min(TH.radius, 12) + '" fill="' + TH.panel + '" stroke="' + TH.accent + '" stroke-width="4"/>' + ico('check', 72, 140, 32, TH.accent) +
    '<path d="M134 156H182M170 144L182 156L170 168" fill="none" stroke="' + TH.text + '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/>' +
    '<rect x="200" y="128" width="56" height="56" rx="' + Math.min(TH.radius, 12) + '" fill="' + TH.panel + '" stroke="' + TH.reward + '" stroke-width="4"/>' + ico('play', 214, 142, 28, TH.reward, true));
}
