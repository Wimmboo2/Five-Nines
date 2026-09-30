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
