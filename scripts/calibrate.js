// Calibration: sim vs published benchmarks.
//
//   npm run calibrate            print the error table for every case
//   npm run calibrate -- --fit   fit engine perf constants on role:'fit' cases,
//                                write data-dev/fitted-perf.js, then print
//
// No pass/fail: the tolerance is agreed with the user at the checkpoint.

import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, dev } from './dev-data.js';
import { buildGameData, resolve } from '../src/data/build.js';
import { indexCatalog } from '../src/sim/util.js';
import { simulateBenchmark } from '../src/sim/bench.js';

const catalog = resolve(buildGameData(dev, { includeCalibrationHardware: true }));
const idx = indexCatalog(catalog);
const cases = dev.benchmarks.map((b) => ({ raw: b, ...resolve(b) }));

const logErr = (sim, meas) => Math.log(sim / meas);

function rms(list) {
  return Math.sqrt(list.reduce((a, x) => a + x * x, 0) / Math.max(1, list.length));
}

function caseErrors(sel, override) {
  return sel.map((b) => {
    const r = simulateBenchmark(idx, b, override);
    if (r.error || !Number.isFinite(r.value)) return 10;
    return logErr(r.value, b.value);
  });
}

function grid1(sel, key, lo, hi, steps, base) {
  let best = null;
  for (let i = 0; i <= steps; i++) {
    const v = lo + ((hi - lo) * i) / steps;
    const e = rms(caseErrors(sel, { ...base, [key]: v }));
    if (!best || e < best.e) best = { v, e };
  }
  return best;
}

function grid2(sel, k1, r1, k2, r2, base) {
  let best = null;
  for (let i = 0; i <= r1[2]; i++) {
    const v1 = r1[0] + ((r1[1] - r1[0]) * i) / r1[2];
    for (let j = 0; j <= r2[2]; j++) {
      const v2 = r2[0] + ((r2[1] - r2[0]) * j) / r2[2];
      const e = rms(caseErrors(sel, { ...base, [k1]: v1, [k2]: v2 }));
      if (!best || e < best.e) best = { v1, v2, e };
    }
  }
  return best;
}

const pick = (engine, pred) => cases.filter((b) => b.role === 'fit' && b.engine === engine && pred(b));
const ids = (list) => list.map((b) => b.id).join(', ');
const pct = (e) => `${((Math.exp(e) - 1) * 100).toFixed(1)}%`;

