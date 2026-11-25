// Together (party) mode screens: one panel (#party) whose content follows the party state of the navigation machine.
//   setup  pick the team (saved players or a new one), the song and the number of rounds
//   draw   the order is drawn and shown one player at a time
//   turn   the hand-over screen: whose turn it is, in their own theme and language, and a big Play
//   result after a try: its %, which tries count so far; after the third try what the turn adds to the team bank
//   round  what the team collected this round
//   final  the team's fireworks, sized by the share of the maximum collected
// The rules and the score live in src/core/party.js; the game itself is the ordinary one (src/game/game.js), which
// reports each finished party try here through partyTry().

import { audio } from '../../audio/synth.js';
import * as PT from '../../core/party.js';
import { SONGS, SONG_KEYS, songKey } from '../../core/songs.js';
import { E, S, dispatch, can, is, flow } from '../../core/flow.js';
import { db, save, P, prog } from '../../data/storage.js';
import { $ } from '../../dom.js';
import { G, startGame, setGame } from '../../game/game.js';
import { tx } from '../../i18n/index.js';
import { startMic } from '../../input/mic.js';
import { avatarSVG, blockSVG } from '../art.js';
import { px } from '../canvas.js';
import { icon } from '../icons.js';
import { syncLang } from '../lang.js';
import { reducedMotion } from '../motion.js';
import { applyTheme } from '../theme.js';
import { goHome } from './home.js';
import { openNewProfile } from './profiles.js';

const STATES = new Set([S.PARTY_SETUP, S.PARTY_DRAW, S.PARTY_TURN, S.PARTY_RESULT, S.PARTY_ROUND, S.PARTY_FINAL]);
// One colour per player in the drawn order: their share of the team bank, their place in the queue.
const COLORS = ['#F49AD1', '#7FC8F8', '#8FE0B0', '#FFB27A', '#C7A6FF', '#FFE07A'];
const DRAW_MS = 700, AUTO_MS = 6000;
const MIC_HINT = { denied:'micDenied', missing:'micMissing', busy:'micBusy', other:'micOther' };

let pt = null;                                  // the party being played (null outside a party)
let host = null;                                // the player who opened Together: home comes back to them
let pick = new Set(), rounds = PT.DEF_ROUNDS, song = 'jingle';
let last = null;                                // the try just finished: { pct, step, levelUp, level }
let early = false, drawn = 0, timer = 0, micBusy = false, micKind = null;
// The team chose to play without the microphone after it failed: Play stops asking for the rest of this visit
// (screen taps and the computer keyboard always count).
let micSkipped = false;

// The game asks this when a try finishes: is it a party try?
export const partyOn = () => !!pt;
const byId = id => db.profiles.find(p => p.id === id);
const nameOf = p => (p && p.name) || tx('noName');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
const fill = (k, v) => Object.keys(v).reduce((s, n) => s.split('{' + n + '}').join(v[n]), tx(k));
// Every screen of a turn speaks in the player's theme and language; the other screens in the host's.
function use(id){
  if (byId(id)) db.current = id;
  const p = P(); if (p) applyTheme(p.theme);
  syncLang();
}

/* ---- Entering and leaving ---- */
export function openParty(){
  if (!can(E.PARTY)) return;
  host = db.current;
  const ids = db.profiles.map(p => p.id);
  pick = new Set([...pick].filter(id => ids.includes(id)));
  if (pick.size < PT.MIN_PLAYERS) pick = new Set(ids.slice(0, PT.MAX_PLAYERS));
  song = songKey(P());
  dispatch(E.PARTY);
}
function leaveParty(){
  stopFw(); pt = null;
  if (byId(host)) db.current = host;
  save(); goHome();
}
// Home from a paused party try: the try does not count and the same player gets the hand-over screen again.
export function leaveTry(){
  if (!pt || !is(S.PAUSED)) return false;
  if (G) G.finished = true;
  setGame(null);
  return dispatch(E.TURN);
}
// A finished party try (called by the game after it has saved the result to the player's profile).
export function partyTry({ metric, levelUp, level }){
  if (!pt) return;
  const step = PT.addTry(pt, metric);
  last = { pct: metric, step, levelUp, level };
  render();
  if (step !== 'again') timer = setTimeout(pass, AUTO_MS);
}

