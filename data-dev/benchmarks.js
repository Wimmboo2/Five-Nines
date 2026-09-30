import { meas, est } from './lib.js';

// Published inference benchmarks used to calibrate and check the sim.
// role: 'fit' cases are used by scripts/calibrate.js --fit to set the engine
// perf constants; 'check' cases are held out and only compared.
//
// depth = context tokens already in the KV cache while decoding (average
// over the run where the benchmark generates many tokens).

const A = 'bench-lcpp-cuda';
const B = 'bench-xd';
const C = 'bench-lcpp-gptoss';
const D = 'bench-cfg';
const E = 'bench-arxiv-char';
const F = 'bench-localllm-96';

const XD_DEPTH = est(512, 'tokens', 'XD reports the average speed while generating 1024 tokens from a short prompt; the mean KV depth over the run is roughly half of 1024.');
const TG128_DEPTH = est(64, 'tokens', 'tg128 generates 128 tokens from an empty context; mean depth ~64.');
const CFG_DEPTH = est(640, 'tokens', '512-token prompt + mean of 256 generated tokens.');
const ARXIV_DEPTH = est(128, 'tokens', '64 input tokens + mean of 128 generated.');

function lcppScore(id, gpu, tg, pp, note) {
  return [
    { id: `A-${id}-tg`, role: 'fit', source: A, engine: 'eng-kettle', gpus: [{ part: gpu, count: 1 }], split: 'none',
      model: 'mdl-tamarin-2-7b', quant: 'Q4_0', kvType: 'f16', flashAttention: true, concurrency: 1,
      metric: 'decode', depth: TG128_DEPTH, value: meas(tg, 'tok/s', A, `tg128, FA on${note ? '; ' + note : ''}`) },
    { id: `A-${id}-pp`, role: 'fit', source: A, engine: 'eng-kettle', gpus: [{ part: gpu, count: 1 }], split: 'none',
      model: 'mdl-tamarin-2-7b', quant: 'Q4_0', kvType: 'f16', flashAttention: true, concurrency: 1,
      metric: 'prefill', promptTokens: 512, value: meas(pp, 'tok/s', A, `pp512, FA on${note ? '; ' + note : ''}`) },
  ];
}

function xd(id, gpu, count, model, quant, value, role = 'check') {
  return { id: `B-${id}`, role, source: B, engine: 'eng-kettle', gpus: [{ part: gpu, count }], split: count > 1 ? 'layer' : 'none',
    model, quant, kvType: 'f16', flashAttention: false, concurrency: 1,
    metric: 'decode', depth: XD_DEPTH, value: meas(value, 'tok/s', B, 'avg speed generating 1024 tokens; llama.cpp May 2024, default layer split') };
}

const L8 = 'mdl-tamarin-31-8b';
const L70 = 'mdl-tamarin-33-70b';

