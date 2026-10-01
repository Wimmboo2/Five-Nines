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

  it('passes real hardware names (allowed since 2026-10-01)', () => {
    const dir = tempDist({ 'assets/index.js': 'const gpu = "NVIDIA GeForce RTX 4090"; const cpu = "AMD EPYC 9555";', 'index.html': '<html></html>' });
    const hits = scanDir(dir, terms);
    rmSync(dir, { recursive: true });
    expect(hits).toEqual([]);
  });

  it('fails on a planted Mojang or Microsoft name', () => {
    const dir = tempDist({ 'assets/index.js': 'credit("Mojang"); os("Microsoft")' });
    const hits = scanDir(dir, terms);
    rmSync(dir, { recursive: true });
    expect(hits.map((h) => h.term)).toEqual(expect.arrayContaining(['Mojang', 'Microsoft']));
  });

  it('fails on a planted company or game name that is still denied', () => {
    const dir = tempDist({ 'assets/app.js': 'label("by OpenAI"); world("Minecraft")' });
    const hits = scanDir(dir, terms);
    rmSync(dir, { recursive: true });
    expect(hits.map((h) => h.term)).toEqual(expect.arrayContaining(['OpenAI', 'Minecraft']));
  });

  it('passes allowed engine and model names', () => {
    const dir = tempDist({ 'assets/app.js': 'x("vLLM", "llama.cpp", "Qwen3-32B", "gpt-oss-20b")' });
    const hits = scanDir(dir, terms);
    rmSync(dir, { recursive: true });
    expect(hits).toEqual([]);
  });

  it('passes a clean bundle that uses only fake names', () => {
    const dir = tempDist({ 'assets/index.js': 'const gpu = "Halcyon Ember G4-24"; define.amd;', 'index.html': '<div id="root"></div>' });
    const hits = scanDir(dir, terms);
    rmSync(dir, { recursive: true });
    expect(hits).toEqual([]);
  });
});
