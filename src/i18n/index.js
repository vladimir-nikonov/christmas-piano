// UI languages: current language, lookup (tx) and date formatting. Strings live in one file per language.
// The language follows the browser; a player's own choice wins (see ui/lang.js).

import en from './en.js';
import pl from './pl.js';
import uk from './uk.js';
import ru from './ru.js';
import es from './es.js';

export const LANGS = [ { id:'en', code:'EN', name:'English' }, { id:'pl', code:'PL', name:'Polski' }, { id:'uk', code:'UA', name:'Українська' }, { id:'ru', code:'RU', name:'Русский' }, { id:'es', code:'ES', name:'Español' } ];
export const I18N = { en, pl, uk, ru, es };
export function detectLang(){
  const list = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || 'en'];
  for (const l of list){ const c = String(l).toLowerCase().slice(0, 2);
    if (c === 'uk' || c === 'ua') return 'uk'; if (c === 'be') return 'ru';
    if (I18N[c]) return c; }
  return 'en';
}
export let LANG = 'en';
export const tx = k => (I18N[LANG] && I18N[LANG][k] != null) ? I18N[LANG][k] : I18N.en[k];
export const fmtDate = d => { try { return new Date(d).toLocaleDateString(LANG); } catch(e){ return ''; } };
export function useLang(code){ LANG = code; }
