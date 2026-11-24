// System Back button (Android tablet): keeps one "trap" history entry while anything other than the plain
// home screen is open, so Back acts inside the app instead of leaving the page.
//   game -> pause, pause -> home, overlays (quick picker, settings, profiles, child's page, wizard, results) -> close,
//   plain home -> default browser behaviour (there is no trap entry to pop).
// At most one trap entry exists: it is pushed when a context opens and consumed with history.back() when the app
// returns home through its own buttons. The popstate caused by that history.back() is ignored, so there are no loops.

import { db } from '../data/storage.js';
import { $ } from '../dom.js';
import { state } from '../game/game.js';
import { goHome, pauseGame } from './screens/home.js';

const SCREENS = ['#home','#profiles','#newp','#results','#pause','#settings','#hud','#pop','#me'];
const shown = s => !$(s).hidden;
const TRAP = 'sn-trap';
let trapped = history.state && history.state.sn === TRAP; // a reload keeps the entry: adopt it, sync() consumes it
let ignorePop = false;

// Does Back have something to do inside the app right now?
function wantTrap(){
  if (shown('#pop') || shown('#settings')) return true;
  if (shown('#home')) return false;
  if (shown('#newp')) return db.profiles.length > 0; // the very first wizard has nowhere to go back to
  return SCREENS.some(shown);
}
function sync(){
  if (ignorePop) return; // a history.back() is on its way; popstate calls sync() again
  const want = wantTrap();
  if (want && !trapped){ history.pushState({ sn: TRAP }, ''); trapped = true; }
  else if (!want && trapped){ trapped = false; ignorePop = true; history.back(); }
}
const click = s => { const b = $(s); if (b && !b.hidden) b.click(); };
function onBack(){
  if (shown('#pop')) $('#pop').hidden = true;
  else if (shown('#settings')) click('#btnSetClose');
  else if (shown('#pause')) goHome();
  else if (state === 'playing' && shown('#hud')) pauseGame();
  else if (state === 'demo') click('#btnPause');
  else if (shown('#me')) click('#btnMeBack');
  else if (shown('#newp')) click('#btnNewBack');
  else if (shown('#profiles') || shown('#results')) goHome();
}
addEventListener('popstate', () => {
  if (ignorePop){ ignorePop = false; sync(); return; }
  if (!trapped) return; // an entry that is not ours: leave it to the browser
  trapped = false;
  onBack();
  sync();
});
// Every screen change shows or hides one of the screen elements, so watching their `hidden` attribute
// catches all of them, whichever module made the change.
const mo = new MutationObserver(sync);
SCREENS.forEach(s => mo.observe($(s), { attributes: true, attributeFilter: ['hidden'] }));
sync();
