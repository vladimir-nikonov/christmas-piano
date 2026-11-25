import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stampJs, stampHtml } from '../../scripts/stamp.mjs';

test('stampJs versions relative imports and side-effect imports only', () => {
  const src = "import { a } from './core/a.js';\nimport '../ui/b.js';\nexport { c } from \"./c.js\";\nconst BUILD = 'dev';\nconst s = 'from ./x.js';";
  const out = stampJs(src, 'abc123');
  assert.match(out, /from '\.\/core\/a\.js\?v=abc123'/);
  assert.match(out, /import '\.\.\/ui\/b\.js\?v=abc123'/);
  assert.match(out, /from "\.\/c\.js\?v=abc123"/);
  assert.match(out, /const BUILD = 'abc123'/);
  assert.match(out, /'from \.\/x\.js'/);
  assert.equal(stampJs(out, 'abc123'), out, 'already stamped specifiers are left alone');
});

test('stampHtml versions the entry module and stylesheet', () => {
  const out = stampHtml('<link rel="stylesheet" href="src/styles.css"><script type="module" src="src/main.js"></script><a href="https://x.org/a.js">', 'v1');
  assert.match(out, /href="src\/styles\.css\?v=v1"/);
  assert.match(out, /src="src\/main\.js\?v=v1"/);
  assert.match(out, /href="https:\/\/x\.org\/a\.js"/);
});

test('every module import in src is a static relative .js specifier the stamp can see', async () => {
  const { readFile, readdir } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const walk = async d => (await Promise.all((await readdir(d, { withFileTypes: true })).map(e => e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]))).flat();
  for (const f of (await walk('src')).filter(f => f.endsWith('.js'))){
    const code = await readFile(f, 'utf8');
    assert.doesNotMatch(code, /\bimport\s*\(/, `${f}: dynamic import() is not versioned by scripts/stamp.mjs`);
    const imports = code.match(/^\s*(?:import|export)\b[^;]*?\bfrom\s*['"][^'"]+['"]|^\s*import\s*['"][^'"]+['"]/gm) || [];
    for (const i of imports) assert.match(i, /['"]\.{1,2}\/[^'"]+\.js['"]/, `${f}: ${i.trim()}`);
  }
});
