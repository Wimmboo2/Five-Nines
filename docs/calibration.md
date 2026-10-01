# Calibration: sim vs published benchmarks

Generated from `npm run calibrate` on 2026-09-30. Engine constants were fitted with `npm run calibrate -- --fit` (writes `data-dev/fitted-perf.js`).

- **fit** cases set the engine constants. Their error is in-sample, so it flatters the model.
- **check** cases are held out. Their error is the honest one.
- **Tolerance** (agreed 2026-09-30): held-out median |error| <= 25% and worst <= 60%. **Current verdict: PASS** (held-out median 11.4%, worst 50.7%), after rows from older engine builds and one data outlier were made reference-only (role `ref`, not counted) and two constants were added. See "Update: tolerance pass" at the end. The sections in between are history.

## Summary by source

| Set | Role | Cases | Median abs error | Max abs error |
| --- | --- | --- | --- | --- |
| A llama.cpp CUDA scoreboard (2025 builds) | fit | 16 | 7.0% | 36.4% (A100 prefill) |
| B multi-GPU / bigger models (llama.cpp May 2024) | fit (F16 prefill) | 4 | 4.3% | 11.4% |
| B multi-GPU / bigger models (llama.cpp May 2024) | check | 40 | 26.0% | 295.8% (L40S F16 prefill, internally inconsistent row) |
| C gpt-oss-20b MoE | fit | 2 | 0.4% | 0.5% |
| C gpt-oss-20b MoE | check | 2 | 3.0% | 4.4% |
| D Qwen2.5-7B vLLM vs llama.cpp, 1 and 64 concurrent | fit | 9 | 4.8% | 18.7% |
| D Qwen2.5-7B vLLM vs llama.cpp, 1 and 64 concurrent | check | 3 | 2.2% | 13.3% |
| E vLLM tensor/pipeline parallel (A100 SXM, arXiv) | check | 4 | 83.1% | 256.9% |
| F gpt-oss-120b long context (8K-131K) | check | 5 | 10.7% | 18.5% |

## What the errors say

1. **Single-GPU decode (A) and MoE decode/prefill (C) are close.** Long-context decode (F) is 8-18% slow in the sim. The error grows with depth, so the sim reads the KV cache a bit more expensively than measured. The article did not state its KV cache type, and the sim assumes f16.
2. **Bandwidth efficiency hit the 100% bound in the fit (flagged).** Every dense decode fit case uses the same 7B model, so bandwidth efficiency and fixed per-layer overhead can't be separated. The fitted pair reproduces 7B decode. On bigger models it probably runs fast: held-out 70B cases (B) are 13-26% fast. Those came from a May-2024 llama.cpp build, so some of the gap may be version drift. That isn't verified.
3. **A100 runs fast in the sim across B** (+30-120%). The scoreboard A100 row (2025 build, variant unstated) fits within 3%, but the 2024 A100 PCIe/SXM rows do not.
4. **Quantized prefill uses CUDA-core throughput as its reference** (see `formatComputePath` reasoning). A100 prefill is still 36% slow. Older-build K-quant prefill (B, Q4_K_M) is 24-140% fast.
5. **Tensor parallel does not match the only published measurement (E).**
   - The arXiv paper measured TP2 *slower* than 1 GPU (20.5 vs 22.2 tok/s) and TP4 slower still, on A100 SXM with vLLM 0.9.2.
   - The sim's physics (half the weight bytes per GPU, plus a latency-bound all-reduce) predicts TP2 ~1.7x faster.
   - **Deliberately not tuned to match.** One outlier setup shouldn't drive the model, and the user's rule for this pass was "faster than 1 GPU but not a perfect 2x". Flagged for the checkpoint.
6. **llama.cpp's 64-concurrent throughput is host-bound.** In the data the 5090 is slower than the 4090 (1,875 vs 2,391 tok/s). The per-sequence cost is therefore modeled in microseconds, not GPU cycles.

## Update after the checkpoint answers (2026-09-30)

- **New per-layer TP sync term:** 10 us per layer, a tagged estimate, **not** fitted to the arXiv paper (user decision). It barely moves case E: TP2 goes from 47.7 to 46.3 tok/s against the measured 20.5.
- **New held-out TP data G** (4x RTX A5000, vLLM 0.7.3, Llama-3.1-8B INT4):
  - The sim's TP4/TP1 ratio is 1.56x at 8 concurrent (measured 1.50x) and 1.58x at 64 (measured 1.56x). The TP scaling matches.
  - Absolute throughput is 29-88% high.
