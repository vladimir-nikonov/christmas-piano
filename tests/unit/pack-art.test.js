import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PACK_AVATARS, PACK_BLOCKS, PACK_ICONS } from '../../src/ui/pack-art.js';
import { AVATARS, avatarSVG, blockSVG } from '../../src/ui/art.js';
import { ICON } from '../../src/ui/icons.js';
import { THEME_KEYS } from '../../src/ui/theme-data.js';
import { LEVELS } from '../../src/core/levels.js';

const USED_ICONS = ['arrow-down', 'camera', 'check', 'cross', 'film', 'fullscreen', 'fullscreen-exit', 'gear', 'home', 'lock',
  'mic', 'music', 'pause', 'pencil', 'play', 'plus', 'rec', 'retry', 'share', 'star', 'stop', 'trash', 'keys'];

test('every theme has an avatar for each character and a block for each level', () => {
  for (const t of THEME_KEYS){
    assert.equal(PACK_AVATARS[t].length, AVATARS.length, t);
    assert.equal(PACK_BLOCKS[t].length, LEVELS.length, t);
  }
});

test('pack art is plain static SVG without ids', () => {
  const all = THEME_KEYS.flatMap(t => [...PACK_AVATARS[t], ...PACK_BLOCKS[t]]);
  for (const svg of all){
    assert.match(svg, /^<svg viewBox="0 0 80 80"/);
    assert.doesNotMatch(svg, /<script|\son[a-z]+=|href=|\sid="/i);
  }
});

test('every icon the app draws has a path', () => {
  for (const n of USED_ICONS) assert.match(PACK_ICONS[n] || '', /^M[\d.\sMLHVQACZ-]+$/i, n);
  for (const n of ['eye']) assert.match(ICON[n] || '', /^M[\d.\sMLHVQACZ-]+$/i, n);
});

test('avatar and block markup carries the theme class and size', () => {
  assert.match(avatarSVG(4, 64, 'anime'), /^<svg class="av av-anime" width="64" height="64"/);
  assert.match(blockSVG(3, 'winter'), /^<svg class="block block-winter"/);
});
