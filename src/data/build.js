// Turns dev data (full provenance, real names) into shipped game data
// (generic source labels, fake names only). Pure function.

import { isTaggedLike } from './validate.js';

const ESTIMATE_LABEL = 'Theoretical estimate';

// Keys dropped from every object on the way out.
const DROP_KEYS = new Set(['realRef', 'note']);

export function makeLabeler(sources, sourceLabels) {
  const byId = new Map(sources.map((s) => [s.id, s]));
  return (tagged) => {
    if (tagged.tag === 'estimate') return ESTIMATE_LABEL;
    const src = byId.get(tagged.source);
    return sourceLabels[src.kind];
  };
}

export function stripTree(node, label) {
  if (node === null || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map((x) => stripTree(x, label));
  if (isTaggedLike(node)) {
    return { value: stripTree(node.value, label), unit: node.unit, tag: node.tag, sourceLabel: label(node) };
  }
  const out = {};
  for (const [k, v] of Object.entries(node)) {
    if (DROP_KEYS.has(k)) continue;
    out[k] = stripTree(v, label);
  }
  return out;
}

export function buildGameData(dev, { includeCalibrationHardware = false } = {}) {
  const label = makeLabeler(dev.sources, dev.SOURCE_LABELS);
  const s = (x) => stripTree(x, label);
  const gpus = includeCalibrationHardware ? [...dev.gpus, ...dev.calibrationGpus] : dev.gpus;
  return {
    schemaVersion: 1,
    parts: {
      gpu: s(gpus),
      cpu: s(dev.cpus),
      ram: s(dev.rams),
      storage: s(dev.storages),
      psu: s(dev.psus),
      fan: s(dev.fans),
      cooler: s(dev.coolers),
      network: s(dev.networks),
      chassis: s([...dev.chassis.filter((c) => c.category === 'chassis'), ...dev.nodes]),
      pdu: s(dev.pdus),
      rack: s(dev.chassis.filter((c) => c.category === 'rack')),
    },
    models: s(dev.models),
    engines: s(dev.engines),
    kvCacheTypes: s(dev.kvCacheTypes),
    formatComputePath: s(dev.formatComputePath),
    constants: s(dev.constants),
    roomArchetypes: s(dev.roomArchetypes),
  };
}

// Replace every { value, unit, tag, sourceLabel } with its plain value, so the
// simulation reads numbers. The UI keeps the tagged form to show provenance.
export function resolve(node) {
  if (node === null || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map(resolve);
  if (isTaggedLike(node)) return resolve(node.value);
  const out = {};
  for (const [k, v] of Object.entries(node)) out[k] = resolve(v);
  return out;
}
