// Turns the player's inference settings into an execution layout: a list of
// stages the forward pass goes through one after another.
//
//   gpu stage, tp = 1 : one GPU runs its layers.
//   gpu stage, tp > 1 : a tensor-parallel group. Every GPU holds a shard of
//                       every layer and they work AT THE SAME TIME.
//   cpu stage         : layers kept in system RAM, run by the CPU.
//   cpu-experts stage : MoE expert weights of some layers kept in system RAM.
//
// Stages run in sequence (devices take turns), so their times ADD. Inside a
// TP group the devices work in parallel, so the group's time is its slowest
// shard plus the all-reduce cost. inference.js implements that.

export function buildLayout(idx, build, inf) {
  const errors = [];
  const warnings = [];
  const engine = idx.engines.get(inf.engine);
  const model = idx.models.get(inf.model);
  if (!engine) return { errors: [`Unknown inference engine "${inf.engine}".`], warnings, stages: [] };
  if (!model) return { errors: [`Unknown model "${inf.model}".`], warnings, stages: [] };

  if (!engine.weightFormats.includes(inf.quant)) {
    errors.push(`${engine.displayName} cannot load ${inf.quant} weights. It supports: ${engine.weightFormats.join(', ')}.`);
  }
  if (!model.weights[inf.quant]) {
    errors.push(`${model.displayName} is not available in ${inf.quant}. Available: ${Object.keys(model.weights).join(', ')}.`);
  }
  const kvType = inf.kvType ?? engine.kvTypeDefault;
  if (!engine.kvTypes.includes(kvType)) {
    errors.push(`${engine.displayName} does not support KV cache type ${kvType}. Options: ${engine.kvTypes.join(', ')}.`);
  }
  const ctx = inf.contextLength;
  if (ctx > model.maxContextExtended) {
    errors.push(`${model.displayName} supports at most ${model.maxContextExtended.toLocaleString()} tokens of context; ${ctx.toLocaleString()} was requested.`);
  } else if (ctx > model.maxContextNative) {
    warnings.push(`${ctx.toLocaleString()} tokens is beyond ${model.displayName}'s native ${model.maxContextNative.toLocaleString()}; it needs RoPE scaling (YaRN), which the model card says can lower quality on short texts.`);
  }

  const allGpus = build.gpus.map((_, i) => i);
  let used = inf.gpus ?? allGpus;
  const L = model.layers;
  const stages = [];

  if (engine.splitModes.includes('layer')) {
    // llama.cpp-style engine
    const mode = inf.splitMode ?? (used.length > 1 ? 'layer' : 'none');
    if (!engine.splitModes.includes(mode)) errors.push(`${engine.displayName} has no split mode "${mode}".`);
    if (mode === 'none') used = used.slice(0, 1);
    if (mode === 'tensor') warnings.push(`${engine.displayName}'s "tensor" split mode is marked EXPERIMENTAL in its own documentation.`);
    const gpuLayers = inf.gpuLayers === undefined || inf.gpuLayers === 'all' ? L : Math.max(0, Math.min(L, inf.gpuLayers));
    if (used.length === 0 && gpuLayers > 0) errors.push('No GPUs selected, but layers are set to run on GPU.');
    const cpuLayers = used.length === 0 ? L : L - gpuLayers;
    if (cpuLayers > 0) {
      if (!engine.cpuOffload.includes('layers')) errors.push(`${engine.displayName} cannot run layers on the CPU.`);
      stages.push({ kind: 'cpu', layers: cpuLayers });
    }
    const onGpu = used.length === 0 ? 0 : gpuLayers;
    if (onGpu > 0) {
      if (mode === 'row' || mode === 'tensor') {
        stages.push({ kind: 'gpu', devices: used, tp: used.length, layers: onGpu, kvOnMain: mode === 'row' });
      } else {
        const weights = inf.tensorSplit ?? used.map((d) => idx.parts.get(build.gpus[d].part).vramGB);
        const counts = splitCounts(onGpu, weights);
        used.forEach((d, i) => {
          if (counts[i] > 0) stages.push({ kind: 'gpu', devices: [d], tp: 1, layers: counts[i], kvOnMain: false });
        });
      }
    }
    const cpuMoe = model.moe ? Math.min(L, inf.cpuMoeLayers ?? 0) : 0;
    if ((inf.cpuMoeLayers ?? 0) > 0 && !model.moe) warnings.push(`${model.displayName} is not a mixture-of-experts model; the MoE-on-CPU setting does nothing.`);
    if (cpuMoe > 0) {
      if (!engine.cpuOffload.includes('moe-experts')) errors.push(`${engine.displayName} cannot keep MoE experts on the CPU.`);
      stages.push({ kind: 'cpu-experts', layers: cpuMoe });
    }
  } else {
    // vLLM/SGLang-style engine: tp x pp GPUs
    const tp = inf.tp ?? 1;
    const pp = inf.pp ?? 1;
    if (tp < 1 || pp < 1) errors.push('Tensor and pipeline parallel sizes must be at least 1.');
    if (tp * pp !== used.length) {
      errors.push(`Tensor parallel (${tp}) x pipeline parallel (${pp}) = ${tp * pp} GPUs, but ${used.length} GPU(s) are assigned to ${engine.displayName}.`);
    }
    if (model.kvHeads % tp !== 0 && tp % model.kvHeads !== 0) {
      errors.push(`${model.displayName} has ${model.kvHeads} KV heads, which cannot be split evenly across tensor parallel ${tp}.`);
    }
    if ((inf.cpuOffloadGB ?? 0) > 0 && !engine.cpuOffload.includes('uva-weights')) {
      errors.push(`${engine.displayName} has no CPU weight offload.`);
    }
    const counts = splitCounts(L, Array(pp).fill(1));
    for (let s = 0; s < pp; s++) {
      const devices = used.slice(s * tp, s * tp + tp);
      if (devices.length) stages.push({ kind: 'gpu', devices, tp: devices.length, layers: counts[s], kvOnMain: false });
    }
  }

  // Embeddings live with the first stage that holds layers; the output head
  // with the last one.
  const layerStages = stages.filter((s) => s.kind !== 'cpu-experts');
  if (layerStages.length) {
    layerStages[0].embeddings = true;
    layerStages[layerStages.length - 1].lmHead = true;
  }
  return { errors, warnings, stages, engine, model, kvType, ctx, used };
}

// Split n items into integer counts proportional to weights.
export function splitCounts(n, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (n * w) / total);
  const counts = raw.map(Math.floor);
  let left = n - counts.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0]);
  for (let j = 0; left > 0; j++, left--) counts[order[j % order.length][1]]++;
  return counts;
}
