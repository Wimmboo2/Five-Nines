import { pub, est } from './lib.js';
import { models2026 } from './models-2026.js';

// Open-weight models. Architecture values are from each repo's config.json and
// parameter counts from the Hugging Face API (source hf-configs). Quantized
// weight sizes are real file sizes in bytes (source hf-files).
//
// displayName values are the real model names: the user chose real software
// and model names at the stage-3 checkpoint (docs/decisions.md). Hardware
// stays fake.
//
// MoE structure (expertParamsPerExpertLayer) is derived from config dimensions:
// 3 x hidden x moe_intermediate per expert per layer (gate, up, down projections).
// The derived totals match the published parameter counts (see reasoning).

const cfg = (v, unit = '') => pub(v, unit, 'hf-configs');
const file = (bytes) => pub(bytes, 'bytes', 'hf-files');

function fullAttention(layers) {
  return { fullLayers: cfg(layers, 'layers'), slidingLayers: cfg(0, 'layers'), slidingWindow: cfg(0, 'tokens') };
}

const models2025 = [
  {
    id: 'mdl-tamarin-2-7b', displayName: 'Llama-2-7B', realRef: 'Llama-2-7B', family: 'tamarin',
    layers: cfg(32), qHeads: cfg(32), kvHeads: cfg(32), headDim: est(128, '', 'hidden_size 4096 / 32 attention heads (config has no head_dim field).', 'hf-configs'),
    hidden: cfg(4096), vocab: cfg(32000), tiedEmbeddings: cfg(false),
    totalParams: cfg(6738415616, 'params'),
    moe: null,
    attention: fullAttention(32),
    maxContextNative: cfg(4096, 'tokens'), maxContextExtended: cfg(4096, 'tokens'),
    nativeDtype: cfg('float16'),
    weights: {
      Q4_0: file(3825807040), Q4_K_M: file(4081004224), Q5_K_M: file(4783156928), Q6_K: file(5529194176), Q8_0: file(7161089728),
      F16: file(13476876272),
    },
  },
  {
    id: 'mdl-tamarin-31-8b', displayName: 'Llama-3.1-8B-Instruct', realRef: 'Llama-3.1-8B-Instruct', family: 'tamarin',
    layers: cfg(32), qHeads: cfg(32), kvHeads: cfg(8), headDim: cfg(128), hidden: cfg(4096), vocab: cfg(128256), tiedEmbeddings: cfg(false),
    totalParams: cfg(8030261248, 'params'),
    moe: null,
    attention: fullAttention(32),
    maxContextNative: cfg(131072, 'tokens'), maxContextExtended: cfg(131072, 'tokens'),
    nativeDtype: cfg('bfloat16'),
    weights: {
      Q4_K_M: file(4920739232), Q5_K_M: file(5732992416), Q6_K: file(6596011424), Q8_0: file(8540775840),
      BF16: file(16060556376), AWQ: file(5727938576), FP8: file(9081287016),
    },
  },
  {
    id: 'mdl-quill-25-7b', displayName: 'Qwen2.5-7B-Instruct', realRef: 'Qwen2.5-7B-Instruct', family: 'quill',
    layers: cfg(28), qHeads: cfg(28), kvHeads: cfg(4), headDim: est(128, '', 'hidden_size 3584 / 28 attention heads.', 'hf-configs'),
    hidden: cfg(3584), vocab: cfg(152064), tiedEmbeddings: cfg(false),
    totalParams: cfg(7615616512, 'params'),
    moe: null,
    attention: fullAttention(28),
    maxContextNative: cfg(32768, 'tokens'), maxContextExtended: cfg(32768, 'tokens'),
    nativeDtype: cfg('bfloat16'),
    weights: {
      Q4_0: file(4444121792), Q4_K_M: file(4683074240), Q5_K_M: file(5444831936), Q6_K: file(6254199488), Q8_0: file(8098525888),
      F16: file(15237853600), BF16: file(15231271888), AWQ: file(5570829760),
    },
  },
  {
    id: 'mdl-quill-3-8b', displayName: 'Qwen3-8B', realRef: 'Qwen3-8B', family: 'quill',
    layers: cfg(36), qHeads: cfg(32), kvHeads: cfg(8), headDim: cfg(128), hidden: cfg(4096), vocab: cfg(151936), tiedEmbeddings: cfg(false),
    totalParams: cfg(8190735360, 'params'),
    moe: null,
    attention: fullAttention(36),
    maxContextNative: pub(32768, 'tokens', 'hf-cards'), maxContextExtended: pub(131072, 'tokens', 'hf-cards', 'with YaRN'),
    nativeDtype: cfg('bfloat16'),
    weights: {
      Q4_0: file(4787332640), Q4_K_M: file(5027784224), Q5_K_M: file(5851112992), Q6_K: file(6725899808), Q8_0: file(8709518880),
      BF16: file(16388044064), AWQ: file(6098581864), FP8: file(9436628784),
    },
  },
  {
    id: 'mdl-mistle-32-24b', displayName: 'Mistral-Small-3.2-24B-Instruct-2506', realRef: 'Mistral-Small-3.2-24B-Instruct-2506', family: 'mistle',
    layers: cfg(40), qHeads: cfg(32), kvHeads: cfg(8), headDim: cfg(128), hidden: cfg(5120), vocab: cfg(131072), tiedEmbeddings: est(false, '', 'text_config does not set tie_word_embeddings; default false for Mistral.'),
    totalParams: est(23.57e9, 'params', 'HF reports 24.01B including the vision tower. Text-only count: BF16 GGUF file 47,153,524,544 bytes / 2 bytes per param = 23.58B.', 'hf-files'),
    moe: null,
    attention: fullAttention(40),
    maxContextNative: cfg(131072, 'tokens'), maxContextExtended: cfg(131072, 'tokens'),
    nativeDtype: cfg('bfloat16'),
    weights: {
      Q4_0: file(13494235264), Q4_K_M: file(14333915264), Q5_K_M: file(16763990144), Q6_K: file(19345944704), Q8_0: file(25054785664),
      BF16: file(47153524544),
    },
  },
  {
    id: 'mdl-quill-25-32b', displayName: 'Qwen2.5-32B-Instruct', realRef: 'Qwen2.5-32B-Instruct', family: 'quill',
    layers: cfg(64), qHeads: cfg(40), kvHeads: cfg(8), headDim: est(128, '', 'hidden_size 5120 / 40 attention heads.', 'hf-configs'),
    hidden: cfg(5120), vocab: cfg(152064), tiedEmbeddings: cfg(false),
    totalParams: cfg(32763876352, 'params'),
    moe: null,
    attention: fullAttention(64),
    maxContextNative: cfg(32768, 'tokens'), maxContextExtended: cfg(32768, 'tokens'),
    nativeDtype: cfg('bfloat16'),
    weights: {
      Q4_0: file(18711010176), Q4_K_M: file(19851336576), Q5_K_M: file(23262157696), Q6_K: file(26886155136), Q8_0: file(34820885376),
      BF16: file(65527841856),
    },
  },
  {
    id: 'mdl-quill-3-32b', displayName: 'Qwen3-32B', realRef: 'Qwen3-32B', family: 'quill',
    layers: cfg(64), qHeads: cfg(64), kvHeads: cfg(8), headDim: cfg(128), hidden: cfg(5120), vocab: cfg(151936), tiedEmbeddings: cfg(false),
    totalParams: cfg(32762123264, 'params'),
    moe: null,
    attention: fullAttention(64),
    maxContextNative: pub(32768, 'tokens', 'hf-cards'), maxContextExtended: pub(131072, 'tokens', 'hf-cards', 'with YaRN'),
    nativeDtype: cfg('bfloat16'),
    weights: {
      Q4_0: file(18703087936), Q4_K_M: file(19762149696), Q5_K_M: file(23214831936), Q6_K: file(26883306816), Q8_0: file(34817719616),
      BF16: file(65531575584), AWQ: file(19325481744), FP8: file(34322567640),
    },
  },
  {
    id: 'mdl-quill-3-30b-a3b', displayName: 'Qwen3-30B-A3B-Instruct-2507', realRef: 'Qwen3-30B-A3B-Instruct-2507', family: 'quill',
    layers: cfg(48), qHeads: cfg(32), kvHeads: cfg(4), headDim: cfg(128), hidden: cfg(2048), vocab: cfg(151936), tiedEmbeddings: cfg(false),
    totalParams: cfg(30532122624, 'params'),
    moe: {
      experts: cfg(128), expertsPerToken: cfg(8),
      expertParamsPerExpertLayer: est(3 * 2048 * 768, 'params', '3 x hidden (2048) x moe_intermediate (768). 48 layers x 128 experts x this = 28.99B of the 30.53B total; with 8 active experts the active count including embeddings is 3.34B, matching the card (3.3B).', 'hf-configs'),
    },
    attention: fullAttention(48),
    maxContextNative: pub(262144, 'tokens', 'hf-cards'), maxContextExtended: pub(262144, 'tokens', 'hf-cards'),
    nativeDtype: cfg('bfloat16'),
    weights: {
      Q4_0: file(17379987872), Q4_K_M: file(18556686752), Q5_K_M: file(21725581728), Q6_K: file(25092532640), Q8_0: file(32483932576),
      BF16: file(61095803232), FP8: file(31175618584),
    },
  },
  {
    id: 'mdl-tamarin-33-70b', displayName: 'Llama-3.3-70B-Instruct', realRef: 'Llama-3.3-70B-Instruct', family: 'tamarin',
    layers: cfg(80), qHeads: cfg(64), kvHeads: cfg(8), headDim: cfg(128), hidden: cfg(8192), vocab: cfg(128256), tiedEmbeddings: cfg(false),
    totalParams: cfg(70553706496, 'params'),
    moe: null,
    attention: fullAttention(80),
    maxContextNative: cfg(131072, 'tokens'), maxContextExtended: cfg(131072, 'tokens'),
    nativeDtype: cfg('bfloat16'),
    weights: {
      Q4_0: file(40116538336), Q4_K_M: file(42520398816), Q5_K_M: file(49949822112), Q6_K: file(57888148672), Q8_0: file(74975055008),
      F16: file(141117918624), BF16: file(141107497872), AWQ: file(39767996256), FP8: file(72669954704),
    },
  },
  {
    id: 'mdl-ossia-20b', displayName: 'gpt-oss-20b', realRef: 'gpt-oss-20b', family: 'ossia',
    layers: cfg(24), qHeads: cfg(64), kvHeads: cfg(8), headDim: cfg(64), hidden: cfg(2880), vocab: cfg(201088), tiedEmbeddings: cfg(false),
    totalParams: cfg(20914757184, 'params'),
    moe: {
      experts: cfg(32), expertsPerToken: cfg(4),
      expertParamsPerExpertLayer: est(3 * 2880 * 2880, 'params', '3 x hidden (2880) x intermediate (2880). 24 layers x 32 experts x this = 19.11B, matching the 19,110,297,600 MXFP4 (U8) parameter count; 4 active experts plus non-expert weights minus the input embedding = 3.6B, matching the card.', 'hf-configs'),
    },
    attention: {
      fullLayers: cfg(12, 'layers'), slidingLayers: cfg(12, 'layers'), slidingWindow: cfg(128, 'tokens'),
    },
    maxContextNative: cfg(131072, 'tokens'), maxContextExtended: cfg(131072, 'tokens'),
    nativeDtype: cfg('mxfp4 experts, bf16 other'),
    weights: { MXFP4: file(12109566624) },
  },
  {
    id: 'mdl-ossia-120b', displayName: 'gpt-oss-120b', realRef: 'gpt-oss-120b', family: 'ossia',
    layers: cfg(36), qHeads: cfg(64), kvHeads: cfg(8), headDim: cfg(64), hidden: cfg(2880), vocab: cfg(201088), tiedEmbeddings: cfg(false),
    totalParams: cfg(116829156672, 'params'),
    moe: {
      experts: cfg(128), expertsPerToken: cfg(4),
      expertParamsPerExpertLayer: est(3 * 2880 * 2880, 'params', '3 x hidden x intermediate (both 2880). 36 x 128 x this = 114.66B, matching the 114,661,785,600 MXFP4 parameter count; active = 5.1B as on the card.', 'hf-configs'),
    },
    attention: {
      fullLayers: cfg(18, 'layers'), slidingLayers: cfg(18, 'layers'), slidingWindow: cfg(128, 'tokens'),
    },
    maxContextNative: cfg(131072, 'tokens'), maxContextExtended: cfg(131072, 'tokens'),
    nativeDtype: cfg('mxfp4 experts, bf16 other'),
    weights: { MXFP4: file(63387346208) },
  },
];

export const models = [...models2025, ...models2026];
