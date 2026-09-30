import { pub, est } from './lib.js';
import { fittedPerf } from './fitted-perf.js';

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

// Which peak throughput a matmul path is limited by. Per engine, because the
// same weight format runs through different kernels in different engines.
//   cuda-core      : non-tensor FP32 rate (fp32Tflops)
//   tensor-fp16acc : FP16 tensor, FP16 accumulate (fp16AccTensorTflops)
//   tensor-fp32acc : FP16 tensor, FP32 accumulate (fp16TensorTflops)
export const formatComputePath = est({
  'eng-kettle': { Q4_0: 'cuda-core', Q4_K_M: 'cuda-core', Q5_K_M: 'cuda-core', Q6_K: 'cuda-core', Q8_0: 'cuda-core', MXFP4: 'cuda-core', F16: 'tensor-fp16acc', BF16: 'tensor-fp16acc' },
  'eng-sluice': { BF16: 'tensor-fp32acc', FP8: 'tensor-fp32acc', AWQ: 'tensor-fp32acc', MXFP4: 'tensor-fp32acc' },
  'eng-loom': { BF16: 'tensor-fp32acc', FP8: 'tensor-fp32acc', AWQ: 'tensor-fp32acc', MXFP4: 'tensor-fp32acc' },
}, '', 'Chosen from the calibration data, not from kernel docs. llama.cpp quantized prefill scales with CUDA-core throughput across 8 GPUs (1.7-3.6x fp32Tflops) far more consistently than with int8 tensor peak (7-31%), consistent with dequantization work bounding its quantized kernels. llama.cpp F16 prefill is 36-45% of the FP16-accumulate tensor peak on every GPU in the data, but 36-90% of the FP32-accumulate peak. vLLM/SGLang assumed to accumulate in FP32 (PyTorch default). Not confirmed on an opened page.');

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
    prefillChunkTokens: pub(512, 'tokens', 'lcpp-server-readme', '-ub physical batch default 512'),
    inputEmbeddingsOnCpu: est(true, 'bool', 'llama.cpp keeps the token-embedding table in host memory (only one row is looked up per token). Evidence: the published 6x 24 GB run of Llama 70B F16 does not fit if the 2.1 GB table sits on GPU 0. Not confirmed in docs.'),
    perf: fittedPerf['eng-kettle'],
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
    prefillChunkTokens: est(8192, 'tokens', 'max_num_batched_tokens default not captured from the docs page (listed as "testing convenience value"); 8192 assumed.'),
    inputEmbeddingsOnCpu: est(false, 'bool', 'vLLM loads all model weights onto the GPUs (embedding sharded with TP).'),
    perf: fittedPerf['eng-sluice'],
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
    prefillChunkTokens: est(8192, 'tokens', '--chunked-prefill-size default is None (auto) on the docs page; 8192 assumed to match the vLLM setting.'),
    inputEmbeddingsOnCpu: est(false, 'bool', 'SGLang loads all model weights onto the GPUs.'),
    perf: fittedPerf['eng-loom'],
  },
];
