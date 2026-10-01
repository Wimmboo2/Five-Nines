// Model byte and FLOP geometry, derived from config values and real file sizes.
// Pure functions over a resolved model object from the catalog.

export function bytesPerParam(model, quant) {
  const bytes = model.weights[quant];
  if (!bytes) return null;
  return bytes / model.totalParams;
}

// Expert parameters per layer, averaged over ALL layers. Some MoE models keep
// their first few layers dense (config first_k_dense_replace); moe.moeLayers
// says how many layers carry experts.
export function avgExpertParamsPerLayer(model) {
  if (!model.moe) return 0;
  return model.moe.expertParamsPerExpertLayer * (model.moe.moeLayers ?? model.layers) / model.layers;
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
    expertBytesPerExpertLayer = avgExpertParamsPerLayer(model) * bpp;
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
//   MLA models (attention.mlaLatentDim) cache one compressed latent vector
//   per token, from which K and V are rebuilt.
//   Some models give their full-attention layers a different KV shape
//   (attention.fullKvHeads / fullHeadDim; fullKEqV = keys double as values).
export function kvBytesPerTokenLayer(model, kvBytesPerElement, kind = 'sliding') {
  const a = model.attention;
  if (a.mlaLatentDim) return a.mlaLatentDim * kvBytesPerElement;
  if (kind === 'full' && a.fullKvHeads) return (a.fullKEqV ? 1 : 2) * a.fullKvHeads * a.fullHeadDim * kvBytesPerElement;
  return 2 * model.kvHeads * model.headDim * kvBytesPerElement;
}

// Share of one sequence's KV cache each GPU of a TP group holds. KV heads are
// split across GPUs; an MLA latent is not split (every GPU keeps a copy).
export function kvTpShare(model, tp) {
  if (model.attention.mlaLatentDim) return 1;
  return Math.max(1 / tp, 1 / model.kvHeads);
}

// Tokens stored in the KV cache of a layer at context length ctx.
function tokensStored(model, ctx, sliding) {
  return sliding ? Math.min(ctx, model.attention.slidingWindow) : ctx;
}

// KV bytes for `layers` layers at context ctx for one sequence. Full and
// sliding-window layers are spread evenly through the stack (alternating in
// the models that have both), so a stage holding a fraction of the layers
// holds the same fraction of each kind.
// Linear-attention layers (attention.linearLayers) keep a fixed-size
// recurrent state per sequence instead of a growing cache.
export function kvBytesForLayers(model, kvBpe, ctx, layers) {
  const a = model.attention;
  const fullFrac = a.fullLayers / model.layers;
  const slidFrac = a.slidingLayers / model.layers;
  const linFrac = (a.linearLayers ?? 0) / model.layers;
  return layers * (fullFrac * kvBytesPerTokenLayer(model, kvBpe, 'full') * tokensStored(model, ctx, false)
    + slidFrac * kvBytesPerTokenLayer(model, kvBpe, 'sliding') * tokensStored(model, ctx, true)
    + linFrac * (a.linearStateBytesPerLayer ?? 0));
}

export function kvBytesTotal(model, kvBpe, ctx, sequences) {
  return sequences * kvBytesForLayers(model, kvBpe, ctx, model.layers);
}

// Parameters doing matmul work per token in one layer (for FLOP counts).
export function layerActiveParams(model) {
  const embParams = model.vocab * model.hidden;
  const lmHead = model.tiedEmbeddings ? 0 : embParams;
  if (!model.moe) return (model.totalParams - embParams - lmHead) / model.layers;
  const expertTotal = avgExpertParamsPerLayer(model) * model.moe.experts * model.layers;
  const denseLayer = (model.totalParams - embParams - lmHead - expertTotal) / model.layers;
  return denseLayer + model.moe.expertsPerToken * avgExpertParamsPerLayer(model);
}

// Attention FLOPs per new token per layer at context ctx (QK^T and AV).
export function attentionFlopsPerTokenLayer(model, ctx, sliding) {
  const span = sliding ? Math.min(ctx, model.attention.slidingWindow) : ctx;
  const dim = !sliding && model.attention.fullHeadDim ? model.attention.fullHeadDim : model.headDim;
  return 4 * model.qHeads * dim * span;
}

// Average attention FLOPs per token per layer over the whole stack.
// Linear-attention layers do a fixed amount of state work per token; it is
// small next to the projections and left out (estimate).
export function avgAttentionFlops(model, ctx) {
  const a = model.attention;
  return (a.fullLayers * attentionFlopsPerTokenLayer(model, ctx, false)
    + a.slidingLayers * attentionFlopsPerTokenLayer(model, ctx, true)) / model.layers;
}
