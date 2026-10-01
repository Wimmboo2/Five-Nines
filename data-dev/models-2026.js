import { pub, est } from './lib.js';

// Models added 2026-09-30 (Part 0b). Picked from the Hugging Face API lists
// (trending, downloads, newest per org) on that date. Architecture values from
// each repo's config.json (text_config for multimodal repos), parameter counts
// from the HF API; file sizes are summed from the repo file listings
// (GGUF repos: unsloth / bartowski / openbmb; FP8 = the original safetensors
// of models that ship FP8 weights).
//
// Multimodal repos (Gemma 4, Qwen3.6/3.8/3.5, Ministral 3, Llama 4) count the
// vision tower in the API parameter total; GGUF text files do not. For those,
// totalParams = BF16 GGUF bytes / 2 (text weights only), tagged estimate.
//
// Q4_K_M sizes missing on HF are estimated as BF16 x 0.305: the median
// Q4_K_M/BF16 ratio of the models below that have both (0.294-0.330).

const cfg = (v, unit = '') => pub(v, unit, 'hf-configs-2026');
const file = (bytes, note) => pub(bytes, 'bytes', 'hf-files-2026', note);
const q4est = (bf16) => est(Math.round(bf16 * 0.305), 'bytes', `No Q4_K_M GGUF on HF for this model. BF16 GGUF ${bf16} bytes x 0.305 (median Q4_K_M/BF16 ratio of the other 2026 models that have both).`);
const textParams = (bf16) => est(bf16 / 2, 'params', `Multimodal repo: API total includes the vision tower. Text weights = BF16 GGUF ${bf16} bytes / 2 bytes per param.`, 'hf-files-2026');
const full = (n) => ({ fullLayers: cfg(n, 'layers'), slidingLayers: cfg(0, 'layers'), slidingWindow: cfg(0, 'tokens') });
const ctx = (n) => ({ maxContextNative: cfg(n, 'tokens'), maxContextExtended: cfg(n, 'tokens') });
const expertP = (hidden, inter, layers, experts, total) => est(3 * hidden * inter, 'params',
  `3 x hidden (${hidden}) x moe_intermediate (${inter}) (gate, up, down). ${layers} MoE layers x ${experts} experts x this = ${(3 * hidden * inter * layers * experts / 1e9).toFixed(2)}B of the ${(total / 1e9).toFixed(2)}B total.`, 'hf-configs-2026');
// Gated DeltaNet recurrent state per sequence per linear layer:
// value heads x key dim x value dim, stored as fp32 (4 bytes).
const deltaState = (vHeads) => est(vHeads * 128 * 128 * 4, 'bytes',
  `Linear-attention (Gated DeltaNet) state: ${vHeads} value heads x 128 key dim x 128 value dim, fp32 (llama.cpp keeps recurrent state in f32; assumed for all engines). Conv state left out (kernel 4, small).`, 'hf-configs-2026');
const MLA_LATENT = est(576, 'elements', 'MLA caches kv_lora_rank (512) + qk_rope_head_dim (64) = 576 values per token per layer (engines with MLA support store the compressed latent).', 'hf-configs-2026');
const DSA_NOTE = 'Sparse attention (index_topk 2048) is not modeled: attention is treated as full, which overstates attention work at long context.';

