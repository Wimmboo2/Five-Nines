# Calibration: sim vs published benchmarks

Generated from `npm run calibrate` on 2026-09-30. Engine constants were fitted with `npm run calibrate -- --fit` (writes `data-dev/fitted-perf.js`).

- **fit** cases set the engine constants. Their error is in-sample, so it flatters the model.
- **check** cases are held out. Their error is the honest one.
- **Tolerance** (agreed 2026-09-30): held-out median |error| <= 25% and worst <= 60%. **Current verdict: FAIL.** The held-out median is 26.0% and 13 cases are over 60%.

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

```
case                       role   metric     measured   sim        error
A-3060-tg                  fit    decode     76.9       78.2       1.7% 
A-3060-pp                  fit    prefill    2407.7     2217.1     -7.9% 
A-3090-tg                  fit    decode     161.9      155.7      -3.8% 
A-3090-pp                  fit    prefill    5560.1     6080.0     9.4% 
A-4090-tg                  fit    decode     189.0      186.7      -1.2% 
A-4090-pp                  fit    prefill    14770.6    13887.0    -6.0% 
A-5090-tg                  fit    decode     300.4      264.0      -12.1% 
A-5090-pp                  fit    prefill    14970.1    17371.8    16.0% 
A-a6000-tg                 fit    decode     144.9      139.5      -3.7% 
A-a6000-pp                 fit    prefill    5662.4     6605.0     16.6% 
A-pro6000-tg               fit    decode     281.1      273.8      -2.6% 
A-pro6000-pp               fit    prefill    16619.0    20761.1    24.9% 
A-a100-tg                  fit    decode     200.9      207.7      3.4% 
A-a100-pp                  fit    prefill    5286.0     3362.8     -36.4% 
A-h100sxm-tg               fit    decode     280.7      315.8      12.5% 
A-h100sxm-pp               fit    prefill    11263.3    11248.5    -0.1% 
B-3090-8b                  check  decode     111.7      135.8      21.5% 
B-3090x2-8b                check  decode     108.1      135.2      25.1% 
B-3090x4-8b                check  decode     104.9      134.1      27.8% 
B-4090-8b                  check  decode     127.7      160.5      25.7% 
B-4090x2-8b                check  decode     122.6      159.8      30.4% 
B-4090x4-8b                check  decode     117.6      158.2      34.5% 
B-a6000-8b                 check  decode     102.2      120.3      17.6% 
B-a6000x4-8b               check  decode     93.7       119.0      26.9% 
B-l40s-8b                  check  decode     113.6      142.5      25.4% 
B-l40sx4-8b                check  decode     105.7      140.6      33.0% 
B-a100-8b                  check  decode     138.3      189.7      37.2% 
B-a100x4-8b                check  decode     117.3      186.5      59.0% 
B-a100sxm-8b               check  decode     133.4      194.3      45.6% 
B-3090-8bf16               check  decode     46.5       54.1       16.3% 
B-4090-8bf16               check  decode     54.3       60.4       11.1% 
B-a6000-8bf16              check  decode     40.3       45.7       13.6% 
B-l40s-8bf16               check  decode     43.4       52.4       20.8% 
B-a100-8bf16               check  decode     54.6       93.9       72.1% 
B-3090x2-70b               check  decode     16.3       19.6       20.6% 
B-3090x4-70b               check  decode     16.9       19.6       16.2% 
B-4090x2-70b               check  decode     19.1       21.9       14.7% 
B-4090x4-70b               check  decode     18.8       21.8       15.9% 
B-a6000-70b                check  decode     14.6       16.6       13.6% 
B-a6000x4-70b              check  decode     14.3       16.5       15.5% 
B-l40s-70b                 check  decode     15.3       19.0       23.9% 
B-l40sx4-70b               check  decode     15.0       18.9       26.3% 
B-a100-70b                 check  decode     22.1       34.6       56.6% 
B-a100x4-70b               check  decode     22.7       34.5       52.2% 
B-a100sxm-70b              check  decode     24.3       36.0       48.0% 
B-3090x6-70bf16            check  decode     5.8        6.5        11.0% 
B-4090x8-70bf16            check  decode     6.5        7.0        9.0% 
B-a6000x4-70bf16           check  decode     4.7        5.3        12.9% 
B-l40sx4-70bf16            check  decode     5.0        6.1        20.3% 
B-a100x4-70bf16            check  decode     7.4        12.6       71.2% 
B-3090-8bf16-pp            fit    prefill    4239.6     3919.5     -7.6% 
B-3090-8b-pp               check  prefill    3865.4     5605.1     45.0% 
B-4090-8bf16-pp            fit    prefill    9056.3     9024.3     -0.4% 
B-4090-8b-pp               check  prefill    6898.7     12818.0    85.8% 
B-a6000-8bf16-pp           fit    prefill    4315.2     4270.8     -1.0% 
B-a6000-8b-pp              check  prefill    3621.8     6089.5     68.1% 
B-l40s-8bf16-pp            check  prefill    2491.7     9861.3     295.8% 
B-l40s-8b-pp               check  prefill    5908.5     14145.4    139.4% 
B-a100-8bf16-pp            fit    prefill    7504.2     8362.0     11.4% 
B-a100-8b-pp               check  prefill    5800.5     3097.8     -46.6% 
C-4090-oss20-tg            fit    decode     221.9      222.3      0.2% 
C-5090-oss20-tg            check  decode     282.5      270.1      -4.4% 
C-4090-oss20-pp            fit    prefill    8022.3     7984.4     -0.5% 
C-5090-oss20-pp            check  prefill    9848.4     10006.4    1.6% 
D-4090-vllm-1              fit    decode     174.0      162.7      -6.5% 
D-4090-lcpp-1              check  decode     174.0      173.9      -0.0% 
D-4090-vllm-64             fit    aggregate  6623.0     6810.3     2.8% 
D-4090-lcpp-64             fit    aggregate  2391.0     1944.3     -18.7% 
D-l40s-vllm-1              fit    decode     136.0      142.5      4.8% 
D-l40s-lcpp-1              check  decode     136.0      154.0      13.3% 
D-l40s-vllm-64             fit    aggregate  6249.0     6051.2     -3.2% 
D-l40s-lcpp-64             fit    aggregate  1748.0     1880.1     7.6% 
D-5090-vllm-1              fit    decode     250.0      254.4      1.8% 
D-5090-lcpp-1              check  decode     250.0      255.6      2.2% 
D-5090-vllm-64             fit    aggregate  8310.0     8153.3     -1.9% 
D-5090-lcpp-64             fit    aggregate  1875.0     2121.9     13.2% 
E-tp1                      check  decode     22.2       28.3       27.5% 
E-tp2                      check  decode     20.5       46.3       125.4% 
E-pp2                      check  decode     21.1       28.2       34.0% 
E-tp4                      check  decode     18.6       63.5       242.4% 
G-a5000-tp1-c8             check  aggregate  704.4      905.9      28.6% 
G-a5000-tp4-c8             check  aggregate  1056.2     1414.8     33.9% 
G-a5000-tp1-c64            check  aggregate  2391.4     4442.6     85.8%   MEM: GPU 0 (calibration-only A5000) needs 41.6 GB: weights 5.7 GB + KV cache 34.4 GB for 4,096 tokens x 64 sequence(s) + runtime 1.5 GB. It has 23.7 GB usable (92% of 25.8 GB).
G-a5000-tp4-c64            check  aggregate  3735.4     7035.7     88.4% 
H-4090-q7-tp1              check  aggregate  3965.4     7322.7     84.7% 
H-4090-q7-tp2              check  aggregate  5479.3     8855.1     61.6% 
H-4090-l8-tp1              check  aggregate  2699.7     3260.5     20.8% 
H-4090-l8-tp2              check  aggregate  3959.1     7778.8     96.5% 
F-oss120-d8192             check  decode     207.7      191.2      -8.0% 
F-oss120-d16384            check  decode     203.5      185.2      -9.0% 
F-oss120-d32768            check  decode     195.2      174.3      -10.7% 
F-oss120-d65536            check  decode     179.9      156.0      -13.3% 
F-oss120-d131072           check  decode     158.2      128.9      -18.5% 
fit: 31 cases, median |error| 4.8%, max |error| 36.4%
check: 62 cases, median |error| 26.0%, max |error| 295.8%
TOLERANCE (held-out median <= 25%, worst <= 60%): FAIL | cases over 60%: B-a100-8bf16, B-a100x4-70bf16, B-4090-8b-pp, B-a6000-8b-pp, B-l40s-8bf16-pp, B-l40s-8b-pp, E-tp2, E-tp4, G-a5000-tp1-c64, G-a5000-tp4-c64, H-4090-q7-tp1, H-4090-q7-tp2, H-4090-l8-tp2
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
