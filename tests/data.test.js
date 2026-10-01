import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { validateAll, buildAndCheck, deniedTerms, allParts, dev, ROOT } from '../scripts/dev-data.js';
import { buildGameData } from '../src/data/build.js';
import { validateDevTree, validateShipped, findDeniedTerms } from '../src/data/validate.js';

describe('dev data (data-dev)', () => {
  it('passes validation: every value tagged, every source real, every estimate reasoned', () => {
    expect(validateAll()).toEqual([]);
  });

  it('every model and engine realRef is covered by the brand denylist (hardware names are allowed)', () => {
    const curated = JSON.parse(readFileSync(path.join(ROOT, 'data-dev/brand-denylist.json'), 'utf8')).terms;
    const uncovered = [...dev.models, ...dev.engines]
      .filter((p) => findDeniedTerms(p.realRef, curated).length === 0)
      .map((p) => p.realRef);
    expect(uncovered).toEqual([]);
  });

  it('every shipped hardware part shows a real name from the name map', () => {
    const game = buildGameData(dev);
    const parts = Object.values(game.parts).flat();
    const missing = parts.filter((p) => !dev.hardwareNames[p.id]).map((p) => p.id);
    expect(missing).toEqual([]);
    for (const p of parts) expect(p.displayName).toBe(dev.hardwareNames[p.id]);
    expect(Object.values(dev.hardwareNames).some((n) => n.startsWith('Generic'))).toBe(false);
  });
});

describe('validator rules catch bad data', () => {
  const sources = new Set(['s1']);
  it('flags an untagged number', () => {
    expect(validateDevTree({ vramGB: 24 }, sources)).toHaveLength(1);
  });
  it('flags published without source and unknown sources', () => {
    expect(validateDevTree({ a: { value: 1, unit: 'W', tag: 'published' } }, sources)[0]).toMatch(/no source/);
    expect(validateDevTree({ a: { value: 1, unit: 'W', tag: 'measured', source: 'nope' } }, sources)[0]).toMatch(/unknown source/);
  });
  it('flags an estimate without reasoning', () => {
    expect(validateDevTree({ a: { value: 1, unit: 'W', tag: 'estimate' } }, sources)[0]).toMatch(/without reasoning/);
  });
  it('flags an unknown tag', () => {
    expect(validateDevTree({ a: { value: 1, unit: 'W', tag: 'guess', reasoning: 'x'.repeat(20) } }, sources)[0]).toMatch(/unknown tag/);
  });
  it('accepts a good tree', () => {
    expect(validateDevTree({ id: 'x', a: { value: 1, unit: 'W', tag: 'published', source: 's1' } }, sources)).toEqual([]);
  });
});

describe('shipped data (src/generated/game-data.json)', () => {
  const { game, errors } = buildAndCheck();
  it('builds with no provenance keys and no denied names', () => {
    expect(errors).toEqual([]);
  });
  it('has a generic source label on every value and no realRef anywhere', () => {
    expect(validateShipped(game)).toEqual([]);
    expect(JSON.stringify(game)).not.toMatch(/realRef|reasoning|https?:\/\//);
  });
  it('validateShipped catches leaked provenance', () => {
    const leaked = { parts: { gpu: [{ id: 'g', realRef: 'Some Real Card', vram: { value: 1, unit: 'GB', tag: 'published', source: 'x' } }] } };
    const errs = validateShipped(leaked);
    expect(errs.some((e) => e.includes('realRef'))).toBe(true);
    expect(errs.some((e) => e.includes('sourceLabel'))).toBe(true);
  });
});

describe('denied-term matching', () => {
  it('is whole-word and case-sensitive', () => {
    expect(findDeniedTerms('an AMD Ryzen chip', ['AMD', 'Ryzen']).map((h) => h.term)).toEqual(['AMD', 'Ryzen']);
    expect(findDeniedTerms('define.amd && AMDGPU', ['AMD'])).toEqual([]);
    expect(findDeniedTerms('llama.cpp server', ['llama.cpp'])).toHaveLength(1);
  });
  it('allows the engine and model names the user approved, and still denies everything else', () => {
    const terms = deniedTerms();
    for (const t of ['llama.cpp', 'vLLM', 'SGLang', 'Qwen', 'Llama', 'gpt-oss', 'Proxmox']) expect(terms).not.toContain(t);
    for (const t of ['NVIDIA', 'GeForce', 'Samsung', 'Supermicro', 'NVIDIA GeForce RTX 4090']) expect(terms).not.toContain(t);
    for (const t of ['OpenAI', 'Hugging Face', 'Minecraft', 'Proxmox Server Solutions', 'Mojang', 'Microsoft']) expect(terms).toContain(t);
  });
});
