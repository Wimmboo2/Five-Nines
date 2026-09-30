// Memory fit: weights + KV cache + runtime overhead against VRAM and system RAM.

import { GB } from './util.js';
import { weightGeometry, kvBytesForLayers, kvTpShare } from './model.js';

const fmt = (bytes) => `${(bytes / GB).toFixed(1)} GB`;

// Bytes of weights a stage holds IN TOTAL (before splitting across a TP group).
export function stageWeightBytes(model, geo, stage) {
  let bytes = 0;
  if (stage.kind === 'cpu-experts') return stage.layers * model.moe.experts * geo.expertBytesPerExpertLayer;
  bytes += stage.layers * geo.layerBytes;
  if (model.moe) {
    // Experts of this stage's layers, minus any moved to the CPU. The CPU
    // expert layers are taken from the start of the stack (llama.cpp -ncmoe
    // counts from the first layer), so they come out of the first stages.
    const expertLayers = Math.max(0, stage.layers - (stage.cpuMoeOverlap ?? 0));
    bytes += expertLayers * model.moe.experts * geo.expertBytesPerExpertLayer;
  }
  if (stage.embeddings && !stage.embeddingsOnCpu) bytes += geo.inputEmbBytes;
  if (stage.lmHead) bytes += geo.lmHeadBytes;
  return bytes;
}

// llama.cpp -ncmoe N keeps the experts of the FIRST N layers in RAM. Layers
// already on the CPU keep their experts there anyway, so they use up part of
// N; the rest comes out of the first GPU stages. The cpu-experts stage ends up
// holding only the experts that actually moved off a GPU.
export function assignCpuMoe(stages) {
  const cpuExp = stages.find((s) => s.kind === 'cpu-experts');
  let left = cpuExp ? cpuExp.layers : 0;
  let moved = 0;
  for (const s of stages) {
    if (s.kind === 'cpu-experts') continue;
    const take = Math.min(left, s.layers);
    left -= take;
    if (s.kind === 'gpu') {
      s.cpuMoeOverlap = take;
      moved += take;
    } else {
      s.cpuMoeOverlap = 0;
    }
  }
  if (cpuExp) cpuExp.layers = moved;
}

