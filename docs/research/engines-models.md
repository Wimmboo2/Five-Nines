# Inference engines and models

Accessed 2026-09-30.

## Engines: real settings they expose

### llama.cpp

Source: `tools/server/README.md` on master, fetched raw.

**Split modes** (`-sm, --split-mode {none,layer,row,tensor}`), quoted from the README:
- `none`: "use one GPU only"
- `layer` (default): "split layers and KV across GPUs (pipelined)"
- `row`: "split weight across GPUs by rows (parallelized)"
- `tensor`: "split weights and KV across GPUs (parallelized, EXPERIMENTAL)"

**Offload and placement:**
- `-ngl` sets how many layers go to VRAM. The rest stay on the CPU.
- `-ts` sets the fraction of the model each GPU gets.
- `-cmoe` keeps all MoE expert weights on the CPU. `-ncmoe N` does it for the first N layers.
- `-ot` sets a buffer type per tensor-name pattern.

**KV cache types** (`-ctk` / `-ctv`): f32, f16, bf16, q8_0, q4_0, q4_1, iq4_nl, q5_0, q5_1. Default f16.

**Other settings:**
- `-fa on|off|auto` (flash attention)
- `-c` context size
- `-b` / `-ub` batch sizes (defaults 2048 / 512)
- `-np` parallel slots
- `--kv-unified`

### vLLM

Source: https://docs.vllm.ai/en/latest/configuration/engine_args.html

- **Parallelism:** `--tensor-parallel-size`, `--pipeline-parallel-size`, `--data-parallel-size`, `--enable-expert-parallel`
- **Memory:**
  - `--gpu-memory-utilization` (default 0.92 on the current docs page)
  - `--cpu-offload-gb`: "The space in GiB to offload to CPU, per GPU"
- **Context:** `--max-model-len`
- **KV cache dtype:** auto, bfloat16, float16, fp8, fp8_e4m3, fp8_e5m2, plus newer int8/int4/nvfp4 per-token-head variants
- **Scheduling:** `--max-num-seqs`, `--max-num-batched-tokens`, `--enable-chunked-prefill`, `--enforce-eager`, `--enable-prefix-caching`

### SGLang

Source: https://docs.sglang.io/advanced_features/server_arguments.html

- **Parallelism:** `--tp-size`, `--pp-size`
- **Memory:** `--mem-fraction-static` ("~0.88 if undetectable"), `--context-length`
- **KV cache dtype:** auto, fp8_e5m2, fp8_e4m3, bf16, nvfp4, fp4_mx_block16
- **Quantization:** awq, fp8, gptq, marlin, gguf, mxfp4, w8a8_int8 and more
- **Scheduling:** `--max-running-requests`, `--chunked-prefill-size`, `--page-size`, `--schedule-policy`

`--cpu-offload-gb` **was not on the page** I read, so the sim won't assume SGLang can offload to CPU until that's confirmed.

## Models (lean set, benchmark-backed)

Config values come from each model's `config.json` on Hugging Face. Parameter counts come from the HF API `safetensors.total`. Quantized weight sizes are real file sizes from HF repo listings: bartowski/unsloth/ggml-org GGUF repos, and the Qwen/RedHatAI/hugging-quants AWQ/FP8 repos.

