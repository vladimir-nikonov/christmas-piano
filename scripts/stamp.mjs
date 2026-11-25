// Stamps a deploy version onto every module and stylesheet URL of an assembled site:
//   node scripts/stamp.mjs <siteDir> <version>
// GitHub Pages lets browsers cache each file for 10 minutes, and each file's cache expires on its own.
// Without a version, a deploy that lands while the tablet holds some modules in cache gives it a mix of
// old and new modules, an import fails and the app never starts. With ?v=<version> on every URL, each
// deploy is a new set of URLs, so a page always loads modules of one deploy.
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

// Adds ?v=<version> to relative .js specifiers in static imports and re-exports.
export function stampJs(code, version){
  return code.replace(/(\b(?:from|import)\s*)(['"])(\.{1,2}\/[^'"?]+\.js)\2/g, (m, kw, q, spec) => `${kw}${q}${spec}?v=${version}${q}`)
    .replace(/(\bconst BUILD = )'dev'/, `$1'${version}'`);
}
export function stampHtml(html, version){
  return html.replace(/(\b(?:src|href)=")(src\/[^"?]+\.(?:js|css))"/g, (m, attr, path) => `${attr}${path}?v=${version}"`);
}

async function* jsFiles(dir){
  for (const e of await readdir(dir, { withFileTypes: true })){
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* jsFiles(p); else if (e.name.endsWith('.js')) yield p;
  }
}

if (import.meta.url === `file://${process.argv[1]}`){
  const [site, version] = process.argv.slice(2);
  if (!site || !/^[\w.-]{1,64}$/.test(version || '')) { console.error('usage: node scripts/stamp.mjs <siteDir> <version>'); process.exit(1); }
  let n = 0;
  for await (const f of jsFiles(join(site, 'src'))){ await writeFile(f, stampJs(await readFile(f, 'utf8'), version)); n++; }
  const index = join(site, 'index.html');
  await writeFile(index, stampHtml(await readFile(index, 'utf8'), version));
  console.log(`stamped ${n} modules and index.html with v=${version}`);
}
