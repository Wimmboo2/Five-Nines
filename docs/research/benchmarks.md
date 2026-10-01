# Inference benchmarks (calibration set)

Accessed 2026-09-30. These are the published numbers the sim is calibrated against. Every case below is in `data-dev/benchmarks.json`, with a source id.

**Caveat on how some pages were read.** GitHub discussion pages can't be fetched raw from this environment. I read them through WebFetch's page summarizer. The llama.cpp CUDA scoreboard was read twice independently and the numbers matched both times. The other GitHub pages were read once.

## A. llama.cpp CUDA scoreboard (Llama 2 7B Q4_0, one GPU)

- **Source:** https://github.com/ggml-org/llama.cpp/discussions/15013
- **Command:** `llama-bench -m llama-2-7b.Q4_0.gguf -ngl 99 -fa 0,1`
- **Model:** 3.56 GiB, 6.74 B params
- **Tests:** tg128 = decode of 128 tokens from empty context, pp512 = prefill of 512 tokens

| GPU (realRef) | tg128 no FA | tg128 FA | pp512 no FA | pp512 FA | Commit |
| --- | --- | --- | --- | --- | --- |
| RTX 3060 (12 GB) | 75.57 | 76.92 | 2137.50 | 2407.67 | baa9255 |
| RTX 3090 | 158.16 | 161.89 | 5174.69 | 5560.06 | c76b420 |
| RTX 4090 | 186.21 | 188.96 | 11992.70 | 14770.63 | 2241453 |
| RTX 5090 | 290.02 | 300.40 | 14073.41 | 14970.15 | 8cf6b42 |
| RTX A6000 | 138.73 | 144.87 | 4913.93 | 5662.39 | 4795c91 |
| RTX PRO 6000 Blackwell | 274.20 | 281.11 | 14854.63 | 16618.98 | 79c1160 / 5143fa8 |
| A100 80 GB (HBM2e; PCIe or SXM not stated) | 190.88 | 200.90 | 4849.53 | 5285.96 | 5143fa8 |
| H100 80 GB (HBM3, so SXM5; the PCIe card uses HBM2e) | 267.81 | 280.74 | 9918.34 | 11263.29 | 5143fa8 |

**Things this data shows:**
- **The share of peak bandwidth reached is not constant across GPUs.** The bytes read per token are fixed (3.82 GB), so tg128 × 3.82 GB ÷ peak bandwidth gives the share of peak that each GPU reaches:

  | GPU | Share of peak bandwidth |
  | --- | --- |
  | 3060 | 80% |
  | 3090 | 65% |
  | 4090 | 71% |
  | 5090 | 62% |
  | H100 SXM | 31% |

  A fixed time cost per token/layer, not only a bandwidth term, is the natural explanation. The sim models it as a per-layer overhead fitted to this data.
- **The A100 variant is ambiguous.** The sim uses A100 PCIe for the A and B cases. The ambiguity gets reported.

## B. Multi-GPU layer split, llama.cpp (XiongjieDai/GPU-Benchmarks-on-LLM-Inference)

- **Source:** https://raw.githubusercontent.com/XiongjieDai/GPU-Benchmarks-on-LLM-Inference/main/README.md (raw file read directly)
- **Setup:**
  - llama.cpp from May 2024 (default split mode = layer)
  - RunPod
  - CUDA 12.1.1
  - Metric: "Average speed (tokens/s) of generating 1024 tokens"
- **Models:** Llama 3 8B and 70B, same architecture as Llama 3.1 8B / 3.3 70B. Q4_K_M sizes: 4.58 GB / 39.59 GB.

Text generation, tok/s:

| GPUs | 8B Q4_K_M | 8B F16 | 70B Q4_K_M | 70B F16 |
| --- | --- | --- | --- | --- |
| 3090 | 111.74 | 46.51 | OOM | OOM |
| 3090 ×2 | 108.07 | 47.15 | 16.29 | OOM |
| 3090 ×4 | 104.94 | 46.40 | 16.89 | OOM |
| 3090 ×6 | 101.07 | 45.55 | 16.93 | 5.82 |
| 4090 | 127.74 | 54.34 | OOM | OOM |
| 4090 ×2 | 122.56 | 53.27 | 19.06 | OOM |
| 4090 ×4 | 117.61 | 52.69 | 18.83 | OOM |
| 4090 ×8 | 116.13 | 52.12 | 18.76 | 6.45 |
| RTX A6000 | 102.22 | 40.25 | 14.58 | OOM |
| RTX A6000 ×4 | 93.73 | 38.87 | 14.32 | 4.74 |
| L40S | 113.60 | 43.42 | 15.31 | OOM |
| L40S ×4 | 105.72 | 42.48 | 14.99 | 5.03 |
| A100 PCIe 80GB | 138.31 | 54.56 | 22.11 | OOM |
| A100 PCIe 80GB ×4 | 117.30 | 51.54 | 22.68 | 7.38 |
| A100 SXM 80GB | 133.38 | 53.18 | 24.33 | OOM |

