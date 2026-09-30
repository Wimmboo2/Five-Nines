// Data validation. Pure functions: used by the build script and by tests.
//
// Dev data rules (data-dev):
//   - every number, boolean and spec string sits inside a tagged value
//     { value, unit, tag, source?, reasoning? }
//   - tag is one of published | measured | estimate
//   - published and measured need a source id that exists
//   - estimate needs non-empty reasoning; a source, if given, must exist
// Shipped data rules (src/generated/game-data.json):
//   - no provenance keys at all (realRef, source ids, reasoning, notes, URLs)
//   - every tagged value carries a generic sourceLabel

export const TAGS = new Set(['published', 'measured', 'estimate']);

// Keys whose plain string values are identifiers or labels, not data.
export const STRUCTURAL_KEYS = new Set(['id', 'category', 'tier', 'displayName', 'realRef', 'family']);

export const SHIPPED_FORBIDDEN_KEYS = new Set(['realRef', 'source', 'reasoning', 'note', 'url', 'title']);

export function isTaggedLike(x) {
  return x !== null && typeof x === 'object' && !Array.isArray(x) && 'tag' in x;
}

export function validateDevTree(root, sourceIds, rootPath = '') {
  const errors = [];
  const walk = (node, path) => {
    if (node === null || node === undefined) return;
    if (isTaggedLike(node)) {
      if (!('value' in node)) errors.push(`${path}: tagged value has no "value"`);
      if (!TAGS.has(node.tag)) errors.push(`${path}: unknown tag "${node.tag}"`);
      if (typeof node.unit !== 'string') errors.push(`${path}: missing unit string`);
      if (node.tag === 'published' || node.tag === 'measured') {
        if (!node.source) errors.push(`${path}: ${node.tag} value has no source`);
        else if (!sourceIds.has(node.source)) errors.push(`${path}: unknown source "${node.source}"`);
      }
      if (node.tag === 'estimate') {
        if (typeof node.reasoning !== 'string' || node.reasoning.trim().length < 10) errors.push(`${path}: estimate without reasoning`);
        if (node.source && !sourceIds.has(node.source)) errors.push(`${path}: unknown source "${node.source}"`);
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, `${path}[${i}]`));
      return;
    }
    if (typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        if (STRUCTURAL_KEYS.has(k) && typeof v === 'string') continue;
        walk(v, path ? `${path}.${k}` : k);
      }
      return;
    }
    errors.push(`${path}: untagged ${typeof node} value ${JSON.stringify(node)}`);
  };
  walk(root, rootPath);
  return errors;
}

export function validateSources(sources, sourceLabels) {
  const errors = [];
  const seen = new Set();
  for (const s of sources) {
    if (!s.id) errors.push('source without id');
    if (seen.has(s.id)) errors.push(`duplicate source id ${s.id}`);
    seen.add(s.id);
    if (!sourceLabels[s.kind]) errors.push(`source ${s.id}: unknown kind "${s.kind}"`);
    if (!s.url) errors.push(`source ${s.id}: no url`);
    if (!s.accessed) errors.push(`source ${s.id}: no access date`);
  }
  return errors;
}

export function validateParts(parts) {
  const errors = [];
  const ids = new Set();
  for (const p of parts) {
    for (const k of ['id', 'category', 'displayName', 'realRef']) {
      if (typeof p[k] !== 'string' || !p[k]) errors.push(`part ${p.id ?? '?'}: missing ${k}`);
    }
    if (ids.has(p.id)) errors.push(`duplicate part id ${p.id}`);
    ids.add(p.id);
    if (!isTaggedLike(p.priceUSD)) errors.push(`part ${p.id}: missing tagged priceUSD`);
  }
  return errors;
}

export function validateBenchmarks(benchmarks, ctx) {
  const errors = [];
  for (const b of benchmarks) {
    const where = `benchmark ${b.id}`;
    if (!['fit', 'check'].includes(b.role)) errors.push(`${where}: role must be fit or check`);
    if (!ctx.sourceIds.has(b.source)) errors.push(`${where}: unknown source ${b.source}`);
    if (!isTaggedLike(b.value) || b.value.tag !== 'measured') errors.push(`${where}: value must be a measured tagged value`);
    if (!ctx.engineIds.has(b.engine)) errors.push(`${where}: unknown engine ${b.engine}`);
    const model = ctx.models.get(b.model);
    if (!model) errors.push(`${where}: unknown model ${b.model}`);
    else if (!model.weights[b.quant]) errors.push(`${where}: model ${b.model} has no ${b.quant} weights`);
    for (const g of b.gpus) if (!ctx.gpuIds.has(g.part)) errors.push(`${where}: unknown gpu ${g.part}`);
    if (b.metric === 'decode' || b.metric === 'aggregate') {
      if (!isTaggedLike(b.depth)) errors.push(`${where}: decode case needs a tagged depth`);
    }
    errors.push(...validateDevTree({ value: b.value, depth: b.depth }, ctx.sourceIds, where));
  }
  return errors;
}

// Shipped data must carry no provenance.
export function validateShipped(root) {
  const errors = [];
  const walk = (node, path) => {
    if (node === null || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach((x, i) => walk(x, `${path}[${i}]`)); return; }
    if (isTaggedLike(node)) {
      if (typeof node.sourceLabel !== 'string' || !node.sourceLabel) errors.push(`${path}: shipped value without sourceLabel`);
    }
    for (const [k, v] of Object.entries(node)) {
      if (SHIPPED_FORBIDDEN_KEYS.has(k)) errors.push(`${path}.${k}: provenance key "${k}" must not ship`);
      walk(v, path ? `${path}.${k}` : k);
    }
  };
  walk(root, '');
  return errors;
}

// Whole-word, case-sensitive search for denied terms in a text blob.
export function findDeniedTerms(text, terms) {
  const hits = [];
  for (const term of terms) {
    const re = new RegExp(`(?<![A-Za-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z0-9])`, 'g');
    const m = text.match(re);
    if (m) hits.push({ term, count: m.length });
  }
  return hits;
}
