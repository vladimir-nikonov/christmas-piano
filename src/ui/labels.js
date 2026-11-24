// Note label in the player's language and label style.

import { LETTERS, LETTERS_PL, NOTE_NATIVE } from '../core/music.js';
import { opts } from '../data/storage.js';
import { LANG } from '../i18n/index.js';

export const noteName = m => (opts().labels === 'letters' ? (LANG === 'pl' ? LETTERS_PL : LETTERS) : (NOTE_NATIVE[LANG] || LETTERS))[m % 12];
