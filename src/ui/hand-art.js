// Fingering hint hand from the designer (hand-hint pack): a right hand seen from above, thumb on the left,
// in a 100x120 box. Drawn in this order (the palm covers the finger bases); stroke #182335, width 3.5, round joins.
// The left hand is the same drawing mirrored; the finger number goes on the palm at (55, 85), (45, 85) mirrored.
export const HAND_PARTS = {
  thumb: 'M30 72 C24 63 17 53 11 57 C4 61 8 70 13 79 L29 96 Q34 99 40 90 Z',
  index: 'M30 62 L25 25 Q24 17 31 16 Q38 15 39 24 L43 62 Z',
  middle: 'M43 62 L43 13 Q43 5 50 5 Q57 5 57 13 L57 62 Z',
  ring: 'M57 62 L61 22 Q62 14 69 15 Q76 16 75 24 L71 64 Z',
  little: 'M71 65 L79 38 Q81 31 87 33 Q94 35 91 43 L85 78 L76 83 Z',
  palm: 'M30 60 Q50 55 71 60 Q84 63 85 76 L80 92 Q76 101 69 105 L69 114 L37 114 L37 104 Q27 98 26 87 L27 70 Q27 64 30 60 Z'
};
export const HAND_ORDER = ['thumb', 'index', 'middle', 'ring', 'little', 'palm'];