export const benchmarks = [
  // A: llama.cpp CUDA scoreboard, Llama 2 7B Q4_0
  ...lcppScore('3060', 'gpu-ember-g3-12', 76.92, 2407.67),
  ...lcppScore('3090', 'gpu-ember-g3-24', 161.89, 5560.06),
  ...lcppScore('4090', 'gpu-ember-g4-24', 188.96, 14770.63),
  ...lcppScore('5090', 'gpu-ember-g5-32', 300.40, 14970.15),
  ...lcppScore('a6000', 'gpu-atelier-a48', 144.87, 5662.39),
  ...lcppScore('pro6000', 'gpu-atelier-b96', 281.11, 16618.98),
  ...lcppScore('a100', 'gpu-bastion-h80', 200.90, 5285.96, 'scoreboard says "A100 80 GB HBM2e" without PCIe/SXM; mapped to the PCIe card'),
  ...lcppScore('h100sxm', 'cal-h100-sxm', 280.74, 11263.29, '"H100 80 GB HBM3" = SXM5'),

  // B: multi-GPU layer split and bigger models (held out)
  xd('3090-8b', 'gpu-ember-g3-24', 1, L8, 'Q4_K_M', 111.74),
  xd('3090x2-8b', 'gpu-ember-g3-24', 2, L8, 'Q4_K_M', 108.07),
  xd('3090x4-8b', 'gpu-ember-g3-24', 4, L8, 'Q4_K_M', 104.94),
  xd('4090-8b', 'gpu-ember-g4-24', 1, L8, 'Q4_K_M', 127.74),
  xd('4090x2-8b', 'gpu-ember-g4-24', 2, L8, 'Q4_K_M', 122.56),
  xd('4090x4-8b', 'gpu-ember-g4-24', 4, L8, 'Q4_K_M', 117.61),
  xd('a6000-8b', 'gpu-atelier-a48', 1, L8, 'Q4_K_M', 102.22),
  xd('a6000x4-8b', 'gpu-atelier-a48', 4, L8, 'Q4_K_M', 93.73),
  xd('l40s-8b', 'gpu-bastion-p48', 1, L8, 'Q4_K_M', 113.60),
  xd('l40sx4-8b', 'gpu-bastion-p48', 4, L8, 'Q4_K_M', 105.72),
  xd('a100-8b', 'gpu-bastion-h80', 1, L8, 'Q4_K_M', 138.31),
  xd('a100x4-8b', 'gpu-bastion-h80', 4, L8, 'Q4_K_M', 117.30),
  xd('a100sxm-8b', 'cal-a100-sxm', 1, L8, 'Q4_K_M', 133.38),
  xd('3090-8bf16', 'gpu-ember-g3-24', 1, L8, 'BF16', 46.51),
  xd('4090-8bf16', 'gpu-ember-g4-24', 1, L8, 'BF16', 54.34),
  xd('a6000-8bf16', 'gpu-atelier-a48', 1, L8, 'BF16', 40.25),
  xd('l40s-8bf16', 'gpu-bastion-p48', 1, L8, 'BF16', 43.42),
  xd('a100-8bf16', 'gpu-bastion-h80', 1, L8, 'BF16', 54.56),
  xd('3090x2-70b', 'gpu-ember-g3-24', 2, L70, 'Q4_K_M', 16.29),
  xd('3090x4-70b', 'gpu-ember-g3-24', 4, L70, 'Q4_K_M', 16.89),
  xd('4090x2-70b', 'gpu-ember-g4-24', 2, L70, 'Q4_K_M', 19.06),
  xd('4090x4-70b', 'gpu-ember-g4-24', 4, L70, 'Q4_K_M', 18.83),
  xd('a6000-70b', 'gpu-atelier-a48', 1, L70, 'Q4_K_M', 14.58),
  xd('a6000x4-70b', 'gpu-atelier-a48', 4, L70, 'Q4_K_M', 14.32),
  xd('l40s-70b', 'gpu-bastion-p48', 1, L70, 'Q4_K_M', 15.31),
  xd('l40sx4-70b', 'gpu-bastion-p48', 4, L70, 'Q4_K_M', 14.99),
  xd('a100-70b', 'gpu-bastion-h80', 1, L70, 'Q4_K_M', 22.11),
  xd('a100x4-70b', 'gpu-bastion-h80', 4, L70, 'Q4_K_M', 22.68),
  xd('a100sxm-70b', 'cal-a100-sxm', 1, L70, 'Q4_K_M', 24.33),
  xd('3090x6-70bf16', 'gpu-ember-g3-24', 6, L70, 'F16', 5.82),
  xd('4090x8-70bf16', 'gpu-ember-g4-24', 8, L70, 'F16', 6.45),
  xd('a6000x4-70bf16', 'gpu-atelier-a48', 4, L70, 'F16', 4.74),
  xd('l40sx4-70bf16', 'gpu-bastion-p48', 4, L70, 'F16', 5.03),
  xd('a100x4-70bf16', 'gpu-bastion-h80', 4, L70, 'F16', 7.38),

  // B (prompt processing): average 1024-token prompt eval speed. F16 rows fit the
  // fp16 prefill efficiency; Q4_K_M rows are held out. The L40S F16 row is held
  // out: it is inconsistent with the same source's L40S Q4_K_M row (F16 prompt
  // eval 2,491 vs Q4 5,909, while every other GPU in the table is faster at F16).
  ...[['3090', 'gpu-ember-g3-24', 4239.64, 3865.39], ['4090', 'gpu-ember-g4-24', 9056.26, 6898.71], ['a6000', 'gpu-atelier-a48', 4315.18, 3621.81],
    ['l40s', 'gpu-bastion-p48', 2491.65, 5908.52], ['a100', 'gpu-bastion-h80', 7504.24, 5800.48]].flatMap(([n, gpu, f16, q4]) => [
    { id: `B-${n}-8bf16-pp`, role: n === 'l40s' ? 'check' : 'fit', source: B, engine: 'eng-kettle', gpus: [{ part: gpu, count: 1 }], split: 'none',
      model: L8, quant: 'BF16', kvType: 'f16', flashAttention: false, concurrency: 1,
      metric: 'prefill', promptTokens: 1024, value: meas(f16, 'tok/s', B, 'average 1024-token prompt eval, F16 GGUF') },
    { id: `B-${n}-8b-pp`, role: 'check', source: B, engine: 'eng-kettle', gpus: [{ part: gpu, count: 1 }], split: 'none',
      model: L8, quant: 'Q4_K_M', kvType: 'f16', flashAttention: false, concurrency: 1,
      metric: 'prefill', promptTokens: 1024, value: meas(q4, 'tok/s', B, 'average 1024-token prompt eval, Q4_K_M') },
  ]),

  // C: gpt-oss-20b MoE, llama.cpp. The 4090 cases fit the MoE-specific terms
  // (extra per-layer decode overhead, prefill slowdown from many small expert
  // matmuls); the 5090 cases are held out.
  { id: 'C-4090-oss20-tg', role: 'fit', source: C, engine: 'eng-kettle', gpus: [{ part: 'gpu-ember-g4-24', count: 1 }], split: 'none',
    model: 'mdl-ossia-20b', quant: 'MXFP4', kvType: 'f16', flashAttention: true, concurrency: 1,
    metric: 'decode', depth: TG128_DEPTH, value: meas(221.95, 'tok/s', C, 'tg128, -b 4096 -ub 2048 -fa 1') },
  { id: 'C-5090-oss20-tg', role: 'check', source: C, engine: 'eng-kettle', gpus: [{ part: 'gpu-ember-g5-32', count: 1 }], split: 'none',
    model: 'mdl-ossia-20b', quant: 'MXFP4', kvType: 'f16', flashAttention: true, concurrency: 1,
    metric: 'decode', depth: TG128_DEPTH, value: meas(282.51, 'tok/s', C, 'tg128, -b 4096 -ub 2048 -fa 1') },
  { id: 'C-4090-oss20-pp', role: 'fit', source: C, engine: 'eng-kettle', gpus: [{ part: 'gpu-ember-g4-24', count: 1 }], split: 'none',
    model: 'mdl-ossia-20b', quant: 'MXFP4', kvType: 'f16', flashAttention: true, concurrency: 1,
    metric: 'prefill', promptTokens: 2048, value: meas(8022.33, 'tok/s', C, 'pp2048, -ub 2048') },
  { id: 'C-5090-oss20-pp', role: 'check', source: C, engine: 'eng-kettle', gpus: [{ part: 'gpu-ember-g5-32', count: 1 }], split: 'none',
    model: 'mdl-ossia-20b', quant: 'MXFP4', kvType: 'f16', flashAttention: true, concurrency: 1,
    metric: 'prefill', promptTokens: 2048, value: meas(9848.38, 'tok/s', C, 'pp2048, -ub 2048') },

  // D: Qwen2.5-7B single-stream and 64-way concurrency, vLLM vs llama.cpp
  ...[['4090', 'gpu-ember-g4-24', 174, 6623, 2391], ['l40s', 'gpu-bastion-p48', 136, 6249, 1748], ['5090', 'gpu-ember-g5-32', 250, 8310, 1875]]
    .flatMap(([n, gpu, single, vAgg, lAgg]) => [
      { id: `D-${n}-vllm-1`, role: 'fit', source: D, engine: 'eng-sluice', gpus: [{ part: gpu, count: 1 }], split: 'none',
        model: 'mdl-quill-25-7b', quant: 'AWQ', kvType: 'auto', flashAttention: true, concurrency: 1,
        metric: 'decode', depth: CFG_DEPTH, value: meas(single, 'tok/s', D, 'single-stream, "~" approximate as published') },
      { id: `D-${n}-lcpp-1`, role: 'check', source: D, engine: 'eng-kettle', gpus: [{ part: gpu, count: 1 }], split: 'none',
        model: 'mdl-quill-25-7b', quant: 'Q4_K_M', kvType: 'f16', flashAttention: true, concurrency: 1,
        metric: 'decode', depth: CFG_DEPTH, value: meas(single, 'tok/s', D, 'single-stream, same value published for both engines') },
      { id: `D-${n}-vllm-64`, role: 'fit', source: D, engine: 'eng-sluice', gpus: [{ part: gpu, count: 1 }], split: 'none',
        model: 'mdl-quill-25-7b', quant: 'AWQ', kvType: 'auto', flashAttention: true, concurrency: 64,
        metric: 'aggregate', depth: CFG_DEPTH, value: meas(vAgg, 'tok/s', D, '64 concurrent requests, aggregate') },
      { id: `D-${n}-lcpp-64`, role: 'fit', source: D, engine: 'eng-kettle', gpus: [{ part: gpu, count: 1 }], split: 'none',
        model: 'mdl-quill-25-7b', quant: 'Q4_K_M', kvType: 'f16', flashAttention: true, concurrency: 64,
        metric: 'aggregate', depth: CFG_DEPTH, value: meas(lAgg, 'tok/s', D, '64 concurrent requests, aggregate (64 slots)') },
    ]),

  // E: vLLM tensor/pipeline parallel on A100 SXM (held out; the only TP data point found)
  ...[['tp1', 1, 'none', 22.16], ['tp2', 2, 'tp', 20.53], ['pp2', 2, 'pp', 21.08], ['tp4', 4, 'tp', 18.55]].map(([n, count, split, v]) => ({
    id: `E-${n}`, role: 'check', source: E, engine: 'eng-sluice', gpus: [{ part: 'cal-a100-sxm', count }], split,
    model: 'mdl-quill-25-32b', quant: 'BF16', kvType: 'auto', flashAttention: true, concurrency: 1,
    metric: 'decode', depth: ARXIV_DEPTH, value: meas(v, 'tok/s', E, 'chat workload 64 in / 128 out, vLLM v0.9.2; "NVLink pairs, PCIe across pairs"'),
  })),

  // G: vLLM TP=1 vs TP=4 on 4x RTX A5000 (NVLink pairs, PCIe between pairs),
  // Llama-3.1-8B GPTQ-INT4 (Marlin), vLLM 0.7.3. Held out. AWQ weights stand in
  // for GPTQ-INT4 (both 4-bit group-quantized, similar file size).
  ...[['tp1-c8', 1, 'none', 8, 704.35], ['tp4-c8', 4, 'tp', 8, 1056.24], ['tp1-c64', 1, 'none', 64, 2391.44], ['tp4-c64', 4, 'tp', 64, 3735.41]].map(([n, count, split, conc, v]) => ({
    id: `G-a5000-${n}`, role: 'check', source: 'bench-arxiv-a5000', engine: 'eng-sluice', gpus: [{ part: 'cal-a5000', count }], split,
    model: 'mdl-tamarin-31-8b', quant: 'AWQ', kvType: 'auto', flashAttention: true, concurrency: conc,
    metric: 'aggregate', depth: est(conc === 8 ? 64 : 128, 'tokens', 'Table 8 lists T=128 (c=8) and T=256 (c=64) as the workload length; the input length was not read, so mean depth is taken as half of T.'),
    value: meas(v, 'tok/s', 'bench-arxiv-a5000', 'decode tokens/s, Table 8'),
  })),

  // H: 1x vs 2x RTX 4090 over PCIe ("SYS", no NVLink), 300 concurrent requests,
  // 100 in / 600 out, FP16. Held out. DeepSeek-R1-Distill-Qwen-7B has the
  // Qwen2.5-7B architecture; DeepSeek-R1-Distill-Llama-8B has the Llama-3.1-8B one.
  ...[['q7-tp1', 'mdl-quill-25-7b', 1, 'none', 3965.41], ['q7-tp2', 'mdl-quill-25-7b', 2, 'tp', 5479.26],
    ['l8-tp1', 'mdl-tamarin-31-8b', 1, 'none', 2699.72], ['l8-tp2', 'mdl-tamarin-31-8b', 2, 'tp', 3959.14]].map(([n, m, count, split, v]) => ({
    id: `H-4090-${n}`, role: 'check', source: 'bench-dbm-tp', engine: 'eng-sluice', gpus: [{ part: 'gpu-ember-g4-24', count }], split,
    model: m, quant: 'BF16', kvType: 'auto', flashAttention: true, concurrency: 300, kvLimited: true, maxRunTokens: 700,
    metric: 'aggregate', depth: est(400, 'tokens', '100 input tokens + mean of 600 output tokens.'),
    value: meas(v, 'tok/s', 'bench-dbm-tp', 'total throughput at 300 concurrent requests; architecture-equivalent distilled model'),
  })),

  // F: gpt-oss-120b long-context decode on RTX PRO 6000, llama.cpp (held out)
  ...[[8192, 207.7], [16384, 203.5], [32768, 195.2], [65536, 179.9], [131072, 158.2]].map(([d, v]) => ({
    id: `F-oss120-d${d}`, role: 'check', source: F, engine: 'eng-kettle', gpus: [{ part: 'gpu-atelier-b96', count: 1 }], split: 'none',
    model: 'mdl-ossia-120b', quant: 'MXFP4', kvType: 'f16', flashAttention: true, concurrency: 1,
    metric: 'decode', depth: est(d, 'tokens', 'Context depth as labeled in the article (8K/16K/32K/64K/131K).'),
    value: meas(v, 'tok/s', F, 'KV cache type not stated in the article; f16 assumed'),
  })),
];
