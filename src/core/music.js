// Note names and colours. Pure data.

/* ================= Music ================= */
export const LETTERS = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
export const LETTERS_PL = ['C','Cis','D','Dis','E','F','Fis','G','Gis','A','B','H'];
export const NOTE_NATIVE = { ru:['До','До♯','Ре','Ре♯','Ми','Фа','Фа♯','Соль','Соль♯','Ля','Ля♯','Си'], uk:['До','До♯','Ре','Ре♯','Мі','Фа','Фа♯','Соль','Соль♯','Ля','Ля♯','Сі'],
  es:['Do','Do♯','Re','Re♯','Mi','Fa','Fa♯','Sol','Sol♯','La','La♯','Si'], pl: LETTERS_PL, en: LETTERS };
export const NOTE_COLORS = ['#FF575D','#FF963F','#FFDA44','#55D66B','#45CDEB','#507EF4','#AC70F1']; // C D E F G A B (theme pack)
export const PC_COLOR = (() => { const out = []; [0,2,4,5,7,9,11].forEach((pc, i) => out[pc] = NOTE_COLORS[i]); [1,3,6,8,10].forEach(pc => out[pc] = out[pc - 1]); return out; })();