**This directly supports the user's rule** that sequential stages add their times. More GPUs in layer split make decode slightly *slower* when the model already fits on one GPU. Examples: 3090 111.74 → 2× 108.07 → 4× 104.94.

## C. gpt-oss-20b on one GPU, llama.cpp (guide discussion)

- **Source:** https://github.com/ggml-org/llama.cpp/discussions/15396
- **Tables copied as posted:** gpt-oss 20B MXFP4 MoE, 11.27 GiB, 20.91 B params, `-fa 1 -b 4096`
- **RTX 4090:** tg128 221.95 (ub 2048), 225.22 (ub 4096); pp2048 8022.33; pp32768 5112.35
- **RTX 5090:** tg128 282.51 / 282.26; pp2048 9848.38; pp32768 6290.76

## D. Single-stream and batched decode, vLLM vs llama.cpp (computingforgeeks)

- **Source:** https://computingforgeeks.com/ollama-vs-vllm-vs-llama-cpp/
- **Setup:**
  - Model: Qwen2.5-7B-Instruct
  - vLLM uses AWQ 4-bit (~5.6 GB). llama.cpp uses Q4_K_M (~4.7 GB).
  - 4096 ctx, 512-token prompt, 256-token output
- **Single-stream decode:** the table reports **the same value for vLLM and llama.cpp**:

  | GPU | tok/s |
  | --- | --- |
  | 4090 | ~174 |
  | L40S | ~136 |
  | 5090 | ~250 |

- **Aggregate throughput at 64 concurrent requests:**

  | GPU | vLLM | llama.cpp |
  | --- | --- | --- |
  | 4090 | 6,623 | 2,391 |
  | L40S | 6,249 | 1,748 |
  | 5090 | 8,310 | 1,875 |

- The "~" values are approximate as published.

## E. Tensor parallel, vLLM (arXiv 2512.01644, "A Systematic Characterization of LLM Inference on GPUs")

- **Source:** https://arxiv.org/html/2512.01644 (HTML version read)
- **Setup:**
  - 4× A100 80GB SXM ("NVLink pairs, PCIe across pairs")
  - Qwen2.5-32B-Instruct, BF16
  - vLLM v0.9.2
  - Chat workload: 64 input / 128 output tokens

| Config | tok/s | ms/token |
| --- | --- | --- |
| Single GPU | 22.16 | 45.12 |
| TP2 | 20.53 | 48.72 |
| PP2 | 21.08 | 47.43 |
| TP4 | 18.55 | 53.92 |

**This is the only tensor-parallel data point I found with absolute numbers, and it shows TP2 as slower than one GPU.** The authors put it down to communication overhead ">60% in Decode for TP4".

- It contradicts the common expectation that TP speeds up single-stream decode on large models.
- It is kept as a calibration case and reported as-is. The sim's TP cost is **not** tuned to force a match, because one outlier setup shouldn't drive the model.

## F. Long-context decode, llama.cpp on RTX PRO 6000 (localllm.in)

- **Source:** https://localllm.in/blog/best-local-llms-96gb-vram
- **Model:** gpt-oss-120b (article says "Q4_K_M", ~59.4 GB). FA enabled per the article's general setup.
- **KV cache type is not stated.**
- **Decode t/s by context depth:**

  | Depth | tok/s |
  | --- | --- |
  | 8K | 207.7 |
  | 16K | 203.5 |
  | 32K | 195.2 |
  | 64K | 179.9 |
  | 131K | 158.2 |

## Not found (gaps)

- **CPU-offload decode with a normal thread count.** The one gist found (`slewsys`) ran `--threads 1`, so it isn't representative.
- **SGLang single-stream decode on hardware in the catalog.**
- **Any benchmark for H100 NVL.**
- **Positive 1-vs-2 GPU tensor-parallel single-stream numbers from a controlled source.** HyperQwen issue #40 shows 2× 3090 TP2 at +16–35% decode, but with speculative decoding on (MTP/DFlash2) and on a model not in the catalog. It's noted, not used.
