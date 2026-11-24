// System Back button (Android tablet): keeps one "trap" history entry while anything other than the plain
// home screen is open, so Back acts inside the app instead of leaving the page.
//   game -> pause, pause -> home, overlays (quick picker, settings, profiles, child's page, wizard, results) -> close,
//   plain home -> default browser behaviour (there is no trap entry to pop).
// At most one trap entry exists: it is pushed when a context opens and consumed with history.back() when the app
// returns home through its own buttons. The popstate caused by that history.back() is ignored, so there are no loops.

import { flow, S } from '../core/flow.js';
import { db } from '../data/storage.js';
import { $ } from '../dom.js';
import { goHome, pauseGame } from './screens/home.js';

const shown = s => !$(s).hidden;
const TRAP = 'sn-trap';
let trapped = history.state && history.state.sn === TRAP; // a reload keeps the entry: adopt it, sync() consumes it
let ignorePop = false;

// Does Back have something to do inside the app right now? The quick picker is an overlay outside the navigation
// machine; everything else follows the navigation state.
function wantTrap(){
  if (shown('#pop')) return true;
  const s = flow.state;
  switch (s.name){
    case S.BOOT: case S.HOME: case S.MIC_SETUP: return false;
    case S.NEW_PLAYER: return db.profiles.length > 0; // the very first wizard has nowhere to go back to
    case S.COUNTDOWN: case S.PREVIEW: return !s.data.entering; // home is still on screen during the entry transition
    default: return true;
  }
}
function sync(){
  if (ignorePop) return; // a history.back() is on its way; popstate calls sync() again
  const want = wantTrap();
  if (want && !trapped){ history.pushState({ sn: TRAP }, ''); trapped = true; }
  else if (!want && trapped){ trapped = false; ignorePop = true; history.back(); }
}
const click = s => { const b = $(s); if (b && !b.hidden) b.click(); };
function onBack(){
  if (shown('#pop')){ $('#pop').hidden = true; return; }
  const s = flow.state;
  switch (s.name){
    case S.SETTINGS: click('#btnSetClose'); break;
    case S.PAUSED: case S.PROFILES: case S.RESULTS: case S.LEVEL_UP: goHome(); break;
    case S.COUNTDOWN: case S.PLAYING: case S.WAITING: pauseGame(); break;
    case S.PREVIEW: click('#btnPause'); break;
    case S.ME: click('#btnMeBack'); break;
    case S.NEW_PLAYER: click('#btnNewBack'); break;
  }
}
addEventListener('popstate', () => {
  if (ignorePop){ ignorePop = false; sync(); return; }
  if (!trapped) return; // an entry that is not ours: leave it to the browser
  trapped = false;
  onBack();
  sync();
});
// Every navigation change goes through the machine; the quick picker is watched through its `hidden` attribute.
flow.subscribe(sync);
new MutationObserver(sync).observe($('#pop'), { attributes: true, attributeFilter: ['hidden'] });
sync();