- **New held-out TP data H** (2x RTX 4090 over PCIe without P2P, 300 concurrent, BF16 7B/8B):
  - The measured TP2 gain is 1.38x (7B) and 1.47x (8B).
  - The sim's absolute numbers are 21-97% high.
  - The sim's 8B TP1 number is limited by how many requests the KV pool admits. That makes its TP2 jump too large.
- **What's still wrong:** batched throughput outside the fit set (D: AWQ, 64 concurrent, 4090/L40S/5090) runs well above measured.
## Full table

Latest run (after the reference-only rows and the two new fitted constants, see the last section).

```
case                       role   metric     measured   sim        error
A-3060-tg                  fit    decode     76.9       76.3       -0.8% 
A-3060-pp                  fit    prefill    2407.7     2586.7     7.4% 
A-3090-tg                  fit    decode     161.9      163.8      1.2% 
A-3090-pp                  fit    prefill    5560.1     6542.9     17.7% 
A-4090-tg                  fit    decode     189.0      190.9      1.0% 
A-4090-pp                  fit    prefill    14770.6    12888.2    -12.7% 
A-5090-tg                  fit    decode     300.4      286.2      -4.7% 
A-5090-pp                  fit    prefill    14970.1    15199.3    1.5% 
A-a6000-tg                 fit    decode     144.9      143.4      -1.0% 
A-a6000-pp                 fit    prefill    5662.4     7032.1     24.2% 
A-pro6000-tg               fit    decode     281.1      294.2      4.7% 
A-pro6000-pp               fit    prefill    16619.0    17195.0    3.5% 
A-a100-tg                  fit    decode     200.9      177.1      -11.9% 
A-a100-pp                  fit    prefill    5286.0     3829.5     -27.6% 
A-h100sxm-tg               fit    decode     280.7      283.0      0.8% 
A-h100sxm-pp               fit    prefill    11263.3    10956.1    -2.7% 
B-3090-8b                  check  decode     111.7      140.2      25.4% 
B-3090x2-8b                fit    decode     108.1      135.3      25.2% 
B-3090x4-8b                check  decode     104.9      126.6      20.6% 
B-4090-8b                  check  decode     127.7      161.4      26.4% 
B-4090x2-8b                fit    decode     122.6      155.0      26.5% 
B-4090x4-8b                check  decode     117.6      143.7      22.2% 
B-a6000-8b                 check  decode     102.2      121.5      18.9% 
B-a6000x4-8b               check  decode     93.7       111.2      18.6% 
B-l40s-8b                  check  decode     113.6      141.8      24.8% 
B-l40sx4-8b                check  decode     105.7      127.9      21.0% 
B-a100-8b                  check  decode     138.3      154.0      11.4% 
B-a100x4-8b                check  decode     117.3      137.8      17.5% 
B-a100sxm-8b               check  decode     133.4      159.7      19.7% 
B-3090-8bf16               check  decode     46.5       51.8       11.4% 
B-4090-8bf16               check  decode     54.3       57.2       5.2% 
B-a6000-8bf16              check  decode     40.3       43.4       7.7% 
B-l40s-8bf16               check  decode     43.4       49.4       13.8% 
B-a100-8bf16               check  decode     54.6       60.7       11.3% 
B-3090x2-70b               check  decode     16.3       18.7       14.5% 
B-3090x4-70b               check  decode     16.9       18.5       9.4% 
B-4090x2-70b               check  decode     19.1       20.5       7.7% 
B-4090x4-70b               check  decode     18.8       20.3       7.9% 
B-a6000-70b                check  decode     14.6       15.7       7.4% 
B-a6000x4-70b              check  decode     14.3       15.5       8.0% 
B-l40s-70b                 check  decode     15.3       17.8       16.4% 
B-l40sx4-70b               check  decode     15.0       17.6       17.3% 
B-a100-70b                 check  decode     22.1       22.0       -0.3% 
B-a100x4-70b               check  decode     22.7       21.7       -4.4% 
B-a100sxm-70b              check  decode     24.3       23.1       -5.1% 
B-3090x6-70bf16            check  decode     5.8        5.9        2.2% 
B-4090x8-70bf16            check  decode     6.5        6.4        -0.4% 
B-a6000x4-70bf16           check  decode     4.7        4.9        3.9% 
B-l40sx4-70bf16            check  decode     5.0        5.6        10.5% 
B-a100x4-70bf16            check  decode     7.4        7.2        -2.7% 
I-h100p-8b                 fit    decode     144.5      170.5      18.0% 
I-h100p-8bf16              fit    decode     67.8       65.2       -3.8% 
I-h100p-70b                check  decode     25.0       23.6       -5.5% 
I-h100px4-8b               check  decode     118.1      150.8      27.6% 
I-h100px4-70b              check  decode     26.2       23.2       -11.4% 
I-h100px4-70bf16           check  decode     9.6        7.6        -21.0% 
I-a100sxm-8bf16            check  decode     53.2       63.6       19.5% 
I-a100sxmx4-8b             check  decode     97.7       142.3      45.6% 
I-a100sxmx4-70b            check  decode     19.6       22.7       15.8% 
I-a100sxmx4-70bf16         check  decode     6.9        7.6        9.1% 
I-h100p-8b-tg8192          check  decode     126.8      158.9      25.3% 
I-a100sxm-8b-tg8192        check  decode     115.9      149.5      28.9% 
I-h100p-8bf16-pp           check  prefill    10342.6    15583.9    50.7% 
I-h100p-8b-pp              ref    prefill    7760.2     8270.6     6.6% 
B-3090-8bf16-pp            fit    prefill    4239.6     4079.4     -3.8% 
B-3090-8b-pp               ref    prefill    3865.4     6090.0     57.6% 
B-4090-8bf16-pp            fit    prefill    9056.3     8537.6     -5.7% 
B-4090-8b-pp               ref    prefill    6898.7     12123.0    75.7% 
B-a6000-8bf16-pp           fit    prefill    4315.2     4414.4     2.3% 
B-a6000-8b-pp              ref    prefill    3621.8     6550.6     80.9% 
B-l40s-8bf16-pp            ref    prefill    2491.7     9194.4     269.0% 
B-l40s-8b-pp               ref    prefill    5908.5     13069.7    121.2% 
B-a100-8bf16-pp            fit    prefill    7504.2     8033.3     7.1% 
B-a100-8b-pp               ref    prefill    5800.5     3547.7     -38.8% 
C-4090-oss20-tg            fit    decode     221.9      221.6      -0.2% 
C-5090-oss20-tg            check  decode     282.5      276.0      -2.3% 
C-4090-oss20-pp            fit    prefill    8022.3     8014.3     -0.1% 
C-5090-oss20-pp            check  prefill    9848.4     9753.6     -1.0% 
D-4090-vllm-1              fit    decode     174.0      162.7      -6.5% 
D-4090-lcpp-1              check  decode     174.0      174.0      -0.0% 
D-4090-vllm-64             fit    aggregate  6623.0     6810.3     2.8% 
D-4090-lcpp-64             fit    aggregate  2391.0     1936.9     -19.0% 
D-l40s-vllm-1              fit    decode     136.0      142.5      4.8% 
D-l40s-lcpp-1              check  decode     136.0      152.6      12.2% 
D-l40s-vllm-64             fit    aggregate  6249.0     6051.2     -3.2% 
D-l40s-lcpp-64             fit    aggregate  1748.0     1867.8     6.9% 
D-5090-vllm-1              fit    decode     250.0      254.4      1.8% 
D-5090-lcpp-1              check  decode     250.0      269.4      7.7% 
D-5090-vllm-64             fit    aggregate  8310.0     8153.3     -1.9% 
D-5090-lcpp-64             fit    aggregate  1875.0     2139.9     14.1% 
E-tp1                      ref    decode     22.2       28.3       27.5% 
E-tp2                      ref    decode     20.5       46.3       125.4% 
E-pp2                      ref    decode     21.1       28.1       33.1% 
E-tp4                      ref    decode     18.6       63.5       242.4% 
G-a5000-tp1-c8             ref    aggregate  704.4      905.9      28.6% 
G-a5000-tp4-c8             ref    aggregate  1056.2     1414.8     33.9% 
G-a5000-tp1-c64            ref    aggregate  2391.4     4442.6     85.8%   MEM: GPU 0 (calibration-only A5000) needs 41.6 GB: weights 5.7 GB + KV cache 34.4 GB for 4,096 tokens x 64 sequence(s) + runtime 1.5 GB. It has 23.7 GB usable (92% of 25.8 GB).
G-a5000-tp4-c64            ref    aggregate  3735.4     7035.7     88.4% 
H-4090-q7-tp1              ref    aggregate  3965.4     7322.7     84.7% 
H-4090-q7-tp2              ref    aggregate  5479.3     8855.1     61.6% 
H-4090-l8-tp1              ref    aggregate  2699.7     3260.5     20.8% 
H-4090-l8-tp2              ref    aggregate  3959.1     7778.8     96.5% 
F-oss120-d8192             check  decode     207.7      194.8      -6.2% 
F-oss120-d16384            check  decode     203.5      188.1      -7.6% 
F-oss120-d32768            check  decode     195.2      175.9      -9.9% 
F-oss120-d65536            check  decode     179.9      155.7      -13.5% 
F-oss120-d131072           check  decode     158.2      126.6      -20.0% 
fit: 35 cases, median |error| 4.7%, max |error| 27.6%
check: 53 cases, median |error| 11.4%, max |error| 50.7%
ref (reference only, not counted): 19 cases, median |error| 75.7%, max |error| 269.0%
TOLERANCE (held-out median <= 25%, worst <= 60%): PASS
```