flow.subscribe((s, prev) => {
  clearTimeout(timer);
  if (STATES.has(prev.name) && !STATES.has(s.name)) stopFw();
  if (!STATES.has(s.name)) return;
  switch (s.name){
    case S.PARTY_SETUP: pt = null; use(host); break;
    case S.PARTY_DRAW: use(host); drawn = reducedMotion ? pt.order.length : 0; if (!reducedMotion) timer = setTimeout(reveal, DRAW_MS); break;
    case S.PARTY_TURN: micKind = null; use(PT.currentId(pt)); break;
    case S.PARTY_RESULT: return; // partyTry() renders once the try is recorded
    case S.PARTY_ROUND: use(host); break;
    case S.PARTY_FINAL: use(host); break;
  }
  render();
  if (s.name === S.PARTY_FINAL) startFw(PT.tierFor(PT.share(pt, early)));
});
function reveal(){
  if (!is(S.PARTY_DRAW)) return;
  drawn++; render();
  if (drawn < pt.order.length) timer = setTimeout(reveal, DRAW_MS);
}

/* ---- Actions ---- */
async function play(){
  if (micBusy || !can(E.PLAY)) return;
  audio();
  const mic = !micSkipped;
  if (mic){
    micBusy = true; const r = await startMic(); micBusy = false;
    if (!is(S.PARTY_TURN)) return;
    if (!r.ok){ micKind = r.kind; render(); return; }
  }
  micKind = null;
  if (!dispatch(E.PLAY, { mic })) return;
  const p = P(); p.sel.song = pt.song; p.sel.level = prog(p, pt.song).level; save();
  startGame(false);
}
function pass(){
  if (!is(S.PARTY_RESULT) || !last || last.step === 'again') return;
  if (last.step === 'final'){ early = false; dispatch(E.FINAL); return; }
  if (last.step === 'round'){ dispatch(E.ROUND); return; }
  PT.next(pt); dispatch(E.TURN);
}
const ACTIONS = {
  pick: b => { const id = b.dataset.id; if (pick.has(id)) pick.delete(id); else if (pick.size < PT.MAX_PLAYERS) pick.add(id); render(); },
  song: b => { song = b.dataset.k; render(); },
  rounds: b => { rounds = +b.dataset.r; render(); },
  add: () => openNewProfile(made => { if (made) pick.add(db.current); dispatch(E.PARTY); }),
  draw: () => { if (pick.size < PT.MIN_PLAYERS) return; pt = PT.newParty([...pick], rounds, song); dispatch(E.DRAW); },
  go: () => { if (drawn >= pt.order.length) dispatch(E.TURN); },
  play,
  touch: () => { micSkipped = true; play(); },
  again: () => { if (dispatch(E.REPLAY)) startGame(false); },
  pass,
  nextRound: () => { PT.next(pt); dispatch(E.TURN); },
  more: () => { stopFw(); pt = null; dispatch(E.PARTY); },
  home: leaveParty,
};
$('#ptyBody').addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b && !b.disabled) ACTIONS[b.dataset.a](b); });
// The cross: close the setup or the draw; stop a party in progress (fireworks for the turns played); leave the fireworks.
$('#btnPartyClose').onclick = () => {
  if (is(S.PARTY_SETUP, S.PARTY_DRAW, S.PARTY_FINAL)) leaveParty();
  else if (is(S.PARTY_TURN, S.PARTY_ROUND)){ early = !PT.isOver(pt); dispatch(E.FINAL); }
};
$('#btnParty').onclick = openParty;
document.addEventListener('keydown', e => {
  if ((e.key !== 'Enter' && e.key !== ' ') || $('#party').hidden) return;
  const a = document.activeElement; if (a && a.tagName === 'BUTTON' && a.closest('#party')) return;
  const b = $('#ptyBody .primary:not([disabled])'); if (b){ e.preventDefault(); b.click(); }
});

