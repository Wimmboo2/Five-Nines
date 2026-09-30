import { pub, est } from './lib.js';

// Inference engines: the real settings each one exposes (sourced from their
// docs), plus the performance constants the sim uses for them.
//
// Performance constants marked "fitted" are estimates produced by
// scripts/calibrate.js --fit against data-dev/benchmarks.js. The reasoning
// string names the benchmark set. They are NOT published numbers.
//
// displayName values are PLACEHOLDER fake names pending the checkpoint answer
// on real vs fake software names.

// Bytes per KV element for each cache type. GGML block formats: q8_0 is 32
// int8 values + one fp16 scale = 34 bytes per 32 elements, etc. (ggml-common.h).
export const kvCacheTypes = {
  f32: { bytesPerElement: pub(4, 'bytes', 'lcpp-server-readme') },
  f16: { bytesPerElement: pub(2, 'bytes', 'lcpp-server-readme') },
  bf16: { bytesPerElement: pub(2, 'bytes', 'lcpp-server-readme') },
  q8_0: { bytesPerElement: pub(34 / 32, 'bytes', 'ggml-common-h', 'block_q8_0 = fp16 scale + 32 x int8') },
  q5_1: { bytesPerElement: pub(24 / 32, 'bytes', 'ggml-common-h', 'block_q5_1 = 2 x fp16 + uint32 + 16 bytes') },
  q5_0: { bytesPerElement: pub(22 / 32, 'bytes', 'ggml-common-h', 'block_q5_0 = fp16 + uint32 + 16 bytes') },
  q4_1: { bytesPerElement: pub(20 / 32, 'bytes', 'ggml-common-h', 'block_q4_1 = 2 x fp16 + 16 bytes') },
  q4_0: { bytesPerElement: pub(18 / 32, 'bytes', 'ggml-common-h', 'block_q4_0 = fp16 + 16 bytes') },
  iq4_nl: { bytesPerElement: pub(18 / 32, 'bytes', 'ggml-common-h', 'block_iq4_nl = fp16 + 16 bytes') },
  fp8: { bytesPerElement: pub(1, 'bytes', 'vllm-src-cache', 'fp8 (=fp8_e4m3)') },
  fp8_e4m3: { bytesPerElement: pub(1, 'bytes', 'sglang-server-args') },
  fp8_e5m2: { bytesPerElement: pub(1, 'bytes', 'sglang-server-args') },
};

// Which weight formats run on which engine. GGUF quant names exist as real
// files in the HF GGUF repos (hf-files); AWQ/FP8/BF16 as safetensors repos.
const GGUF_FORMATS = ['Q4_0', 'Q4_K_M', 'Q5_K_M', 'Q6_K', 'Q8_0', 'F16', 'BF16', 'MXFP4'];
const HF_FORMATS = ['BF16', 'FP8', 'AWQ', 'MXFP4'];

// Weight format -> which tensor-core path prefill uses (estimate, see reasoning).
export const formatComputePath = est({
  Q4_0: 'int8', Q4_K_M: 'int8', Q5_K_M: 'int8', Q6_K: 'int8', Q8_0: 'int8', MXFP4: 'int8',
  F16: 'fp16', BF16: 'fp16', FP8: 'fp16', AWQ: 'fp16',
}, '', 'llama.cpp runs quantized GGUF matmuls on integer tensor paths and F16/BF16 on fp16 tensor paths; vLLM/SGLang AWQ and FP8 weight-only kernels do the math in fp16/bf16 on the GPUs in this catalog. Not confirmed per kernel on an opened page.');

