// Visual themes (colours, font, corner radius, effects). Pure data.

/* ================= Themes (jingle-keys-themes.zip) ================= */
export const THEMES = {
  pixel:   { name:'Pixel Quest',         bg:'#121C32', panel:'#263650', border:'#405775', accent:'#54D77C', accentDark:'#1B854D', reward:'#FFD35C', error:'#E9B878', text:'#F5F8FF', font:'"Golos Text"', radius:3,  fx:'squares', decor:'dots'  },
  plastic: { name:'Music Buddies',       bg:'#393477', panel:'#6256A6', border:'#9183D7', accent:'#5CE3AF', accentDark:'#209B78', reward:'#FFDA6C', error:'#FFD4A1', text:'#FFF9FF', font:'"Nunito"',     radius:28, fx:'bubbles', decor:'glow'  },
  winter:  { name:'Winter Melody',       bg:'#153B4A', panel:'#285564', border:'#50808B', accent:'#FFD18A', accentDark:'#A97738', reward:'#FFD18A', error:'#EBC598', text:'#FFF6E4', font:'"Rubik"',      radius:8,  fx:'snow',    decor:'flakes'},
  anime:   { name:'Anime Music Academy', bg:'#171631', panel:'#302F53', border:'#8E7BCB', accent:'#F49AD1', accentDark:'#A7458D', reward:'#FFD98D', error:'#E8B6CD', text:'#FFF5FF', font:'"Nunito"',     radius:20, fx:'ring',    decor:'glow'  }
};
export const THEME_KEYS = Object.keys(THEMES);
