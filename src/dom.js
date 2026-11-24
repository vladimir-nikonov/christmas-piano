// DOM helpers shared by all screens.

export const $ = s => document.querySelector(s);
export function showOnly(id){ ['#home','#profiles','#newp','#results','#pause','#settings','#hud','#pop','#me'].forEach(s => $(s).hidden = s !== id); }
