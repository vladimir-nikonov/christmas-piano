// Small inline SVG flags for the language picker (emoji flags are not drawn on every tablet).

const R = (y, h, c) => '<rect y="' + y + '" width="60" height="' + h + '" fill="' + c + '"/>';
const FLAGS = {
  en: '<rect width="60" height="40" fill="#012169"/><path d="M0 0L60 40M60 0L0 40" stroke="#fff" stroke-width="8"/><path d="M0 0L60 40M60 0L0 40" stroke="#C8102E" stroke-width="3"/>' +
      '<path d="M30 0V40M0 20H60" stroke="#fff" stroke-width="13"/><path d="M30 0V40M0 20H60" stroke="#C8102E" stroke-width="8"/>',
  pl: R(0, 20, '#fff') + R(20, 20, '#DC143C'),
  uk: R(0, 20, '#0057B7') + R(20, 20, '#FFD700'),
  ru: R(0, 14, '#fff') + R(13, 14, '#0039A6') + R(26, 14, '#D52B1E'),
  es: R(0, 40, '#AA151B') + R(10, 20, '#F1BF00')
};
export function flagSVG(id){
  return '<svg class="flag" viewBox="0 0 60 40" preserveAspectRatio="none" aria-hidden="true">' + (FLAGS[id] || FLAGS.en) + '</svg>';
}
