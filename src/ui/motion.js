// Shared reduced-motion flag for the canvas (CSS handles DOM animation with its own media query).
// With it on: no falling decor, hit bursts become a short static glow, the waiting arrow stands still,
// highlights are steady instead of pulsing.

const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
export let reducedMotion = !!(mq && mq.matches);
if (mq){
  const on = e => { reducedMotion = e.matches; };
  if (mq.addEventListener) mq.addEventListener('change', on); else if (mq.addListener) mq.addListener(on);
}
