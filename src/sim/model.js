// Model byte and FLOP geometry, derived from config values and real file sizes.
// Pure functions over a resolved model object from the catalog.

export function bytesPerParam(model, quant) {
  const bytes = model.weights[quant];
  if (!bytes) return null;
  return bytes / model.totalParams;
}

// Break the weight file into parts the sim can place and read.
//   inputEmbBytes: token embedding table. Stored, but only one row is read per token.
//   lmHeadBytes: output projection, read in full every step.
//   layerBytes: weights of one transformer layer (dense part only for MoE).
//   expertBytesPerExpertLayer: one expert in one layer (MoE only).
export function weightGeometry(model, quant) {
  const total = model.weights[quant];
  const bpp = bytesPerParam(model, quant);
  const embParams = model.vocab * model.hidden;
  const inputEmbBytes = embParams * bpp;
  const lmHeadBytes = model.tiedEmbeddings ? 0 : embParams * bpp;
  let expertBytesPerExpertLayer = 0;
  let expertBytesTotal = 0;
  if (model.moe) {
    expertBytesPerExpertLayer = model.moe.expertParamsPerExpertLayer * bpp;
    expertBytesTotal = expertBytesPerExpertLayer * model.moe.experts * model.layers;
  }
  const layerBytes = (total - inputEmbBytes - lmHeadBytes - expertBytesTotal) / model.layers;
  return { total, bpp, inputEmbBytes, lmHeadBytes, layerBytes, expertBytesPerExpertLayer, expertBytesTotal };
}

// Expected number of distinct experts hit in one layer when B tokens each pick
// k of E experts (uniform routing assumption; estimate).
export function uniqueExpertsTouched(E, k, B) {
  if (B <= 0) return 0;
  return E * (1 - (1 - k / E) ** B);
}

// Bytes of one layer's weights read for a decode step with batch B.
export function layerReadBytes(model, geo, B) {
  if (!model.moe) return geo.layerBytes;
  const u = uniqueExpertsTouched(model.moe.experts, model.moe.expertsPerToken, B);
  return geo.layerBytes + u * geo.expertBytesPerExpertLayer;
}

// KV bytes stored per token for ONE layer.
export function kvBytesPerTokenLayer(model, kvBytesPerElement) {
  return 2 * model.kvHeads * model.headDim * kvBytesPerElement;
}

// Tokens stored in the KV cache of a layer at context length ctx.
function tokensStored(model, ctx, sliding) {
  return sliding ? Math.min(ctx, model.attention.slidingWindow) : ctx;
}

// KV bytes for `layers` layers at context ctx for one sequence. Full and
// sliding-window layers are spread evenly through the stack (alternating in
// the models that have both), so a stage holding a fraction of the layers
// holds the same fraction of each kind.
export function kvBytesForLayers(model, kvBpe, ctx, layers) {
  const per = kvBytesPerTokenLayer(model, kvBpe);
  const fullFrac = model.attention.fullLayers / model.layers;
  const slidFrac = model.attention.slidingLayers / model.layers;
  return layers * per * (fullFrac * tokensStored(model, ctx, false) + slidFrac * tokensStored(model, ctx, true));
}

export function kvBytesTotal(model, kvBpe, ctx, sequences) {
  return sequences * kvBytesForLayers(model, kvBpe, ctx, model.layers);
}

// Parameters doing matmul work per token in one layer (for FLOP counts).
export function layerActiveParams(model) {
  const embParams = model.vocab * model.hidden;
  const lmHead = model.tiedEmbeddings ? 0 : embParams;
  if (!model.moe) return (model.totalParams - embParams - lmHead) / model.layers;
  const expertTotal = model.moe.expertParamsPerExpertLayer * model.moe.experts * model.layers;
  const denseLayer = (model.totalParams - embParams - lmHead - expertTotal) / model.layers;
  return denseLayer + model.moe.expertsPerToken * model.moe.expertParamsPerExpertLayer;
}

// Attention FLOPs per new token per layer at context ctx (QK^T and AV).
export function attentionFlopsPerTokenLayer(model, ctx, sliding) {
  const span = sliding ? Math.min(ctx, model.attention.slidingWindow) : ctx;
  return 4 * model.qHeads * model.headDim * span;
}