export const engines = [
  {
    id: 'eng-kettle', displayName: 'Kettle', realRef: 'llama.cpp',
    weightFormats: pub(GGUF_FORMATS, '', 'hf-files', 'GGUF quantizations available for the catalog models'),
    kvTypes: pub(['f16', 'bf16', 'q8_0', 'q5_1', 'q5_0', 'q4_1', 'q4_0', 'iq4_nl', 'f32'], '', 'lcpp-server-readme'),
    kvTypeDefault: pub('f16', '', 'lcpp-server-readme'),
    splitModes: pub(['none', 'layer', 'row', 'tensor'], '', 'lcpp-server-readme'),
    cpuOffload: pub(['layers', 'moe-experts'], '', 'lcpp-server-readme', '-ngl and -cmoe/-ncmoe'),
    tensorParallel: est(true, 'bool', 'Row and tensor split modes split weights across GPUs and run them in parallel (README); treated as tensor-parallel stages.'),
    pipelineParallel: pub(true, 'bool', 'lcpp-server-readme', 'layer split is pipelined'),
    memFractionDefault: est(1.0, 'fraction', 'llama.cpp does not reserve a fixed fraction; it allocates what the model, KV and compute buffers need.'),
    runtimeOverheadGB: est(0.8, 'GB', 'CUDA context plus compute buffers at the default -ub 512. Not measured on an opened page.'),
    perf: {
      bwEfficiency: est(0.85, 'fraction', 'Placeholder before fitting.'),
      layerOverheadCycles: est(80000, 'cycles', 'Placeholder before fitting.'),
      prefillEfficiencyInt8: est(0.5, 'fraction', 'Placeholder before fitting.'),
      prefillEfficiencyFp16: est(0.5, 'fraction', 'Placeholder before fitting.'),
      batchDecodeEfficiency: est(0.2, 'fraction', 'Placeholder before fitting.'),
    },
  },
  {
    id: 'eng-sluice', displayName: 'Sluice', realRef: 'vLLM',
    weightFormats: pub(HF_FORMATS, '', 'vllm-engine-args', 'bf16, fp8, awq, mxfp4 among supported quantization methods'),
    kvTypes: pub(['auto', 'fp8', 'fp8_e4m3', 'fp8_e5m2'], '', 'vllm-src-cache', 'auto = model dtype'),
    kvTypeDefault: pub('auto', '', 'vllm-src-cache'),
    splitModes: pub(['none', 'tp', 'pp', 'tp+pp'], '', 'vllm-engine-args'),
    cpuOffload: pub(['uva-weights'], '', 'vllm-src-offload', '"part of the model is loaded from CPU memory to GPU memory on the fly in each model forward pass"'),
    tensorParallel: pub(true, 'bool', 'vllm-engine-args'),
    pipelineParallel: pub(true, 'bool', 'vllm-engine-args'),
    memFractionDefault: pub(0.92, 'fraction', 'vllm-src-cache', 'gpu_memory_utilization default'),
    runtimeOverheadGB: est(1.5, 'GB', 'Activation workspace and CUDA graphs inside the gpu_memory_utilization budget. Not measured on an opened page.'),
    perf: {
      bwEfficiency: est(0.85, 'fraction', 'Placeholder before fitting.'),
      layerOverheadCycles: est(80000, 'cycles', 'Placeholder before fitting.'),
      prefillEfficiencyInt8: est(0.5, 'fraction', 'Placeholder before fitting.'),
      prefillEfficiencyFp16: est(0.5, 'fraction', 'Placeholder before fitting.'),
      batchDecodeEfficiency: est(0.5, 'fraction', 'Placeholder before fitting.'),
    },
  },
  {
    id: 'eng-loom', displayName: 'Loom', realRef: 'SGLang',
    weightFormats: pub(HF_FORMATS, '', 'sglang-server-args', 'awq, fp8, mxfp4 in --quantization choices'),
    kvTypes: pub(['auto', 'bf16', 'fp8_e4m3', 'fp8_e5m2'], '', 'sglang-server-args'),
    kvTypeDefault: pub('auto', '', 'sglang-server-args'),
    splitModes: pub(['none', 'tp', 'pp', 'tp+pp'], '', 'sglang-server-args'),
    cpuOffload: est([], '', '--cpu-offload-gb was not on the SGLang server-arguments page read; no CPU offload until confirmed.'),
    tensorParallel: pub(true, 'bool', 'sglang-server-args'),
    pipelineParallel: pub(true, 'bool', 'sglang-server-args'),
    memFractionDefault: pub(0.88, 'fraction', 'sglang-server-args', '"computed as ~0.88 if undetectable"'),
    runtimeOverheadGB: est(1.5, 'GB', 'Activation workspace and CUDA graphs. Not measured on an opened page.'),
    perf: {
      bwEfficiency: est(0.85, 'fraction', 'No SGLang single-stream benchmark on catalog hardware was found; set equal to the fitted vLLM value.'),
      layerOverheadCycles: est(80000, 'cycles', 'Set equal to the fitted vLLM value (no SGLang data).'),
      prefillEfficiencyInt8: est(0.5, 'fraction', 'Set equal to the fitted vLLM value (no SGLang data).'),
      prefillEfficiencyFp16: est(0.5, 'fraction', 'Set equal to the fitted vLLM value (no SGLang data).'),
      batchDecodeEfficiency: est(0.5, 'fraction', 'Set equal to the fitted vLLM value (no SGLang data).'),
    },
  },
];
