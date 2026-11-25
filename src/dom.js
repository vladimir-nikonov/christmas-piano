// DOM helpers shared by all screens.

export const $ = s => document.querySelector(s);
export const SCREENS = ['#home','#profiles','#newp','#results','#settings','#hud','#pop','#me'];
export function showOnly(...ids){ SCREENS.forEach(s => $(s).hidden = !ids.includes(s)); }
