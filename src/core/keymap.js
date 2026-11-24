// Computer keyboard layout of the piano: the home row plays white keys C4..C5, the row above plays black keys.
// Keys are matched by KeyboardEvent.code (physical position), so the layout works with any input language.

export const KEY_CODES = {
  KeyA:60, KeyW:61, KeyS:62, KeyE:63, KeyD:64, KeyF:65, KeyT:66, KeyG:67, KeyY:68, KeyH:69, KeyU:70, KeyJ:71, KeyK:72
};
const BY_MIDI = Object.fromEntries(Object.entries(KEY_CODES).map(([c, m]) => [m, c.slice(3)]));
// MIDI note for a KeyboardEvent.code, or null.
export const midiForCode = code => (Object.prototype.hasOwnProperty.call(KEY_CODES, code) ? KEY_CODES[code] : null);
// Latin letter printed on a piano key, or '' when no computer key plays it.
export const letterFor = midi => BY_MIDI[midi] || '';
