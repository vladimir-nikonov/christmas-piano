// Note names and colours. Pure data.

/* ================= Music ================= */
export const LETTERS = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
export const LETTERS_PL = ['C','Cis','D','Dis','E','F','Fis','G','Gis','A','B','H'];
export const NOTE_NATIVE = { ru:['До','До♯','Ре','Ре♯','Ми','Фа','Фа♯','Соль','Соль♯','Ля','Ля♯','Си'], uk:['До','До♯','Ре','Ре♯','Мі','Фа','Фа♯','Соль','Соль♯','Ля','Ля♯','Сі'],
  es:['Do','Do♯','Re','Re♯','Mi','Fa','Fa♯','Sol','Sol♯','La','La♯','Si'], pl: LETTERS_PL, en: LETTERS };
export const NOTE_COLORS = ['#FF575D','#FF963F','#FFDA44','#55D66B','#45CDEB','#507EF4','#AC70F1']; // C D E F G A B (theme pack)
// One colour for every note on levels that have faded the note colours (Diamond); the same in every theme.
export const NOTE_PLAIN = '#A9B8D6';
// The note's colour while the level shows colours, otherwise the plain one.
export const noteColor = (midi, colors) => colors ? PC_COLOR[((midi % 12) + 12) % 12] : NOTE_PLAIN;
export const PC_COLOR = (() => { const out = []; [0,2,4,5,7,9,11].forEach((pc, i) => out[pc] = NOTE_COLORS[i]); [1,3,6,8,10].forEach(pc => out[pc] = out[pc - 1]); return out; })();
