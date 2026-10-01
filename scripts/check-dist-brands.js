// Searches every file in dist/ for real brand/product/software names and fails
// the build on any hit. Run after `vite build`.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { findDeniedTerms } from '../src/data/validate.js';

export function scanDir(dir, terms) {
  const hits = [];
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = path.join(d, name);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      const text = readFileSync(p).toString('latin1');
      for (const h of findDeniedTerms(text, terms)) hits.push({ file: p, ...h });
    }
  };
  walk(dir);
  return hits;
}

async function main() {
  const { ROOT, deniedTerms } = await import('./dev-data.js');
  const dist = path.join(ROOT, 'dist');
  const hits = scanDir(dist, deniedTerms());
  if (hits.length) {
    console.error('brand check FAILED: blocked names found in dist/');
    for (const h of hits) console.error(`  - ${path.relative(ROOT, h.file)}: "${h.term}" x${h.count}`);
    process.exit(1);
  }
  console.log('brand check passed: no blocked names in dist/');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
