// Keeps the screen on during a game (Wake Lock API).

let wake = null;
export async function requestWake(){ try { if ('wakeLock' in navigator && !wake){ wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => wake = null); } } catch(e){} }
