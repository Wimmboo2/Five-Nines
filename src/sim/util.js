// Small shared helpers for the simulation. No UI, no data imports.

export const GB = 1e9;

export function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
}

// Linear interpolation over sorted [x, y] points, clamped at the ends.
export function interp(points, x) {
  if (x <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i];
    if (x <= x1) {
      const [x0, y0] = points[i - 1];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return points[points.length - 1][1];
}

// Deterministic PRNG (mulberry32) so stress tests and tests are repeatable.
export function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function byId(list) {
  return new Map(list.map((x) => [x.id, x]));
}

// Catalog index: every part by id across categories.
export function indexCatalog(catalog) {
  const parts = new Map();
  for (const list of Object.values(catalog.parts)) for (const p of list) parts.set(p.id, p);
  return {
    parts,
    models: byId(catalog.models),
    engines: byId(catalog.engines),
    kvCacheTypes: catalog.kvCacheTypes,
    formatComputePath: catalog.formatComputePath,
    constants: catalog.constants,
  };
}

export function sumDb(levels) {
  const s = levels.reduce((acc, l) => acc + 10 ** (l / 10), 0);
  return s > 0 ? 10 * Math.log10(s) : -Infinity;
}

// Number of CPU sockets populated (nodes take two).
export function cpuCount(build) {
  return build.cpu ? Math.max(1, build.cpuCount ?? 1) : 0;
}

// The chassis part if it is an 8-GPU node, else null.
export function nodeOf(idx, build) {
  const ch = build.chassis ? idx.parts.get(build.chassis) : null;
  return ch && ch.formFactor === 'gpu-node' ? ch : null;
}

// The power supply as the power model sees it. PSU modules in a node share
// the load, so N modules act like one supply of N x the module rating.
// `modules` and `moduleW` let callers report redundancy.
export function effectivePsu(idx, build) {
  if (!build.psu) return null;
  const part = idx.parts.get(build.psu);
  const n = part.formFactor === 'module' ? Math.max(1, build.psuCount ?? 1) : 1;
  if (n === 1) return { ...part, modules: 1, moduleW: part.ratedW };
  return { ...part, displayName: `${n}x ${part.displayName}`, ratedW: n * part.ratedW, modules: n, moduleW: part.ratedW };
}
