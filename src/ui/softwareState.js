// The player's software setup, as evaluateBuild reads it. Starts empty: the
// player installs an OS and sets up each app themselves.

export function emptySoftware() {
  return { os: null, inference: null, gameServers: [], cloud: null };
}

// New inference server with the engine's own published defaults.
export function newInference(idx, engineId, modelId) {
  const e = idx.engines.get(engineId);
  const model = idx.models.get(modelId);
  const quant = e.weightFormats.find((q) => model.weights[q]) ?? e.weightFormats[0];
  const base = { engine: engineId, model: modelId, quant, kvType: e.kvTypeDefault, contextLength: model.maxContextNative, concurrency: 1 };
  return e.splitModes.includes('layer')
    ? { ...base, splitMode: 'layer', gpuLayers: 'all', cpuMoeLayers: 0 }
    : { ...base, tp: 1, pp: 1, cpuOffloadGB: 0 };
}

// What evaluateBuild gets: empty apps left out.
export function simSoftware(sw) {
  const out = { os: sw.os ?? undefined };
  if (sw.inference) out.inference = sw.inference;
  if (sw.gameServers?.length) out.gameServers = sw.gameServers;
  if (sw.cloud) out.cloud = sw.cloud;
  return out;
}