export function planMemory(idx, build, inf, layout) {
  const { engine, model, kvType, ctx, stages } = layout;
  const errors = [];
  const warnings = [];
  const geo = weightGeometry(model, inf.quant);
  const kvBpe = kvBytesPerElement(idx, model, kvType);
  const seqs = inf.concurrency ?? 1;
  const GiB = idx.constants.memory.bytesPerMarketedGB;
  assignCpuMoe(stages);
  const embStage = stages.find((s) => s.embeddings);
  if (embStage && engine.inputEmbeddingsOnCpu && embStage.kind === 'gpu') embStage.embeddingsOnCpu = true;

  const devices = build.gpus.map((g, i) => {
    const part = idx.parts.get(g.part);
    const frac = inf.memFraction ?? engine.memFractionDefault;
    return {
      index: i, partId: g.part, name: part.displayName, capacityBytes: part.vramGB * GiB,
      usableBytes: part.vramGB * GiB * frac, memFraction: frac,
      weights: 0, kv: 0, overhead: 0, offloaded: 0, used: false,
    };
  });
  let cpuWeights = embStage?.embeddingsOnCpu ? geo.inputEmbBytes : 0;
  let cpuKv = 0;

  for (const s of stages) {
    const wBytes = stageWeightBytes(model, geo, s);
    const kvBytes = s.kind === 'cpu-experts' ? 0 : seqs * kvBytesForLayers(model, kvBpe, ctx, s.layers);
    s.weightBytes = wBytes;
    s.kvBytes = kvBytes;
    if (s.kind !== 'gpu') {
      cpuWeights += wBytes;
      cpuKv += kvBytes;
      continue;
    }
    // Weights split across the TP group; KV split by heads unless the engine
    // keeps it on the main GPU (llama.cpp row split). With more TP ranks than
    // KV heads, heads are replicated.
    const kvShare = s.kvOnMain ? null : kvTpShare(model, s.tp);
    s.devices.forEach((d, j) => {
      const dev = devices[d];
      dev.used = true;
      dev.weights += wBytes / s.tp;
      dev.kv += s.kvOnMain ? (j === 0 ? kvBytes : 0) : kvBytes * kvShare;
    });
  }

  // vLLM CPU offload: this many bytes of each GPU's weights stay in pinned RAM.
  const offloadPerGpu = (inf.cpuOffloadGB ?? 0) * GB;
  for (const dev of devices) {
    if (!dev.used) continue;
    dev.overhead = engine.runtimeOverheadGB * GB;
    if (offloadPerGpu > 0) {
      dev.offloaded = Math.min(offloadPerGpu, dev.weights);
      dev.weights -= dev.offloaded;
      cpuWeights += dev.offloaded;
    }
    dev.need = dev.weights + dev.kv + dev.overhead;
    dev.fits = dev.need <= dev.usableBytes;
    if (!dev.fits) {
      const limit = dev.memFraction < 1
        ? `${fmt(dev.usableBytes)} usable (${Math.round(dev.memFraction * 100)}% of ${fmt(dev.capacityBytes)})`
        : fmt(dev.capacityBytes);
      errors.push(`GPU ${dev.index} (${dev.name}) needs ${fmt(dev.need)}: weights ${fmt(dev.weights)} + KV cache ${fmt(dev.kv)} for ${ctx.toLocaleString()} tokens x ${seqs} sequence(s) + runtime ${fmt(dev.overhead)}. It has ${limit}.`);
    }
  }

  // System RAM
  const ram = systemRam(idx, build);
  const osReserve = idx.constants.memory.osReserveGB;
  const cpuNeed = cpuWeights + cpuKv + osReserve * GB + (inf.extraRamBytes ?? 0);
  const ramFits = cpuNeed <= ram.capacityBytes;
  if (!ramFits) {
    errors.push(`System RAM needs ${fmt(cpuNeed)} (CPU-side weights ${fmt(cpuWeights)} + KV ${fmt(cpuKv)} + OS ${osReserve} GB) but only ${fmt(ram.capacityBytes)} is installed.`);
  }
  return {
    errors, warnings, devices, geo, kvBytesPerElement: kvBpe,
    kvBytesTotal: stages.reduce((a, s) => a + (s.kvBytes ?? 0), 0),
    cpu: { weights: cpuWeights, kv: cpuKv, need: cpuNeed, capacityBytes: ram.capacityBytes, fits: ramFits },
    fits: errors.length === 0,
  };
}

export function kvBytesPerElement(idx, model, kvType) {
  if (kvType === 'auto') {
    // vLLM/SGLang "auto" = the model's dtype; all catalog models keep bf16/fp16
    // attention, so 2 bytes.
    return idx.kvCacheTypes.bf16.bytesPerElement;
  }
  const t = idx.kvCacheTypes[kvType];
  if (!t) throw new Error(`unknown KV type ${kvType}`);
  return t.bytesPerElement;
}

export function systemRam(idx, build) {
  const GiB = idx.constants.memory.bytesPerMarketedGB;
  let capacityBytes = 0;
  let modules = 0;
  let speed = Infinity;
  let type = null;
  for (const r of build.ram ?? []) {
    const part = idx.parts.get(r.part);
    const count = (r.count ?? 1) * part.moduleCount;
    modules += count;
    capacityBytes += count * part.perModuleGB * GiB;
    speed = Math.min(speed, part.speedMTs);
    type = part.type;
  }
  return { capacityBytes, modules, speedMTs: Number.isFinite(speed) ? speed : 0, type };
}

// How many sequences of `ctx` tokens fit in the KV space left after weights and
// overhead (what vLLM/SGLang's paged KV pool admits at once). Per GPU, the
// tightest device decides.
export function maxSequences(model, mem, layout, ctx) {
  let best = Infinity;
  for (const s of layout.stages) {
    if (s.kind !== 'gpu') continue;
    const perSeq = kvBytesForLayers(model, mem.kvBytesPerElement, ctx, s.layers) * (s.kvOnMain ? 1 : kvTpShare(model, s.tp));
    for (const d of s.devices) {
      const dev = mem.devices[d];
      const free = dev.usableBytes - dev.weights - dev.overhead;
      best = Math.min(best, Math.floor(free / perSeq));
    }
  }
  return Math.max(0, best);
}
