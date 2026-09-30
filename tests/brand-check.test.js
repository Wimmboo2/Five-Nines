import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { scanDir } from '../scripts/check-dist-brands.js';
import { deniedTerms } from '../scripts/dev-data.js';

function tempDist(files) {
  const dir = mkdtempSync(path.join(tmpdir(), 'fn-dist-'));
  for (const [name, text] of Object.entries(files)) {
    const p = path.join(dir, name);
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, text);
  }
  return dir;
}

describe('dist brand check', () => {
  const terms = deniedTerms();

  it('fails when a real product name is planted in the bundle', () => {
    const dir = tempDist({ 'assets/index.js': 'const gpu = "NVIDIA GeForce RTX 4090";', 'index.html': '<html></html>' });
    const hits = scanDir(dir, terms);
    rmSync(dir, { recursive: true });
    expect(hits.map((h) => h.term)).toEqual(expect.arrayContaining(['NVIDIA', 'GeForce', 'RTX']));
  });

  it('fails on a planted engine name', () => {
    const dir = tempDist({ 'assets/app.js': 'label("Powered by vLLM")' });
    const hits = scanDir(dir, terms);
    rmSync(dir, { recursive: true });
    expect(hits.map((h) => h.term)).toContain('vLLM');
  });

  it('passes a clean bundle that uses only fake names', () => {
    const dir = tempDist({ 'assets/index.js': 'const gpu = "Halcyon Ember G4-24"; define.amd;', 'index.html': '<div id="root"></div>' });
    const hits = scanDir(dir, terms);
    rmSync(dir, { recursive: true });
    expect(hits).toEqual([]);
  });
});