function fit() {
  const out = {};
  for (const eng of ['eng-kettle', 'eng-sluice']) {
    const base = { ...idx.engines.get(eng).perf, moePrefillFactor: 1, seqLayerOverheadUs: 0, hbmBwFactor: 1 };
    const r = {};
    const isMoe = (b) => !!idx.models.get(b.model).moe;
    const path = (b) => idx.formatComputePath[eng][b.quant];
    // 1. prefill efficiencies (dense models)
    const ppQuant = pick(eng, (b) => b.metric === 'prefill' && !isMoe(b) && path(b) === 'cuda-core');
    if (ppQuant.length) {
      const g = grid1(ppQuant, 'prefillEfficiencyQuant', 0.2, 5.0, 480, base);
      base.prefillEfficiencyQuant = g.v; r.prefillEfficiencyQuant = { v: g.v, e: g.e, cases: ppQuant };
    }
    const ppFp16 = pick(eng, (b) => b.metric === 'prefill' && !isMoe(b) && path(b) !== 'cuda-core');
    if (ppFp16.length) {
      const g = grid1(ppFp16, 'prefillEfficiencyFp16', 0.02, 1.0, 196, base);
      base.prefillEfficiencyFp16 = g.v; r.prefillEfficiencyFp16 = { v: g.v, e: g.e, cases: ppFp16 };
    }
    // 2. single-stream decode, dense models: bandwidth efficiency + per-layer overhead
    const hbm = (b) => b.gpus.every((g) => String(idx.parts.get(g.part).memType).startsWith('HBM'));
    const tg = pick(eng, (b) => b.metric === 'decode' && b.concurrency === 1 && !isMoe(b) && !hbm(b));
    if (tg.length) {
      let g = grid2(tg, 'bwEfficiency', [0.4, 1.0, 30], 'layerOverheadCycles', [0, 400000, 40], base);
      g = grid2(tg, 'bwEfficiency', [Math.max(0.3, g.v1 - 0.03), Math.min(1, g.v1 + 0.03), 30],
        'layerOverheadCycles', [Math.max(0, g.v2 - 15000), g.v2 + 15000, 30], base);
      Object.assign(base, { bwEfficiency: g.v1, layerOverheadCycles: g.v2 });
      r.bwEfficiency = { v: g.v1, e: g.e, cases: tg };
      r.layerOverheadCycles = { v: g.v2, e: g.e, cases: tg };
    }
    // 2b. the same decode on HBM cards: one extra bandwidth factor
    const tgH = pick(eng, (b) => b.metric === 'decode' && b.concurrency === 1 && !isMoe(b) && hbm(b));
    if (tgH.length) {
      const g = grid1(tgH, 'hbmBwFactor', 0.3, 1.0, 140, base);
      base.hbmBwFactor = g.v; r.hbmBwFactor = { v: g.v, e: g.e, cases: tgH };
    }
    // 3. MoE: extra per-layer decode overhead, and prefill slowdown
    const moeTg = pick(eng, (b) => b.metric === 'decode' && b.concurrency === 1 && isMoe(b));
    if (moeTg.length) {
      const g = grid1(moeTg, 'moeLayerOverheadCycles', 0, 600000, 300, base);
      base.moeLayerOverheadCycles = g.v; r.moeLayerOverheadCycles = { v: g.v, e: g.e, cases: moeTg };
    }
    const moePp = pick(eng, (b) => b.metric === 'prefill' && isMoe(b));
    if (moePp.length) {
      const g = grid1(moePp, 'moePrefillFactor', 0.02, 1.0, 196, base);
      base.moePrefillFactor = g.v; r.moePrefillFactor = { v: g.v, e: g.e, cases: moePp };
    }
    // 4. concurrency: host-side cost per extra sequence per layer. If the engine
    //    had no prefill data, its matmul efficiency is fitted here too.
    const agg = pick(eng, (b) => b.metric === 'aggregate');
    if (agg.length && !ppFp16.length && !ppQuant.length) {
      const g = grid2(agg, 'prefillEfficiencyFp16', [0.1, 1.0, 45], 'seqLayerOverheadUs', [0, 20, 40], base);
      Object.assign(base, { prefillEfficiencyFp16: g.v1, seqLayerOverheadUs: g.v2 });
      r.prefillEfficiencyFp16 = { v: g.v1, e: g.e, cases: agg };
      r.seqLayerOverheadUs = { v: g.v2, e: g.e, cases: agg };
    } else if (agg.length) {
      const g = grid1(agg, 'seqLayerOverheadUs', 0, 20, 400, base);
      base.seqLayerOverheadUs = g.v; r.seqLayerOverheadUs = { v: g.v, e: g.e, cases: agg };
    }
    out[eng] = r;
  }
  return out;
}

