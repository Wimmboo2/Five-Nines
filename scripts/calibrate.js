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
    const base = { ...idx.engines.get(eng).perf, moePrefillFactor: 1, seqLayerOverheadUs: 0, hbmBwFactor: 1, prefillTokenLayerOverheadUs: 0, stageHandoffUs: 0 };
    const r = {};
    const isMoe = (b) => !!idx.models.get(b.model).moe;
    const path = (b) => idx.formatComputePath[eng][b.quant];
    // 1. prefill efficiencies (dense models)
    //    plus a per-token-per-layer non-matmul overhead shared by both paths
    //    (outer loop), with the two path efficiencies refitted for each value.
    const ppQuant = pick(eng, (b) => b.metric === 'prefill' && !isMoe(b) && path(b) === 'cuda-core');
    const ppFp16 = pick(eng, (b) => b.metric === 'prefill' && !isMoe(b) && path(b) !== 'cuda-core');
    if (ppQuant.length || ppFp16.length) {
      let best = null;
      for (let i = 0; i <= 40; i++) {
        const ov = i * 0.1;
        const b0 = { ...base, prefillTokenLayerOverheadUs: ov };
        const gq = ppQuant.length ? grid1(ppQuant, 'prefillEfficiencyQuant', 0.2, 6.0, 290, b0) : null;
        const gf = ppFp16.length ? grid1(ppFp16, 'prefillEfficiencyFp16', 0.02, 1.2, 236, b0) : null;
        const all = rms([...(gq ? caseErrors(ppQuant, { ...b0, prefillEfficiencyQuant: gq.v }) : []),
          ...(gf ? caseErrors(ppFp16, { ...b0, prefillEfficiencyFp16: gf.v }) : [])]);
        if (!best || all < best.e) best = { ov, gq, gf, e: all };
      }
      base.prefillTokenLayerOverheadUs = best.ov;
      r.prefillTokenLayerOverheadUs = { v: best.ov, e: best.e, cases: [...ppQuant, ...ppFp16] };
      if (best.gq) { base.prefillEfficiencyQuant = best.gq.v; r.prefillEfficiencyQuant = { v: best.gq.v, e: best.gq.e, cases: ppQuant }; }
      if (best.gf) { base.prefillEfficiencyFp16 = best.gf.v; r.prefillEfficiencyFp16 = { v: best.gf.v, e: best.gf.e, cases: ppFp16 }; }
    }
    // 2. single-stream decode, dense models: bandwidth efficiency + per-layer overhead
    const hbm = (b) => b.gpus.every((g) => String(idx.parts.get(g.part).memType).startsWith('HBM'));
    const nGpu = (b) => b.gpus.reduce((a, g) => a + g.count, 0);
    const tg = pick(eng, (b) => b.metric === 'decode' && b.concurrency === 1 && !isMoe(b) && !hbm(b) && nGpu(b) === 1);
    if (tg.length) {
      let g = grid2(tg, 'bwEfficiency', [0.4, 1.0, 30], 'layerOverheadCycles', [0, 400000, 40], base);
      g = grid2(tg, 'bwEfficiency', [Math.max(0.3, g.v1 - 0.03), Math.min(1, g.v1 + 0.03), 30],
        'layerOverheadCycles', [Math.max(0, g.v2 - 15000), g.v2 + 15000, 30], base);
      Object.assign(base, { bwEfficiency: g.v1, layerOverheadCycles: g.v2 });
      r.bwEfficiency = { v: g.v1, e: g.e, cases: tg };
      r.layerOverheadCycles = { v: g.v2, e: g.e, cases: tg };
    }
    // 2b. the same decode on HBM cards: one extra bandwidth factor
    const tgH = pick(eng, (b) => b.metric === 'decode' && b.concurrency === 1 && !isMoe(b) && hbm(b) && nGpu(b) === 1);
    if (tgH.length) {
      const g = grid1(tgH, 'hbmBwFactor', 0.3, 1.0, 140, base);
      base.hbmBwFactor = g.v; r.hbmBwFactor = { v: g.v, e: g.e, cases: tgH };
    }
    // 2c. multi-GPU layer split decode: fixed cost per stage handoff
    const tgSplit = pick(eng, (b) => b.metric === 'decode' && b.concurrency === 1 && !isMoe(b) && nGpu(b) > 1 && b.split === 'layer');
    if (tgSplit.length) {
      //    Fitted on the slowdown vs the same source's single-GPU run of the
      //    same model and card, so a source-wide speed offset (older build,
      //    different host) doesn't leak into the handoff cost.
      const single = (b) => cases.find((x) => x.source === b.source && x.model === b.model && x.quant === b.quant
        && x.metric === 'decode' && x.gpus.length === 1 && x.gpus[0].count === 1 && x.gpus[0].part === b.gpus[0].part && x.depth === b.depth);
      const pairs = tgSplit.map((b) => [b, single(b)]).filter(([, s]) => s);
      let best = null;
      for (let i = 0; i <= 600; i++) {
        const v = i * 5;
        const o = { ...base, stageHandoffUs: v };
        const e = rms(pairs.map(([b, s1]) => {
          const rb = simulateBenchmark(idx, b, o); const rs = simulateBenchmark(idx, s1, o);
          return Math.log((rb.value / rs.value) / (b.value / s1.value));
        }));
        if (!best || e < best.e) best = { v, e };
      }
      base.stageHandoffUs = best.v;
      r.stageHandoffUs = { v: best.v, e: best.e, cases: pairs.map(([b]) => b), rel: pairs.map(([, s1]) => s1) };
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
  const units = { bwEfficiency: 'fraction', layerOverheadCycles: 'cycles', prefillEfficiencyQuant: 'x fp32Tflops', prefillEfficiencyFp16: 'fraction', moeLayerOverheadCycles: 'cycles', moePrefillFactor: 'fraction', seqLayerOverheadUs: 'us', hbmBwFactor: 'fraction', prefillTokenLayerOverheadUs: 'us', stageHandoffUs: 'us' };
  const round = (k, v) => (k.endsWith('Cycles') ? Math.round(v) : Math.round(v * 10000) / 10000);
  const line = (k, r, fallback) => {
    if (r) return `est(${round(k, r.v)}, '${units[k]}', ${JSON.stringify(`Fitted by scripts/calibrate.js --fit to ${r.cases.length} published cases (${ids(r.cases)})${r.rel ? ` as slowdown relative to the same source's single-GPU rows (${ids(r.rel)})` : ''}; in-sample RMS error ${pct(r.e)} (log-space).`)})`;
    return fallback;
  };
  const k = fitRes['eng-kettle'];
  const v = fitRes['eng-sluice'];
  const copy = (from, key, why) => `est(${round(key, from[key].v)}, '${units[key]}', ${JSON.stringify(why)})`;
  const kettle = Object.keys(units).map((key) => `    ${key}: ${line(key, k[key], `est(0, '${units[key]}', 'No fit data.')`)},`).join('\n');
  const sluice = Object.keys(units).map((key) => {
    if (v[key]) return `    ${key}: ${line(key, v[key])},`;
    if (key === 'prefillTokenLayerOverheadUs') return `    ${key}: est(0, 'us', 'No prefill benchmark for this engine in the fit set; its matmul efficiency is fitted on aggregate throughput, which absorbs this overhead, so it is not applied (0).'),`;
    if (key === 'hbmBwFactor') return `    ${key}: est(1, 'fraction', 'No single-stream vLLM decode data on HBM cards in the fit set; not applied (1). The held-out A100 SXM vLLM cases (set E) check this.'),`;
    return `    ${key}: ${copy(k, key, `No vLLM data for this constant; set equal to the fitted llama.cpp value.`)},`;
  }).join('\n');
  const loomSrc = { ...k, ...v };
  const loom = Object.keys(units).map((key) => key === 'prefillTokenLayerOverheadUs'
    ? `    ${key}: est(0, 'us', 'No SGLang benchmark on catalog hardware was found; set equal to the vLLM value (not applied, 0).'),`
    : `    ${key}: ${copy(loomSrc, key, 'No SGLang benchmark on catalog hardware was found; set equal to the fitted vLLM value (or llama.cpp where vLLM had no data).')},`).join('\n');
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
  // 'ref' rows are reference-only (older engine builds, a data outlier; see
  // their refReason) and are not counted toward the tolerance.
  for (const role of ['fit', 'check', 'ref']) {
    const errs = rows.filter((r) => r.role === role && r.err !== null).map((r) => Math.abs(r.err));
    errs.sort((a, b) => a - b);
    const med = errs.length % 2 ? errs[(errs.length - 1) / 2] : (errs[errs.length / 2 - 1] + errs[errs.length / 2]) / 2;
    stats[role] = { med, max: Math.max(...errs), n: errs.length };
    console.log(`${role}${role === 'ref' ? ' (reference only, not counted)' : ''}: ${errs.length} cases, median |error| ${(med * 100).toFixed(1)}%, max |error| ${(stats[role].max * 100).toFixed(1)}%`);
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
