// Node-side helpers shared by the build, brand-check and calibration scripts.
// Loads data-dev, validates it, and builds game data. Dev-only.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as dev from '../data-dev/index.js';
import {
  validateDevTree, validateSources, validateParts, validateBenchmarks, validateShipped, findDeniedTerms,
} from '../src/data/validate.js';
import { buildGameData } from '../src/data/build.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export { dev };

export function allParts() {
  return [...dev.gpus, ...dev.calibrationGpus, ...dev.cpus, ...dev.rams, ...dev.storages, ...dev.psus,
    ...dev.fans, ...dev.coolers, ...dev.networks, ...dev.chassis, ...dev.nodes, ...dev.pdus];
}

export function validateAll() {
  const sourceIds = new Set(dev.sources.map((s) => s.id));
  const errors = [];
  errors.push(...validateSources(dev.sources, dev.SOURCE_LABELS));
  errors.push(...validateParts(allParts()));
  const trees = {
    gpus: dev.gpus, calibrationGpus: dev.calibrationGpus, cpus: dev.cpus, rams: dev.rams, storages: dev.storages,
    psus: dev.psus, fans: dev.fans, coolers: dev.coolers, networks: dev.networks, chassis: dev.chassis, nodes: dev.nodes, pdus: dev.pdus,
    models: dev.models, engines: dev.engines, kvCacheTypes: dev.kvCacheTypes, formatComputePath: dev.formatComputePath,
    constants: dev.constants,
  };
  for (const [name, tree] of Object.entries(trees)) errors.push(...validateDevTree(tree, sourceIds, name));
  errors.push(...validateBenchmarks(dev.benchmarks, {
    sourceIds,
    engineIds: new Set(dev.engines.map((e) => e.id)),
    models: new Map(dev.models.map((m) => [m.id, m])),
    gpuIds: new Set([...dev.gpus, ...dev.calibrationGpus].map((g) => g.id)),
  }));
  return errors;
}

// Every name that must never ship: the curated list plus every realRef.
export function deniedTerms() {
  const curated = JSON.parse(readFileSync(path.join(ROOT, 'data-dev/brand-denylist.json'), 'utf8')).terms;
  const realRefs = [...allParts(), ...dev.models, ...dev.engines].map((x) => x.realRef);
  const allow = allowedTerms();
  return [...new Set([...curated, ...realRefs])].filter((t) => !allow.has(t));
}

// Terms the user explicitly allowed (recorded in docs/decisions.md):
// inference engine names and open model names. Company names stay denied.
export function allowedTerms() {
  const names = [...dev.models, ...dev.engines].map((x) => x.realRef);
  const families = ['Llama', 'llama', 'Llama-2', 'Llama-3.1', 'Llama-3.3', 'Qwen', 'Qwen2', 'Qwen2.5', 'Qwen3',
    'Mistral', 'Mistral-Small', 'gpt-oss', 'llama.cpp', 'vLLM', 'SGLang',
    'Qwen3.5', 'Qwen3.6', 'Qwen3.8', 'Llama-3.2', 'Llama-4', 'Ministral', 'phi-4', 'Phi', 'gemma-4', 'Gemma', 'GLM', 'GLM-4.5-Air', 'GLM-4.7-Flash', 'GLM-5.3', 'MiniMax', 'MiniMax-M2.7', 'DeepSeek', 'DeepSeek-V3.2', 'MiniCPM', 'MiniCPM5'];
  return new Set([...names, ...families]);
}

export function buildAndCheck(opts) {
  const game = buildGameData(dev, opts);
  const errors = validateShipped(game);
  const hits = findDeniedTerms(JSON.stringify(game), deniedTerms());
  for (const h of hits) errors.push(`shipped data contains denied term "${h.term}" (${h.count}x)`);
  return { game, errors };
}