## Update 2026-09-30 (Part 0a): datacenter benchmarks and HBM factor

- New set I (XD llama.cpp tables): H100 PCIe (calibration-only hardware) and A100 SXM, 1x and 4x, 8B and 70B, Q4_K_M and F16,
  tg8192 and prompt-processing rows. The two H100 PCIe single-GPU 8B decode rows are fit cases; the other 14 are held out.
- With the old constants the new held-out rows ran 30-80% too fast: one bandwidth efficiency could not fit GDDR and HBM cards.
  Added `hbmBwFactor` (llama.cpp only, fitted on the HBM single-stream decode fit rows; vLLM keeps 1 for lack of data).
- Result: fit 33 cases, median 4.7%, max 35.8%. Held-out 74 cases, median 19.2% (passes the 25% line), max 299% (fails the 60% line).
- Still over 60%: I-a100sxmx4-8b (4x layer split, small model), I-h100p-8bf16-pp (F16 prefill 93% high), B-*-pp Q4 prefill rows,
  E-tp2/E-tp4 (vLLM TP on A100 SXM "NVLink pairs, PCIe across pairs": measured TP is slower than TP1, the sim is 2-3x faster),
  G-a5000 c64 rows, H-4090 TP rows. Tolerance verdict: FAIL.
- The 19 models added in Part 0b have no benchmarks yet; their speeds are model-geometry predictions only.

