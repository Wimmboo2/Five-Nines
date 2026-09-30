// Runs one published benchmark case through the sim. Used by the calibration
// script and by tests. A benchmark case is plain data (see data-dev/benchmarks.js,
// resolved to numbers).

import { buildLayout } from './layout.js';
import { planMemory, maxSequences } from './memory.js';
import { makeContext, decodeRate, prefillSeconds } from './inference.js';

// A minimal host for GPU-only benchmark cases. CPU/RAM only matter when layers
// run on the CPU, which no benchmark case does.
const BENCH_HOST = { cpu: 'cpu-keystone-64-g5', ram: [{ part: 'ram-rack-64-d5-6400', count: 12 }] };

export function benchBuild(b) {
  const gpus = [];
  for (const g of b.gpus) for (let i = 0; i < g.count; i++) gpus.push({ part: g.part });
  // The only TP benchmark (E) ran on "NVLink pairs, PCIe across pairs".
  return { ...BENCH_HOST, gpus, nvlinkBridges: true };
}

export function benchInference(b, model) {
  const n = b.gpus.reduce((a, g) => a + g.count, 0);
  const depth = b.depth ?? 0;
  const inf = {
    engine: b.engine, model: b.model, quant: b.quant, kvType: b.kvType,
    contextLength: Math.min(model.maxContextExtended, Math.max(4096, Math.ceil(depth * 1.1) + 256)),
    concurrency: b.concurrency ?? 1,
  };
  if (b.engine === 'eng-kettle') {
    inf.splitMode = b.split === 'none' ? 'none' : b.split;
  } else {
    inf.tp = b.split === 'tp' ? n : 1;
    inf.pp = b.split === 'pp' ? n : 1;
  }
  return inf;
}

export function simulateBenchmark(idx, b, perfOverride) {
  const build = benchBuild(b);
  const inf = benchInference(b, idx.models.get(b.model));
  if (b.maxRunTokens) inf.contextLength = b.maxRunTokens;
  const layout = buildLayout(idx, build, inf);
  if (layout.errors.length) return { error: layout.errors.join(' ') };
  if (perfOverride) layout.engine = { ...layout.engine, perf: { ...layout.engine.perf, ...perfOverride } };
  let mem = planMemory(idx, build, inf, layout);
  let note;
  if (b.kvLimited) {
    // The engine only admits as many requests as its KV pool holds at the
    // longest length in the run.
    const fit = maxSequences(idx.models.get(b.model), mem, layout, inf.contextLength);
    if (fit < inf.concurrency) {
      note = `KV pool admits ${fit} of ${inf.concurrency} requests`;
      inf.concurrency = Math.max(1, fit);
      mem = planMemory(idx, build, inf, layout);
    }
  }
  const c = makeContext(idx, build, inf, layout, mem);
  let value;
  if (b.metric === 'prefill') value = b.promptTokens / prefillSeconds(c, b.promptTokens);
  else {
    const r = decodeRate(c, inf.concurrency, b.depth);
    value = b.metric === 'aggregate' ? r.aggregate : r.perSequence;
  }
  return { value, memFits: mem.fits, memErrors: mem.errors, note };
}