| Model (realRef) | Layers | Q heads | KV heads | head_dim | hidden | vocab | tied emb | Params | Active | Max ctx |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Llama-2-7B | 32 | 32 | 32 | 128 | 4096 | 32000 | no | 6,738,415,616 | dense | 4,096 |
| Llama-3.1-8B-Instruct | 32 | 32 | 8 | 128 | 4096 | 128256 | no | 8,030,261,248 | dense | 131,072 |
| Qwen2.5-7B-Instruct | 28 | 28 | 4 | 128 | 3584 | 152064 | no | 7,615,616,512 | dense | 32,768 |
| Qwen3-8B | 36 | 32 | 8 | 128 | 4096 | 151936 | no | 8,190,735,360 | dense | 32,768 native, 131,072 YaRN |
| Mistral-Small-3.2-24B | 40 | 32 | 8 | 128 | 5120 | 131072 | no | ~24.0B incl. vision tower | dense | 131,072 |
| Qwen2.5-32B-Instruct | 64 | 40 | 8 | 128 | 5120 | 152064 | no | 32,763,876,352 | dense | 32,768 |
| Qwen3-32B | 64 | 64 | 8 | 128 | 5120 | 151936 | no | 32,762,123,264 | dense | 32,768 native, 131,072 YaRN |
| Qwen3-30B-A3B-Instruct-2507 | 48 | 32 | 4 | 128 | 2048 | 151936 | no | 30,532,122,624 | 3.3B (card) | 262,144 native |
| Llama-3.3-70B-Instruct | 80 | 64 | 8 | 128 | 8192 | 128256 | no | 70,553,706,496 | dense | 131,072 |
| gpt-oss-20b | 24 | 64 | 8 | 64 | 2880 | 201088 | no | 20,914,757,184 | 3.6B (card) | 131,072 |
| gpt-oss-120b | 36 | 64 | 8 | 64 | 2880 | 201088 | no | 116,829,156,672 | 5.1B (card) | 131,072 |

**Attention layout of the gpt-oss models:** they alternate `sliding_attention` (window 128) and `full_attention` layers (`layer_types` in the config). Only the full-attention layers store KV for the whole context. The sim computes KV per layer type because of this.

## Measured quantized sizes (bytes)

| Model | Q4_K_M | Q4_0 | Q8_0 | F16/BF16 | AWQ-int4 | FP8 |
| --- | --- | --- | --- | --- | --- | --- |
| Llama-2-7B | 4,081,004,224 | 3,825,807,040 | 7,161,089,728 | 13,476,876,272 (safetensors) | — | — |
| Llama-3.1-8B | 4,920,739,232 | — | 8,540,775,840 | 16,060,556,376 (safetensors) | 5,727,938,576 | 9,081,287,016 |
| Qwen2.5-7B | 4,683,074,240 | 4,444,121,792 | 8,098,525,888 | 15,237,853,600 | 5,570,829,760 | — |
| Qwen3-8B | 5,027,784,224 | 4,787,332,640 | 8,709,518,880 | 16,388,044,064 | 6,098,581,864 | 9,436,628,784 |
| Mistral-Small-3.2-24B | 14,333,915,264 | 13,494,235,264 | 25,054,785,664 | 47,153,524,544 | — | — |
| Qwen2.5-32B | 19,851,336,576 | 18,711,010,176 | 34,820,885,376 | 65,527,841,856 (safetensors) | — | — |
| Qwen3-32B | 19,762,149,696 | 18,703,087,936 | 34,817,719,616 | 65,531,575,584 | 19,325,481,744 | 34,322,567,640 |
| Qwen3-30B-A3B-2507 | 18,556,686,752 | 17,379,987,872 | 32,483,932,576 | 61,095,803,232 | — | 31,175,618,584 |
| Llama-3.3-70B | 42,520,398,816 | 40,116,538,336 | 74,975,055,008 | 141,117,918,624 | 39,767,996,256 | 72,669,954,704 |
| gpt-oss-20b | MXFP4 GGUF 12,109,566,624 | | | | | |
| gpt-oss-120b | MXFP4 GGUF 63,387,346,208 | | | | | |

**How bytes read per token are worked out (estimate, with the reasoning written down):**
- **Dense models:** params minus the input embedding table (vocab × hidden), because only one embedding row is read per token. The output head is fully read. The quantized file's average bytes/param is applied to that count.
- **MoE models:** active params from the model card × the file's average bytes/param. This assumes the active subset is quantized like the average of the file.

## Parked

- The user wants all the latest popular open models. See `models-hf-snapshot-2026-09-30.md`. It's a checkpoint item.