function writeFitted(fitRes) {
  const units = { bwEfficiency: 'fraction', layerOverheadCycles: 'cycles', prefillEfficiencyQuant: 'x fp32Tflops', prefillEfficiencyFp16: 'fraction', moeLayerOverheadCycles: 'cycles', moePrefillFactor: 'fraction', seqLayerOverheadUs: 'us', hbmBwFactor: 'fraction' };
  const round = (k, v) => (k.endsWith('Cycles') ? Math.round(v) : Math.round(v * 10000) / 10000);
  const line = (k, r, fallback) => {
    if (r) return `est(${round(k, r.v)}, '${units[k]}', ${JSON.stringify(`Fitted by scripts/calibrate.js --fit to ${r.cases.length} published cases (${ids(r.cases)}); in-sample RMS error ${pct(r.e)} (log-space).`)})`;
    return fallback;
  };
  const k = fitRes['eng-kettle'];
  const v = fitRes['eng-sluice'];
  const copy = (from, key, why) => `est(${round(key, from[key].v)}, '${units[key]}', ${JSON.stringify(why)})`;
  const kettle = Object.keys(units).map((key) => `    ${key}: ${line(key, k[key], `est(0, '${units[key]}', 'No fit data.')`)},`).join('\n');
  const sluice = Object.keys(units).map((key) => {
    if (v[key]) return `    ${key}: ${line(key, v[key])},`;
    if (key === 'hbmBwFactor') return `    ${key}: est(1, 'fraction', 'No single-stream vLLM decode data on HBM cards in the fit set; not applied (1). The held-out A100 SXM vLLM cases (set E) check this.'),`;
    return `    ${key}: ${copy(k, key, `No vLLM data for this constant; set equal to the fitted llama.cpp value.`)},`;
  }).join('\n');
  const loomSrc = { ...k, ...v };
  const loom = Object.keys(units).map((key) => `    ${key}: ${copy(loomSrc, key, 'No SGLang benchmark on catalog hardware was found; set equal to the fitted vLLM value (or llama.cpp where vLLM had no data).')},`).join('\n');
  const text = `// GENERATED by \`npm run calibrate -- --fit\` on ${new Date().toISOString().slice(0, 10)}. Do not edit by hand.
// Every value is an estimate fitted to published benchmarks (see reasoning).
import { est } from './lib.js';

export const fittedPerf = {
  'eng-kettle': {
${kettle}
  },
  'eng-sluice': {
${sluice}
  },
  'eng-loom': {
${loom}
  },
};
`;
  writeFileSync(path.join(ROOT, 'data-dev/fitted-perf.js'), text);
}

function table(override) {
  const rows = cases.map((b) => {
    const r = simulateBenchmark(idx, b, override?.[b.engine]);
    const err = r.error ? null : (r.value - b.value) / b.value;
    return { id: b.id, role: b.role, metric: b.metric, measured: b.value, sim: r.value, err, note: r.error ?? (r.memFits ? '' : 'MEM: ' + r.memErrors.join(' ')) };
  });
  const pad = (s, n) => String(s).padEnd(n);
  console.log(pad('case', 26), pad('role', 6), pad('metric', 10), pad('measured', 10), pad('sim', 10), 'error');
  for (const r of rows) {
    console.log(pad(r.id, 26), pad(r.role, 6), pad(r.metric, 10), pad(r.measured.toFixed(1), 10),
      pad(Number.isFinite(r.sim) ? r.sim.toFixed(1) : '-', 10), r.err === null ? 'ERR' : `${(r.err * 100).toFixed(1)}%`, r.note ? `  ${r.note}` : '');
  }
  const stats = {};
  for (const role of ['fit', 'check']) {
    const errs = rows.filter((r) => r.role === role && r.err !== null).map((r) => Math.abs(r.err));
    errs.sort((a, b) => a - b);
    const med = errs.length % 2 ? errs[(errs.length - 1) / 2] : (errs[errs.length / 2 - 1] + errs[errs.length / 2]) / 2;
    stats[role] = { med, max: Math.max(...errs), n: errs.length };
    console.log(`${role}: ${errs.length} cases, median |error| ${(med * 100).toFixed(1)}%, max |error| ${(stats[role].max * 100).toFixed(1)}%`);
  }
  // Tolerance agreed with the user (docs/decisions.md): held-out median <= 25%, worst <= 60%.
  const ok = stats.check.med <= 0.25 && stats.check.max <= 0.60;
  const over = rows.filter((r) => r.role === 'check' && r.err !== null && Math.abs(r.err) > 0.60).map((r) => r.id);
  console.log(`TOLERANCE (held-out median <= 25%, worst <= 60%): ${ok ? 'PASS' : 'FAIL'}` +
    (over.length ? ` | cases over 60%: ${over.join(', ')}` : ''));
  return rows;
}

if (process.argv.includes('--fit')) {
  const res = fit();
  writeFitted(res);
  console.log('wrote data-dev/fitted-perf.js');
  const override = {};
  for (const [eng, r] of Object.entries(res)) override[eng] = Object.fromEntries(Object.entries(r).map(([k, x]) => [k, x.v]));
  table(override);
} else {
  table();
}
