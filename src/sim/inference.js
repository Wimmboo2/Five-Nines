// Inference speed.
//
// DECODE (one step produces one token for each of B sequences):
//   Stages run one after another, so step time = SUM of stage times + handoffs.
//   Inside a stage:
//     single GPU : time = max(bytes read / effective bandwidth, FLOPs / effective compute)
//                  + per-layer fixed overhead
//     TP group   : every GPU reads only its shard AT THE SAME TIME, so the group
//                  time = the SLOWEST shard's time + per-layer overhead
//                  + 2 all-reduces per layer (after attention and after the MLP).
//                  Shard times are never added together.
//     CPU stage  : bytes read from system RAM / effective RAM bandwidth.
//   Bytes read per step = the stage's active weights (MoE: the experts the B
//   tokens actually hit) + the KV cache at the current context depth.
//
// PREFILL (processing the prompt): compute-bound. FLOPs / (efficiency x peak
// tensor throughput), with TP splitting the FLOPs and adding all-reduces.
// Sequential stages pipeline micro-batches (llama.cpp layer split does this).

import { GB } from './util.js';
import {
  layerReadBytes, kvBytesForLayers, layerActiveParams, attentionFlopsPerTokenLayer, uniqueExpertsTouched,
} from './model.js';
import { systemRam } from './memory.js';

// Per-direction PCIe bandwidth of a GPU slot. `lanes` is what the board
// actually gives the card (evaluate.js splits the CPU's lanes between GPUs).
export function pcieBytesPerSec(idx, part, lanes = part.pcieLanes) {
  const c = idx.constants.pcie;
  const x16 = { 3: c.gen3x16GBs, 4: c.gen4x16GBs, 5: c.gen5x16GBs }[part.pcieGen] ?? c.gen3x16GBs;
  return (x16 * (Math.min(lanes, part.pcieLanes) / 16)) * GB;
}

// How the GPUs of a TP group talk to each other.
export function groupLink(idx, build, devices) {
  const parts = devices.map((d) => idx.parts.get(build.gpus[d].part));
  const lat = idx.constants.interconnect.allreduceLatencyUs;
  if (devices.length === 2 && build.nvlinkBridges && parts.every((p) => p.linkType === 'nvlink')) {
    // Bridges connect pairs. Published link figures are totals for both directions.
    const bw = Math.min(...parts.map((p) => p.linkBandwidthGBs)) / 2;
    return { type: 'nvlink', latencyS: lat.nvlink * 1e-6, bytesPerSec: bw * GB };
  }
  const pcie = Math.min(...parts.map((p, j) => pcieBytesPerSec(idx, p, build.gpus[devices[j]].lanes)));
  if (parts.every((p) => p.p2pOverPcie)) {
    return { type: 'pcie-p2p', latencyS: lat['pcie-p2p'] * 1e-6, bytesPerSec: pcie };
  }
  // No peer-to-peer: data crosses PCIe twice through host memory.
  return { type: 'pcie-host', latencyS: lat['pcie-host'] * 1e-6, bytesPerSec: pcie / 2 };
}

// Ring all-reduce: 2(n-1)/n of the message crosses each link, plus latency.
export function allreduceSeconds(msgBytes, n, link) {
  if (n <= 1) return 0;
  return link.latencyS + (2 * (n - 1) / n) * msgBytes / link.bytesPerSec;
}

function cpuRamBytesPerSec(idx, build) {
  const cpu = idx.parts.get(build.cpu);
  const ram = systemRam(idx, build);
  const channelsUsed = Math.min(cpu.memChannels, Math.max(1, ram.modules));
  const mts = Math.min(ram.speedMTs, effectiveMaxMTs(cpu, ram));
  return channelsUsed * mts * 1e6 * idx.constants.inference.dramBytesPerTransfer;
}

// Consumer platforms drop memory speed with two DIMMs per channel.
export function effectiveMaxMTs(cpu, ram) {
  if (cpu.memMaxMTsTwoPerChannel && ram.modules > cpu.memChannels) return cpu.memMaxMTsTwoPerChannel;
  return cpu.memMaxMTs;
}

export function makeContext(idx, build, inf, layout, mem, opts = {}) {
  const { engine, model } = layout;
  return {
    idx, build, inf, layout, mem, engine, model,
    geo: mem.geo,
    kvBpe: mem.kvBytesPerElement,
    perf: engine.perf,
    ramBps: build.cpu ? cpuRamBytesPerSec(idx, build) : 0,
    perfScale: opts.perfScale ?? {}, // device index -> throttle multiplier on speed
  };
}

