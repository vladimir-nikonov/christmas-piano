// Visual themes (colours, font, corner radius, effects). Pure data.

/* ================= Themes (jingle-keys-themes.zip) ================= */
export const THEMES = {
  pixel:   { name:'Pixel Quest',         bg:'#121C32', panel:'#263650', border:'#405775', accent:'#54D77C', accentDark:'#1B854D', reward:'#FFD35C', error:'#E9B878', text:'#F5F8FF', font:'"Golos Text"', radius:3,  fx:'squares', decor:'dots'  },
  plastic: { name:'Music Buddies',       bg:'#393477', panel:'#6256A6', border:'#9183D7', accent:'#5CE3AF', accentDark:'#209B78', reward:'#FFDA6C', error:'#FFD4A1', text:'#FFF9FF', font:'"Nunito"',     radius:28, fx:'bubbles', decor:'glow'  },
  winter:  { name:'Winter Melody',       bg:'#153B4A', panel:'#285564', border:'#50808B', accent:'#FFD18A', accentDark:'#A97738', reward:'#FFD18A', error:'#EBC598', text:'#FFF6E4', font:'"Rubik"',      radius:8,  fx:'snow',    decor:'flakes'},
  anime:   { name:'Anime Music Academy', bg:'#171631', panel:'#302F53', border:'#8E7BCB', accent:'#F49AD1', accentDark:'#A7458D', reward:'#FFD98D', error:'#E8B6CD', text:'#FFF5FF', font:'"Nunito"',     radius:20, fx:'ring',    decor:'glow'  }
};
export const THEME_KEYS = Object.keys(THEMES);

/* ================= Motion flavour per theme =================
   One mechanic and one navigation for every theme; only the flavour differs. Shared code in src/ui/themefx.js
   reads this table (no per-theme code paths). Durations in ms.
     ease   easing of the theme's transitions (home zoom-out, next level, profile expand)
     entry  level entry: the selected block zooms to the centre (dur 250-400, final scale, turn in degrees,
            squash = soft spring wind-up, light = the block lights up as it grows)
     ring   shape that opens where the block lands (square block opening, soft puff, lit square, crystal portal)
     part   DOM particles for the entry, the unlock and the reward landing: kind, count, spread (design px),
            rise (negative = up), fall (gravity drop), spin (deg), end scale, life and easing
     unlock how the lock leaves the new level block (CSS keyframes lk-<unlock>)
     flight easing of the reward stars flying to the star row; from = icon the star starts as (energy -> star)
*/
export const THEME_MOTION = {
  pixel:   { ease:'steps(6,end)', entry:{ dur:340, scale:2.6, turn:0, squash:false, light:false }, ring:'square',
             part:{ kind:'pixel', n:16, spread:120, rise:-10, fall:90, spin:0, end:1, life:420, ease:'steps(6,end)' },
             unlock:'crumble', flight:'steps(9,end)', from:null },
  plastic: { ease:'cubic-bezier(.34,1.56,.64,1)', entry:{ dur:380, scale:3.2, turn:0, squash:true, light:false }, ring:'soft',
             part:{ kind:'puff', n:9, spread:100, rise:-50, fall:0, spin:40, end:1.5, life:440, ease:'cubic-bezier(.2,.8,.3,1)' },
             unlock:'pop', flight:'cubic-bezier(.34,1.56,.64,1)', from:null },
  winter:  { ease:'cubic-bezier(.4,0,.2,1)', entry:{ dur:360, scale:2.6, turn:0, squash:false, light:true }, ring:'lit',
             part:{ kind:'lantern', n:8, spread:140, rise:-80, fall:0, spin:0, end:1, life:440, ease:'cubic-bezier(.3,.6,.4,1)' },
             unlock:'melt', flight:'cubic-bezier(.4,0,.2,1)', from:null },
  anime:   { ease:'cubic-bezier(.6,0,.2,1)', entry:{ dur:360, scale:2.4, turn:45, squash:false, light:true }, ring:'portal',
             part:{ kind:'crystal', n:12, spread:130, rise:-20, fall:0, spin:180, end:.6, life:420, ease:'cubic-bezier(.2,.7,.3,1)' },
             unlock:'shatter', flight:'cubic-bezier(.5,0,.2,1)', from:'music' }
};