## Update: tolerance pass (2026-09-30, after stage 5)

User decisions this round (logged in `docs/decisions.md`): exclude set E; mark rows from older engine builds reference-only; mark the XD L40S F16 prefill row as a data outlier; fix the rest with research-backed model changes.

**Reference-only rows (role `ref`, 19 rows, each carries a `refReason`):**
- XD Q4_K_M prefill (`B-*-8b-pp`, `I-h100p-8b-pp`): run in May 2024, before llama.cpp commit a818f3028 (2024-06-24, PR #8075) made MMQ the default. The May 2024 code (`ggml-cuda.cu` at 8f7080bf4) sent quantized matmuls with batch > `MMQ_MAX_BATCH_SIZE` to dequantize + cuBLAS on GPUs with good fp16. Verified in the llama.cpp git history. XD F16 prefill (cuBLAS in both eras) and XD decode rows stay counted.
- `B-l40s-8bf16-pp`: outlier inside its own source (F16 below its own Q4_K_M and below RTX 4000 Ada F16).
- Set E (vLLM 0.9.2, TP slower than TP1), set G (vLLM 0.7.3, 2025-02-20 per PyPI), set H (page dated 2025-03-28, no version given, so vLLM <= 0.8.2).

**Model changes:**
- `prefillTokenLayerOverheadUs` (llama.cpp 0.6 us per prompt token per layer): non-matmul prefill work. Fitted jointly with the two prefill efficiencies on the fit rows only. In-sample worst fell from 35.8% to 27.6%; held-out `I-h100p-8bf16-pp` fell from 92.6% to 50.7%. vLLM/SGLang: 0 (no prefill fit data; their matmul efficiency is fitted on aggregate throughput).
- `stageHandoffUs` moved from an assumed 30 us constant to a fitted engine constant: 255 us per layer-split handoff. Fitted on `B-3090x2-8b` and `B-4090x2-8b` (promoted from check to fit) as the slowdown relative to the same source's single-GPU rows, so the source's overall speed offset doesn't leak in. A plain absolute fit gave 2,035 us and was rejected for that reason. All 4-GPU rows stay held out; `I-a100sxmx4-8b` fell from 61.1% to 45.6%.

**Still weak:** held-out XD Q4_K_M decode runs about 25-35% fast (May 2024 build, not investigated further), and `I-h100p-8bf16-pp` is at 50.7%.