// Share of the path's peak that large matmuls reach (prefill and batched
// decode). MoE expert matmuls are split into many small GEMMs and run slower.
export function matmulEfficiency(perf, path, model) {
  const base = path === 'cuda-core' ? perf.prefillEfficiencyQuant : perf.prefillEfficiencyFp16;
  return model.moe ? base * perf.moePrefillFactor : base;
}

export function peakFlops(part, path) {
  if (path === 'cuda-core') return part.fp32Tflops * 1e12;
  if (path === 'tensor-fp16acc') return part.fp16AccTensorTflops * 1e12;
  return part.fp16TensorTflops * 1e12;
}

// ---------- decode ----------

export function decodeStep(c, B, depth) {
  const { idx, build, model, geo, perf, layout } = c;
  const actBytes = idx.constants.inference.activationBytes;
  const stages = [];
  let total = 0;
  let handoffs = 0;

  for (const s of layout.stages) {
    let t = 0;
    const detail = { kind: s.kind, layers: s.layers };
    if (s.kind === 'gpu') {
      const perLayerWeights = layerReadBytes(model, geo, B);
      const expertPart = model.moe ? perLayerWeights - geo.layerBytes : 0;
      let weightRead = s.layers * perLayerWeights - (s.cpuMoeOverlap ?? 0) * expertPart;
      if (s.lmHead) weightRead += geo.lmHeadBytes;
      const kvRead = B * kvBytesForLayers(model, c.kvBpe, depth, s.layers);
      const fullFrac = model.attention.fullLayers / model.layers;
      const attnFlops = B * s.layers * (fullFrac * attentionFlopsPerTokenLayer(model, depth, false)
        + (1 - fullFrac) * attentionFlopsPerTokenLayer(model, depth, true));
      const matFlops = 2 * B * (s.layers * layerActiveParams(model) + (s.lmHead ? model.vocab * model.hidden : 0));
      const kvShare = s.kvOnMain ? null : Math.max(1 / s.tp, 1 / model.kvHeads);
      const path = idx.formatComputePath[c.inf.engine][c.inf.quant];

      let slowest = 0;
      let minClock = Infinity;
      const perDevice = s.devices.map((d, j) => {
        const part = idx.parts.get(build.gpus[d].part);
        minClock = Math.min(minClock, part.boostClockMHz);
        const kv = s.kvOnMain ? (j === 0 ? kvRead : 0) : kvRead * kvShare;
        const bytes = weightRead / s.tp + kv;
        const tMem = bytes / (perf.bwEfficiency * part.memBandwidthGBs * GB);
        const peak = peakFlops(part, path);
        const tComp = (matFlops + attnFlops) / s.tp / (matmulEfficiency(perf, path, model) * peak);
        const dev = c.mem.devices[d];
        const tOff = dev.offloaded > 0 ? dev.offloaded / pcieBytesPerSec(idx, part, build.gpus[d].lanes) : 0;
        const scale = c.perfScale[d] ?? 1;
        const tDev = (Math.max(tMem, tComp) + tOff) / scale;
        slowest = Math.max(slowest, tDev);
        return { device: d, bytes, tMem, tComp, tOff, t: tDev };
      });
      // Fixed GPU-side cost per layer per step (scales with clock), plus a
      // host-side cost per extra sequence in the batch (scheduling, per-sequence
      // kernel launches). The benchmark data shows the second one does not get
      // faster on a faster GPU, so it is in absolute time.
      const cyclesPerLayer = perf.layerOverheadCycles + (model.moe ? perf.moeLayerOverheadCycles : 0);
      const overhead = s.layers * cyclesPerLayer / (minClock * 1e6)
        + (B - 1) * s.layers * perf.seqLayerOverheadUs * 1e-6;
      let comm = 0;
      if (s.tp > 1) {
        const link = groupLink(idx, build, s.devices);
        comm = 2 * s.layers * allreduceSeconds(B * model.hidden * actBytes, s.tp, link);
        detail.link = link.type;
      }
      t = slowest + overhead + comm;
      Object.assign(detail, { devices: perDevice, overhead, comm, tp: s.tp });
    } else if (s.kind === 'cpu') {
      let bytes = s.layers * layerReadBytes(model, geo, B) + (s.lmHead ? geo.lmHeadBytes : 0);
      bytes += B * kvBytesForLayers(model, c.kvBpe, depth, s.layers);
      t = bytes / (idx.constants.inference.cpuBwEfficiency * c.ramBps)
        + s.layers * idx.constants.inference.cpuLayerOverheadUs * 1e-6;
      Object.assign(detail, { bytes });
    } else if (s.kind === 'cpu-experts') {
      const u = uniqueExpertsTouched(model.moe.experts, model.moe.expertsPerToken, B);
      const bytes = s.layers * u * geo.expertBytesPerExpertLayer;
      t = bytes / (idx.constants.inference.cpuBwEfficiency * c.ramBps);
      // Each of these layers bounces activations GPU -> CPU -> GPU.
      const h = 2 * s.layers * handoffSeconds(c, B);
      t += h;
      Object.assign(detail, { bytes, handoff: h });
    }
    detail.t = t;
    stages.push(detail);
    total += t;
  }
  const seq = layout.stages.filter((s) => s.kind !== 'cpu-experts').length;
  if (seq > 1) handoffs = (seq - 1) * handoffSeconds(c, B);
  total += handoffs;
  return { seconds: total, stages, handoffs };
}