/* ---- Views ---- */
export function renderParty(){ if (STATES.has(flow.state.name)) render(); }
function render(){
  const s = flow.state.name, close = $('#btnPartyClose');
  close.hidden = s === S.PARTY_RESULT;
  close.dataset.ta = s === S.PARTY_TURN || s === S.PARTY_ROUND ? 'ptStop' : 'close';
  close.setAttribute('aria-label', tx(close.dataset.ta));
  $('#party').dataset.view = s;
  $('#ptyBody').innerHTML = (VIEWS[s] || (() => ''))();
}
const avatar = (p, n) => avatarSVG(p.avatar, px(n), p.theme);
const btn = (a, ico, label, cls = 'primary', attrs = '') => '<button class="b ' + cls + ' ptygo" data-a="' + a + '"' + attrs + '>' + ico + '<span>' + esc(label) + '</span></button>';
const dots = n => '<div class="ptydots" aria-label="' + esc(fill('ptTry', { n, t: PT.TRIES })) + '">' + Array.from({ length: PT.TRIES }, (_, i) => '<i class="' + (i < n ? 'on' : i === n ? 'now' : '') + '"></i>').join('') + '</div>';
function meter(fresh, legend){
  const max = early ? Math.max(1, pt.turns.length) * PT.TURN_MAX : PT.maxPoints(pt), got = PT.collected(pt), pc = got / max * 100;
  const segs = pt.order.map((id, i) => { const v = PT.byPlayer(pt, id); return v ? '<i class="' + (id === fresh ? 'new' : '') + '" style="width:' + (v / max * 100) + '%;background:' + COLORS[i] + '"></i>' : ''; }).join('');
  const marks = PT.TIERS.slice(1).map(m => '<span class="mk' + (pc >= m ? ' hit' : '') + '" style="left:' + m + '%">' + icon('star', { fill: true }) + '</span>').join('');
  const leg = legend ? '<div class="leg">' + pt.order.map((id, i) => '<span><i style="background:' + COLORS[i] + '"></i>' + esc(nameOf(byId(id))) + ' ' + PT.byPlayer(pt, id) + '%</span>').join('') + '</div>' : '';
  return '<div class="ptymeter"><div class="top"><span>' + esc(tx('ptBank')) + '</span><b>' + esc(fill('ptOf', { got, max })) + '</b></div>' +
    '<div class="track"><div class="fill">' + segs + '</div>' + marks + '</div>' + leg + '</div>';
}
function queue(){
  return '<div class="ptyqueue">' + pt.order.map((id, i) => {
    const p = byId(id), t = pt.turns.find(x => x.id === id && x.round === pt.round);
    return '<span class="q' + (i === pt.turn ? ' cur' : t ? ' done' : '') + '" style="--pc:' + COLORS[i] + '">' + avatar(p, i === pt.turn ? 60 : 46) + (t ? '<b>+' + PT.turnPoints(t.tries) + '%</b>' : '') + '</span>';
  }).join('') + '</div>';
}
const VIEWS = {
  [S.PARTY_SETUP]: () => {
    const n = pick.size;
    const tiles = db.profiles.map(p => {
      const on = pick.has(p.id);
      return '<button class="b ptytile" data-a="pick" data-id="' + esc(p.id) + '" aria-pressed="' + on + '">' + (on ? '<span class="tick">' + icon('check') + '</span>' : '') +
        avatar(p, 80) + '<span class="nm">' + esc(nameOf(p)) + '</span><span class="lv">' + blockSVG(prog(p, song).level, p.theme) + '</span></button>';
    }).join('') + '<button class="b ptytile add" data-a="add" aria-label="' + esc(tx('newPlayer')) + '">' + icon('plus') + '</button>';
    const songs = SONG_KEYS.map(k => '<button class="b chip" data-a="song" data-k="' + k + '" aria-pressed="' + (k === song) + '">' + icon('music') + '<span>' + esc(SONGS[k].title()) + '</span></button>').join('');
    const rs = PT.ROUNDS.map(r => '<button class="b chip rnd" data-a="rounds" data-r="' + r + '" aria-pressed="' + (r === rounds) + '">' + r + '</button>').join('');
    return '<h2 class="poph" id="ptyTitle">' + esc(tx('ptWho')) + '</h2><div class="ptytiles">' + tiles + '</div>' +
      '<div class="ptyrow">' + songs + '</div>' +
      '<div class="ptyrow" role="group" aria-label="' + esc(tx('ptRounds')) + '"><span class="lbl">' + esc(tx('ptRounds')) + '</span>' + rs + '</div>' +
      '<p class="ptyhint">' + esc(n < PT.MIN_PLAYERS ? tx('ptNeedTwo') : fill('ptPlan', { turns: n * rounds })) + '</p>' +
      btn('draw', icon('team'), tx('ptDraw'), 'primary', n < PT.MIN_PLAYERS ? ' disabled' : '');
  },
  [S.PARTY_DRAW]: () => {
    const done = drawn >= pt.order.length;
    return '<h2 class="poph" id="ptyTitle">' + esc(tx(done ? 'ptOrder' : 'ptDrawing')) + '</h2><div class="ptyslots">' + pt.order.map((id, i) => {
      const p = byId(id), on = i < drawn;
      return '<div class="ptyslot' + (on ? ' on' : '') + '" style="--pc:' + COLORS[i] + '"><span class="n">' + (i + 1) + '</span>' +
        (on ? avatar(p, 110) : '<span class="ph">?</span>') + '<span class="nm">' + (on ? esc(nameOf(p)) : '&nbsp;') + '</span></div>';
    }).join('') + '</div>' + btn('go', icon('play', { fill: true }), tx('ptGo'), 'primary', done ? '' : ' style="visibility:hidden"');
  },
  [S.PARTY_TURN]: () => {
    const p = P(), lv = prog(p, pt.song).level, first = pt.round === 0 && pt.turn === 0 && !pt.tries.length;
    const mic = micKind ? '<div class="ptymic" role="alert"><p>' + esc(tx(MIC_HINT[micKind] || MIC_HINT.other)) + '</p><div class="ptybtns">' +
      btn('play', icon('retry'), tx('micRetry'), '') + btn('touch', icon('play'), tx('micTouch'), '') + '</div></div>' : '';
    return '<div class="ptypill">' + esc(fill('ptRound', { r: pt.round + 1, n: pt.rounds })) + '</div>' +
      '<div class="ptyhand">' + avatar(p, 150) + '<span class="eyebrow">' + esc(tx(first ? 'ptFirst' : 'ptYourTurn')) + '</span>' +
      '<h2 class="who" id="ptyTitle">' + esc(nameOf(p)) + '</h2>' +
      '<span class="ptylvl"><span class="blk">' + blockSVG(lv, p.theme) + '</span>' + esc(SONGS[pt.song].title() + ' · ' + tx('levels')[lv]) + '</span></div>' +
      dots(pt.tries.length) +
      (mic || '<button class="b primary ptyplay" data-a="play" aria-label="' + esc(tx('play')) + '">' + icon('play', { fill: true }) + '</button>') +
      meter() + queue();
  },
  [S.PARTY_RESULT]: () => {
    if (!last) return '';
    const lvl = last.levelUp ? '<p class="ptynew">' + icon('star', { fill: true }) + esc(fill('ptNewLevel', { level: tx('levels')[last.level] })) + '</p>' : '';
    if (last.step === 'again'){
      const tr = pt.tries, idx = PT.countedIdx(tr);
      return '<span class="eyebrow" id="ptyTitle">' + esc(fill('ptTry', { n: tr.length, t: PT.TRIES })) + '</span>' +
        '<div class="ptybig">' + last.pct + '%</div>' + lvl +
        '<p class="ptyhint">' + esc(tr.length < PT.COUNTED ? tx('ptFirstTry') : fill('ptSoFar', { list: idx.map(i => tr[i] + '%').join(' + '), sum: PT.turnPoints(tr) })) + '</p>' +
        dots(tr.length) + btn('again', icon('retry'), tx('ptAgain'));
    }
    const t = pt.turns[pt.turns.length - 1], idx = PT.countedIdx(t.tries), nx = byId(pt.order[pt.turn + 1]);
    const [hint, label, ico] = last.step === 'turn' ? [fill('ptPass', { name: nameOf(nx) }), tx('ptNext'), icon('next')]
      : last.step === 'round' ? [tx('ptRoundOver'), tx('ptToRound'), icon('next')] : [tx('ptLastTurn'), tx('ptToFinal'), icon('star', { fill: true })];
    return '<span class="eyebrow" id="ptyTitle">' + esc(fill('ptAdds', { name: nameOf(byId(t.id)) })) + '</span>' +
      '<div class="ptybig">+' + PT.turnPoints(t.tries) + '%</div>' + lvl +
      '<div class="ptytries">' + t.tries.map((v, i) => { const on = idx.includes(i); return '<div class="' + (on ? 'on' : 'off') + '"><b>' + v + '%</b><span>' + esc(tx(on ? 'ptCounted' : 'ptNotCounted')) + '</span></div>'; }).join('') + '</div>' +
      meter(t.id) + '<p class="ptyhint">' + esc(hint) + '</p>' +
      '<div class="ptybar"><i style="animation-duration:' + AUTO_MS + 'ms"></i></div>' + btn('pass', ico, label);
  },
  [S.PARTY_ROUND]: () => '<span class="eyebrow">' + esc(fill('ptRoundDone', { r: pt.round + 1, n: pt.rounds })) + '</span>' +
    '<h2 class="poph" id="ptyTitle">' + esc(fill('ptRoundGain', { n: PT.roundPoints(pt, pt.round) })) + '</h2>' +
    meter(null, true) + btn('nextRound', icon('next'), tx('ptNextRound')),
  [S.PARTY_FINAL]: () => {
    const pc = PT.share(pt, early), tier = PT.tierFor(pc);
    return '<h2 class="ptyaward" id="ptyTitle">' + esc(tx('ptTier' + tier)) + '</h2>' +
      '<div class="ptybig">' + pc + '%</div><p class="ptyhint">' + esc(tx(early ? 'ptEarly' : 'ptShare')) + '</p>' +
      '<div class="ptyteam">' + pt.order.map(id => avatar(byId(id), 96)).join('') + '</div>' +
      '<p class="ptymsg">' + esc(tx('ptMsg' + tier)) + '</p>' + meter(null, true) +
      '<div class="ptybtns"><button class="b ico" data-a="home" aria-label="' + esc(tx('home')) + '">' + icon('home') + '</button>' + btn('more', icon('team'), tx('ptMore')) + '</div>';
  },
};