export const models2026 = [
  {
    id: 'mdl-quill-3-0b6', displayName: 'Qwen3-0.6B', realRef: 'Qwen3-0.6B', family: 'quill',
    layers: cfg(28), qHeads: cfg(16), kvHeads: cfg(8), headDim: cfg(128), hidden: cfg(1024), vocab: cfg(151936), tiedEmbeddings: cfg(true),
    totalParams: cfg(751632384, 'params'), moe: null, attention: full(28), ...ctx(40960), nativeDtype: cfg('bfloat16'),
    weights: { Q4_0: file(382156480), Q4_K_M: file(396705472), Q5_K_M: file(444415680), Q6_K: file(495107776), Q8_0: file(639447744), BF16: file(1198182848) },
  },
  {
    id: 'mdl-cpm-5-2b', displayName: 'MiniCPM5-2B', realRef: 'MiniCPM5-2B', family: 'cpm',
    layers: cfg(42), qHeads: cfg(16), kvHeads: cfg(2), headDim: cfg(128), hidden: cfg(2048), vocab: cfg(130560), tiedEmbeddings: cfg(false),
    totalParams: cfg(2516756480, 'params'), moe: null, attention: full(42), ...ctx(131072), nativeDtype: cfg('bfloat16'),
    weights: { Q4_K_M: file(1561318368), Q8_0: file(2679710688), F16: file(5039006688) },
  },
  {
    id: 'mdl-tamarin-32-3b', displayName: 'Llama-3.2-3B-Instruct', realRef: 'Llama-3.2-3B-Instruct', family: 'tamarin',
    layers: cfg(28), qHeads: cfg(24), kvHeads: cfg(8), headDim: cfg(128), hidden: cfg(3072), vocab: cfg(128256), tiedEmbeddings: cfg(true),
    totalParams: cfg(3212749824, 'params'), moe: null, attention: full(28), ...ctx(131072), nativeDtype: cfg('bfloat16'),
    weights: { Q4_K_M: file(2019377696), Q5_K_M: file(2322154016), Q6_K: file(2643853856), Q8_0: file(3421899296), F16: file(6433687840) },
  },
  {
    id: 'mdl-quill-3-4b', displayName: 'Qwen3-4B-Instruct-2507', realRef: 'Qwen3-4B-Instruct-2507', family: 'quill',
    layers: cfg(36), qHeads: cfg(32), kvHeads: cfg(8), headDim: cfg(128), hidden: cfg(2560), vocab: cfg(151936), tiedEmbeddings: cfg(true),
    totalParams: cfg(4022468096, 'params'), moe: null, attention: full(36), ...ctx(262144), nativeDtype: cfg('bfloat16'),
    weights: { Q4_0: file(2375773280), Q4_K_M: file(2497281120), Q5_K_M: file(2889514080), Q6_K: file(3306261600), Q8_0: file(4280405600), F16: file(8051285344) },
  },
  {
    id: 'mdl-mistle-3-8b', displayName: 'Ministral-3-8B-Instruct-2512', realRef: 'Ministral-3-8B-Instruct-2512', family: 'mistle',
    layers: cfg(34), qHeads: cfg(32), kvHeads: cfg(8), headDim: cfg(128), hidden: cfg(4096), vocab: cfg(131072), tiedEmbeddings: cfg(false),
    totalParams: textParams(16987559168), moe: null, attention: full(34), ...ctx(262144), nativeDtype: cfg('bfloat16'),
    weights: { Q4_0: file(4937324064), Q4_K_M: file(5198386720), Q5_K_M: file(6058743328), Q6_K: file(6972872224), Q8_0: file(9028867616), BF16: file(16987559168) },
  },
  {
    id: 'mdl-quill-3-14b', displayName: 'Qwen3-14B', realRef: 'Qwen3-14B', family: 'quill',
    layers: cfg(40), qHeads: cfg(40), kvHeads: cfg(8), headDim: cfg(128), hidden: cfg(5120), vocab: cfg(151936), tiedEmbeddings: cfg(false),
    totalParams: cfg(14768307200, 'params'), moe: null, attention: full(40), ...ctx(40960), nativeDtype: cfg('bfloat16'),
    weights: { Q4_0: file(8543001984), Q4_K_M: file(9001753984), Q5_K_M: file(10514570624), Q6_K: file(12121938304), Q8_0: file(15698534784), BF16: file(29543424160) },
  },
  {
    id: 'mdl-phi-4-14b', displayName: 'phi-4', realRef: 'phi-4', family: 'phi',
    layers: cfg(40), qHeads: cfg(40), kvHeads: cfg(10), headDim: est(128, '', 'hidden_size 5120 / 40 attention heads (config has no head_dim).', 'hf-configs-2026'),
    hidden: cfg(5120), vocab: cfg(100352), tiedEmbeddings: cfg(false),
    totalParams: cfg(14659507200, 'params'), moe: null, attention: full(40), ...ctx(16384), nativeDtype: cfg('bfloat16'),
    weights: { Q4_0: file(8412090816), Q4_K_M: file(9053114816), Q5_K_M: file(10604188096), Q6_K: file(12030251456), Q8_0: file(15580500416), F16: file(29323399616) },
  },
  {
    id: 'mdl-mistle-3-14b', displayName: 'Ministral-3-14B-Instruct-2512', realRef: 'Ministral-3-14B-Instruct-2512', family: 'mistle',
    layers: cfg(40), qHeads: cfg(32), kvHeads: cfg(8), headDim: cfg(128), hidden: cfg(5120), vocab: cfg(131072), tiedEmbeddings: cfg(false),
    totalParams: textParams(27020865952), moe: null, attention: full(40), ...ctx(262144), nativeDtype: cfg('bfloat16'),
    weights: { Q4_0: file(7805711040), Q4_K_M: file(8239067840), Q5_K_M: file(9620566720), Q6_K: file(11088409280), Q8_0: file(14359311040), BF16: file(27020865952) },
  },
  {
    id: 'mdl-quill-38-27b', displayName: 'Qwen3.8-27B', realRef: 'Qwen3.8-27B', family: 'quill',
    layers: cfg(64), qHeads: cfg(24), kvHeads: cfg(4), headDim: cfg(256), hidden: cfg(5120), vocab: cfg(248320), tiedEmbeddings: cfg(false),
    totalParams: textParams(54657735616), moe: null,
    attention: { fullLayers: cfg(16, 'layers'), slidingLayers: cfg(0, 'layers'), slidingWindow: cfg(0, 'tokens'), linearLayers: cfg(48, 'layers'), linearStateBytesPerLayer: deltaState(48) },
    ...ctx(262144), nativeDtype: cfg('bfloat16'),
    weights: { Q4_0: file(17426069344), Q4_K_M: q4est(54657735616), Q8_0: file(29047086048), BF16: file(54657735616) },
  },
  {
    id: 'mdl-quill-36-35b-a3b', displayName: 'Qwen3.6-35B-A3B', realRef: 'Qwen3.6-35B-A3B', family: 'quill',
    layers: cfg(40), qHeads: cfg(16), kvHeads: cfg(2), headDim: cfg(256), hidden: cfg(2048), vocab: cfg(248320), tiedEmbeddings: cfg(false),
    totalParams: textParams(69376638176),
    moe: { experts: cfg(256), expertsPerToken: cfg(8), expertParamsPerExpertLayer: expertP(2048, 512, 40, 256, 34688319088) },
    attention: { fullLayers: cfg(10, 'layers'), slidingLayers: cfg(0, 'layers'), slidingWindow: cfg(0, 'tokens'), linearLayers: cfg(30, 'layers'), linearStateBytesPerLayer: deltaState(32) },
    ...ctx(262144), nativeDtype: cfg('bfloat16'),
    weights: { Q4_K_M: q4est(69376638176), Q8_0: file(36903140320), BF16: file(69376638176) },
  },
  {
    id: 'mdl-gem-4-31b', displayName: 'gemma-4-31B-it', realRef: 'gemma-4-31B-it', family: 'gem',
    layers: cfg(60), qHeads: cfg(32), kvHeads: cfg(16), headDim: cfg(256), hidden: cfg(5376), vocab: cfg(262144), tiedEmbeddings: cfg(true),
    totalParams: textParams(62368033792), moe: null,
    attention: {
      fullLayers: cfg(10, 'layers'), slidingLayers: cfg(50, 'layers'), slidingWindow: cfg(1024, 'tokens'),
      fullKvHeads: cfg(4), fullHeadDim: cfg(512), fullKEqV: est(true, 'bool', 'config attention_k_eq_v: true; applied to the global (full) layers only, which carry their own KV shape. Not confirmed in model code.', 'hf-configs-2026'),
    },
    ...ctx(262144), nativeDtype: cfg('bfloat16'),
    weights: { Q4_0: file(17338248128), Q4_K_M: file(18323733440), Q5_K_M: file(21658401728), Q6_K: file(25201486784), Q8_0: file(33150364736), BF16: file(62368033792) },
  },
  {
    id: 'mdl-gem-4-26b-a4b', displayName: 'gemma-4-26B-A4B-it', realRef: 'gemma-4-26B-A4B-it', family: 'gem',
    layers: cfg(30), qHeads: cfg(16), kvHeads: cfg(8), headDim: cfg(256), hidden: cfg(2816), vocab: cfg(262144), tiedEmbeddings: cfg(true),
    totalParams: textParams(51360366400),
    moe: { experts: cfg(128), expertsPerToken: cfg(8, '', 'top_k_experts'), expertParamsPerExpertLayer: expertP(2816, 704, 30, 128, 25680183200) },
    attention: {
      fullLayers: cfg(5, 'layers'), slidingLayers: cfg(25, 'layers'), slidingWindow: cfg(1024, 'tokens'),
      fullKvHeads: cfg(2), fullHeadDim: cfg(512), fullKEqV: est(true, 'bool', 'config attention_k_eq_v: true; applied to the global layers only. Not confirmed in model code.', 'hf-configs-2026'),
    },
    ...ctx(262144), nativeDtype: cfg('bfloat16'),
    weights: { Q4_K_M: q4est(51360366400), Q8_0: file(27321628544), BF16: file(51360366400) },
  },
  {
    id: 'mdl-glade-47-flash', displayName: 'GLM-4.7-Flash', realRef: 'GLM-4.7-Flash', family: 'glade',
    layers: cfg(47), qHeads: cfg(20), kvHeads: cfg(20), headDim: est(256, '', 'MLA query head = qk_nope_head_dim 192 + qk_rope_head_dim 64.', 'hf-configs-2026'),
    hidden: cfg(2048), vocab: cfg(154880), tiedEmbeddings: cfg(false),
    totalParams: est(59908837696 / 2, 'params', 'API total 31.22B includes the multi-token-prediction layer, which the GGUF files leave out. BF16 GGUF bytes / 2 = 29.95B.', 'hf-files-2026'),
    moe: { experts: cfg(64), expertsPerToken: cfg(4), moeLayers: est(46, 'layers', '47 layers minus first_k_dense_replace (1).', 'hf-configs-2026'), expertParamsPerExpertLayer: expertP(2048, 1536, 46, 64, 29954418848) },
    attention: { ...full(47), mlaLatentDim: MLA_LATENT },
    ...ctx(202752), nativeDtype: cfg('bfloat16'),
    weights: { Q4_0: file(17216676192), Q4_K_M: file(18312339808), Q5_K_M: file(21408850272), Q6_K: file(24693098848), Q8_0: file(31842799968), BF16: file(59908837696) },
  },
  {
    id: 'mdl-glade-45-air', displayName: 'GLM-4.5-Air', realRef: 'GLM-4.5-Air', family: 'glade',
    layers: cfg(46), qHeads: cfg(96), kvHeads: cfg(8), headDim: cfg(128), hidden: cfg(4096), vocab: cfg(151552), tiedEmbeddings: cfg(false),
    totalParams: cfg(110468824832, 'params'),
    moe: { experts: cfg(128), expertsPerToken: cfg(8), moeLayers: est(45, 'layers', '46 layers minus first_k_dense_replace (1).', 'hf-configs-2026'), expertParamsPerExpertLayer: expertP(4096, 1408, 45, 128, 110468824832) },
    attention: full(46), ...ctx(131072), nativeDtype: cfg('bfloat16'),
    weights: { Q4_0: file(62781050112), Q4_K_M: file(72975748384), Q5_K_M: file(83519589632), Q6_K: file(99007528192), Q8_0: file(117456506240), BF16: file(220997406080) },
  },
  {
    id: 'mdl-tamarin-4-scout', displayName: 'Llama-4-Scout-17B-16E-Instruct', realRef: 'Llama-4-Scout-17B-16E-Instruct', family: 'tamarin',
    layers: cfg(48), qHeads: cfg(40), kvHeads: cfg(8), headDim: cfg(128), hidden: cfg(5120), vocab: cfg(202048), tiedEmbeddings: cfg(false),
    totalParams: textParams(215561682208),
    moe: { experts: cfg(16), expertsPerToken: cfg(1), expertParamsPerExpertLayer: expertP(5120, 8192, 48, 16, 107780841104) },
    attention: {
      fullLayers: est(12, 'layers', 'no_rope_layers marks 12 NoPE global layers; the other 36 use chunked attention (attention_chunk_size 8192).', 'hf-configs-2026'),
      slidingLayers: est(36, 'layers', 'Chunked attention (8192-token chunks) treated as an 8192-token sliding window: the same upper bound on tokens attended.', 'hf-configs-2026'),
      slidingWindow: cfg(8192, 'tokens'),
    },
    ...ctx(10485760), nativeDtype: cfg('bfloat16'),
    weights: { Q4_0: file(61182963392), Q4_K_M: file(65359900352), Q5_K_M: file(76546444992), Q6_K: file(88432148672), Q8_0: file(114531589472), BF16: file(215561682208) },
  },
  {
    id: 'mdl-quill-35-122b-a10b', displayName: 'Qwen3.5-122B-A10B', realRef: 'Qwen3.5-122B-A10B', family: 'quill',
    layers: cfg(48), qHeads: cfg(32), kvHeads: cfg(2), headDim: cfg(256), hidden: cfg(3072), vocab: cfg(248320), tiedEmbeddings: cfg(false),
    totalParams: textParams(244314011488),
    moe: { experts: cfg(256), expertsPerToken: cfg(8), expertParamsPerExpertLayer: expertP(3072, 1024, 48, 256, 122157005744) },
    attention: { fullLayers: cfg(12, 'layers'), slidingLayers: cfg(0, 'layers'), slidingWindow: cfg(0, 'tokens'), linearLayers: cfg(36, 'layers'), linearStateBytesPerLayer: deltaState(64) },
    ...ctx(262144), nativeDtype: cfg('bfloat16'),
    weights: { Q4_K_M: file(76536964608), Q5_K_M: file(91519219200), Q6_K: file(101009782432), Q8_0: file(129871935104), BF16: file(244314011488) },
  },
  {
    id: 'mdl-mmx-m27', displayName: 'MiniMax-M2.7', realRef: 'MiniMax-M2.7', family: 'mmx',
    layers: cfg(62), qHeads: cfg(48), kvHeads: cfg(8), headDim: cfg(128), hidden: cfg(3072), vocab: cfg(200064), tiedEmbeddings: cfg(false),
    totalParams: cfg(228689764864, 'params'),
    moe: { experts: cfg(256), expertsPerToken: cfg(8), expertParamsPerExpertLayer: expertP(3072, 1536, 62, 256, 228689764864) },
    attention: full(62), ...ctx(204800), nativeDtype: cfg('fp8 (e4m3, block 128) weights'),
    weights: { Q4_K_M: q4est(457487024928), Q8_0: file(243136872992), BF16: file(457487024928), FP8: file(230134260592, 'original safetensors, FP8') },
  },
  {
    id: 'mdl-deep-v32', displayName: 'DeepSeek-V3.2', realRef: 'DeepSeek-V3.2', family: 'deep',
    layers: cfg(61), qHeads: cfg(128), kvHeads: cfg(128), headDim: est(192, '', 'MLA query head = qk_nope_head_dim 128 + qk_rope_head_dim 64.', 'hf-configs-2026'),
    hidden: cfg(7168), vocab: cfg(129280), tiedEmbeddings: cfg(false),
    totalParams: est(1342273065376 / 2, 'params', 'API total 685.36B includes the multi-token-prediction layer (num_nextn_predict_layers 1), which the GGUF files leave out. BF16 GGUF bytes / 2 = 671.1B, the main model the sim runs.', 'hf-files-2026'),
    moe: { experts: cfg(256), expertsPerToken: cfg(8), moeLayers: est(58, 'layers', '61 layers minus first_k_dense_replace (3).', 'hf-configs-2026'), expertParamsPerExpertLayer: expertP(7168, 2048, 58, 256, 671136532688) },
    attention: { ...full(61), mlaLatentDim: MLA_LATENT, sparseAttentionModeled: est(false, 'bool', DSA_NOTE) },
    ...ctx(163840), nativeDtype: cfg('fp8 (e4m3, block 128) weights'),
    weights: { Q4_0: file(380088791008), Q4_K_M: file(405398024320), Q5_K_M: file(476161405152), Q6_K: file(551313406528), Q8_0: file(713286531616), BF16: file(1342273065376), FP8: file(689483049129, 'original safetensors, FP8') },
  },
  {
    id: 'mdl-glade-53', displayName: 'GLM-5.3', realRef: 'GLM-5.3', family: 'glade',
    layers: cfg(78), qHeads: cfg(64), kvHeads: cfg(64), headDim: est(256, '', 'MLA query head = qk_nope_head_dim 192 + qk_rope_head_dim 64.', 'hf-configs-2026'),
    hidden: cfg(6144), vocab: cfg(154880), tiedEmbeddings: cfg(false),
    totalParams: cfg(753329940480, 'params'),
    moe: { experts: cfg(256), expertsPerToken: cfg(8), moeLayers: cfg(75, 'layers'), expertParamsPerExpertLayer: expertP(6144, 2048, 75, 256, 753329940480) },
    attention: { ...full(78), mlaLatentDim: MLA_LATENT, sparseAttentionModeled: est(false, 'bool', DSA_NOTE) },
    ...ctx(1048576), nativeDtype: cfg('fp8 (e4m3, block 128) weights'),
    weights: { Q4_K_M: q4est(1507988027936), Q8_0: file(801357677216), BF16: file(1507988027936), FP8: file(755632050320, 'original safetensors, FP8') },
  },
];