function handoffSeconds(c, B) {
  const { idx, model } = c;
  const bytes = B * model.hidden * idx.constants.inference.activationBytes;
  const gen4 = idx.constants.pcie.gen4x16GBs * GB;
  return idx.constants.interconnect.stageHandoffUs * 1e-6 + bytes / gen4;
}

export function decodeRate(c, B, depth) {
  const step = decodeStep(c, B, depth);
  return { perSequence: 1 / step.seconds, aggregate: B / step.seconds, step };
}

// ---------- prefill ----------

export function prefillSeconds(c, promptTokens) {
  const { idx, build, model, geo, perf, layout, inf } = c;
  const P = promptTokens;
  const chunk = c.engine.prefillChunkTokens;
  const nUb = Math.max(1, Math.ceil(P / chunk));
  const ub = Math.min(P, chunk);
  const path = idx.formatComputePath[inf.engine][inf.quant];
  const eff = matmulEfficiency(perf, path, model);
  const fullFrac = model.attention.fullLayers / model.layers;
  // Average attention span over the prompt ~ P/2 for full layers.
  const attnPerTokLayer = fullFrac * attentionFlopsPerTokenLayer(model, P / 2, false)
    + (1 - fullFrac) * attentionFlopsPerTokenLayer(model, P / 2, true);
  const actBytes = idx.constants.inference.activationBytes;

  const stageTimes = layout.stages.map((s) => {
    if (s.kind === 'gpu') {
      const flops = ub * s.layers * (2 * layerActiveParams(model) + attnPerTokLayer);
      let slowest = 0;
      let minClock = Infinity;
      for (const d of s.devices) {
        const part = idx.parts.get(build.gpus[d].part);
        minClock = Math.min(minClock, part.boostClockMHz);
        const tComp = flops / s.tp / (eff * peakFlops(part, path));
        const tW = (s.weightBytes / s.tp) / (perf.bwEfficiency * part.memBandwidthGBs * GB);
        slowest = Math.max(slowest, Math.max(tComp, tW) / (c.perfScale[d] ?? 1));
      }
      let comm = 0;
      if (s.tp > 1) comm = 2 * s.layers * allreduceSeconds(ub * model.hidden * actBytes, s.tp, groupLink(idx, build, s.devices));
      const cyclesPerLayer = perf.layerOverheadCycles + (model.moe ? perf.moeLayerOverheadCycles : 0);
      return slowest + comm + s.layers * cyclesPerLayer / (minClock * 1e6);
    }
    // CPU work: compute-bound on CPU cores (estimate constant).
    const cpu = idx.parts.get(build.cpu);
    const cpuFlops = cpu.cores * cpu.boostClockGHz * 1e9 * idx.constants.inference.cpuFlopsPerCoreCycle;
    const perLayer = s.kind === 'cpu-experts'
      ? 2 * model.moe.expertsPerToken * model.moe.expertParamsPerExpertLayer
      : 2 * layerActiveParams(model) + attnPerTokLayer;
    return (ub * s.layers * perLayer) / (idx.constants.inference.cpuPrefillEfficiency * cpuFlops);
  });
  const sum = stageTimes.reduce((a, b) => a + b, 0);
  const max = Math.max(...stageTimes);
  // Micro-batches flow through the stages like a pipeline.
  return sum + (nUb - 1) * max;
}
