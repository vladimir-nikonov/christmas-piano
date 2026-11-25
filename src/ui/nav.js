// The one place that maps the navigation state (src/core/flow.js) to the visible screens and overlays.

import { flow, S, E } from '../core/flow.js';
import { showOnly } from '../dom.js';

function screensFor(s){
  switch (s.name){
    case S.PROFILES: return ['#home', '#profiles'];                    // popups over home
    case S.NEW_PLAYER: return ['#newp'];
    case S.ME: return ['#home', '#me'];
    case S.HOME: case S.MIC_SETUP: return ['#home'];
    case S.SETTINGS: return ['#home', '#settings'];                    // a panel over home
    case S.COUNTDOWN: case S.PREVIEW: return [s.data.entering ? '#home' : '#hud']; // home stays during the entry transition
    case S.PLAYING: case S.WAITING: return ['#hud'];
    case S.PAUSED: return ['#hud', '#pause'];                         // the game stays frozen under the pause
    case S.RESULTS: case S.LEVEL_UP: return ['#results'];
    default: return null;                                            // boot: leave the page as it is
  }
}
flow.subscribe(s => { const ids = screensFor(s); if (ids) showOnly(...ids); });

// The level-up reward is shown on the results screen; after it the machine is back in Results.
const REWARD_MS = 1500;
let rewardT = 0;
flow.subscribe(s => { clearTimeout(rewardT); if (s.name === S.LEVEL_UP) rewardT = setTimeout(() => flow.dispatch(E.REWARD_DONE), REWARD_MS); });