/* ---- Fireworks: the tier sets how many bursts, how often and how big; the golden tier adds gold to the team colours.
   Reduced motion: a few bursts that appear and fade in place. ---- */
const FW = [{ n: 4, every: 900, size: 0.8 }, { n: 10, every: 520, size: 1 }, { n: 22, every: 280, size: 1.3 }, { n: 40, every: 150, size: 1.5 }];
let fwRaf = 0, fwT = 0, parts = [];
function stopFw(){
  clearInterval(fwT); cancelAnimationFrame(fwRaf); parts = [];
  const c = $('#ptyFw'); c.getContext('2d').clearRect(0, 0, c.width, c.height);
}
function startFw(tier){
  stopFw();
  const c = $('#ptyFw'), x = c.getContext('2d'), dpr = devicePixelRatio || 1, f = FW[tier];
  c.width = c.clientWidth * dpr; c.height = c.clientHeight * dpr;
  const team = pt.order.map((_, i) => COLORS[i]), cols = tier === 3 ? ['#FFE7A0', '#FFD35C', '#FFF6E4', ...team] : team;
  let left = reducedMotion ? Math.min(3, f.n) : f.n;
  const boom = () => {
    if (left-- <= 0){ clearInterval(fwT); return; }
    const bx = c.width * (0.12 + Math.random() * 0.76), by = c.height * (0.1 + Math.random() * 0.4), col = cols[Math.floor(Math.random() * cols.length)];
    const n = tier === 3 ? 80 : 56;
    for (let i = 0; i < n; i++){
      const a = Math.PI * 2 * i / n, v = (reducedMotion ? 0 : 1.6 + Math.random() * 2.4) * f.size * dpr;
      parts.push({ x: bx + (reducedMotion ? Math.cos(a) * 60 * f.size * dpr * Math.random() : 0), y: by + (reducedMotion ? Math.sin(a) * 60 * f.size * dpr * Math.random() : 0),
        vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, col, r: (tier === 3 ? 2.6 : 2.1) * dpr });
    }
  };
  boom(); fwT = setInterval(boom, reducedMotion ? 700 : f.every);
  const loop = () => {
    x.globalCompositeOperation = 'destination-out'; x.fillStyle = 'rgba(0,0,0,.24)'; x.fillRect(0, 0, c.width, c.height);
    x.globalCompositeOperation = 'lighter';
    parts = parts.filter(p => p.life > 0);
    for (const p of parts){
      p.x += p.vx; p.y += p.vy; p.vy += 0.035 * dpr; p.vx *= 0.985; p.vy *= 0.985; p.life -= reducedMotion ? 0.02 : 0.012;
      x.globalAlpha = Math.max(0, p.life); x.fillStyle = p.col; x.beginPath(); x.arc(p.x, p.y, p.r, 0, 7); x.fill();
    }
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    if (parts.length || left > 0) fwRaf = requestAnimationFrame(loop);
  };
  fwRaf = requestAnimationFrame(loop);
}
