# GPUs

Accessed 2026-09-30. Lean catalog: 9 GPUs covering consumer, workstation and datacenter. Every value below goes into `data-dev/parts/gpu.json` with its source id.

## Chosen parts and why

| realRef | Tier | Why it's in |
| --- | --- | --- |
| GeForce RTX 3060 12GB | consumer entry | Cheapest 12 GB card, very common in homelabs. Has a scoreboard benchmark. |
| GeForce RTX 3090 | consumer (used) | 24 GB, NVLink bridge capable, a homelab staple. Scoreboard + multi-GPU layer-split benchmarks. |
| GeForce RTX 4090 | consumer | 24 GB. Scoreboard, multi-GPU, gpt-oss and vLLM single-stream benchmarks. |
| GeForce RTX 5090 | consumer | 32 GB, highest consumer bandwidth. Scoreboard, gpt-oss and vLLM single-stream benchmarks. |
| RTX A6000 | workstation | 48 GB, blower cooler, NVLink. Scoreboard + multi-GPU benchmarks. |
| RTX PRO 6000 Blackwell (Workstation, 600 W) | workstation | 96 GB. Scoreboard benchmark. |
| L40S | datacenter (passive) | 48 GB, passive cooling for rack airflow. Multi-GPU benchmark. |
| A100 80GB PCIe | datacenter (passive) | 80 GB HBM2e, NVLink bridge. Multi-GPU benchmark. The scoreboard row exists, but its A100 variant isn't stated. |
| H100 NVL 94GB | datacenter (passive) | 94 GB HBM3, NVLink bridge. **No benchmark found for this exact SKU.** |

**Not included, flagged for the checkpoint:**
- **No AMD GPU.** Engine support differs (ROCm/Vulkan), which needs separate research.
- **H100 SXM.** It's sold as 8-GPU HGX systems, not single cards.

## Specs (published)

### Memory, power, interconnect

| realRef | VRAM | Bandwidth GB/s | Bus | Board power W | Host bus | GPU-GPU link |
| --- | --- | --- | --- | --- | --- | --- |
| RTX 3060 12GB | 12 GB GDDR6 | 360 | 192-bit | 170 | PCIe 4.0 x16 (wiki: GA106) | none |
| RTX 3090 | 24 GB GDDR6X | 936 | 384-bit | 350 | PCIe 4.0 | NVLink 3rd gen, 112.5 GB/s total (56.25 each direction) |
| RTX 4090 | 24 GB GDDR6X | 1008 | 384-bit | 450 | PCIe 4.0 | none |
| RTX 5090 | 32 GB GDDR7 | 1792 | 512-bit | 575 | PCIe 5.0 x16 | none |
| RTX A6000 | 48 GB GDDR6 ECC | 768 | 384-bit | 300 | PCIe 4.0 x16 | NVLink 2-way, 112 GB/s (A6000 page), 112.5 (GA102 WP) |
| RTX PRO 6000 Blackwell WS | 96 GB GDDR7 ECC | 1792 | 512-bit | 600 | PCIe 5.0 | none |
| L40S | 48 GB GDDR6 ECC | 864 | 384-bit | 350 | PCIe 4.0 x16 | no NVLink |
| A100 80GB PCIe | 80 GB HBM2e | 1935 | — | 300 | PCIe 4.0 (64 GB/s) | NVLink bridge, 600 GB/s for 2 GPUs |
| H100 NVL | 94 GB HBM3 | 3900 | — | 350–400 (configurable) | PCIe 5.0 (128 GB/s) | NVLink bridge 600 GB/s |

### Compute and cooling

Peak FP16 tensor TFLOPS are **dense** (no sparsity). "FP32 acc" means FP16 multiply with FP32 accumulate.

| realRef | FP16 tensor, FP32 acc | FP16 tensor, FP16 acc | Cooling |
| --- | --- | --- | --- |
| RTX 3060 12GB | not in the WP excerpt read | 51.2 (Wikipedia) | open-air (AIB) |
| RTX 3090 | 71 | 142 | open-air (FE) |
| RTX 4090 | 165.2 | 330.3 | open-air |
| RTX 5090 | 209.5 | 419 | FE flow-through |
| RTX A6000 | 154.8 | 154.8 | active blower, dual slot |
| RTX PRO 6000 Blackwell WS | 503.8 | 503.8 | double flow-through, dual slot |
| L40S | 362.05 (BF16/FP16 tensor; accumulate not stated) | — | passive, dual slot |
| A100 80GB PCIe | 312 | 312 | passive |
| H100 NVL | 835.5 (1,671 with sparsity ÷ 2) | — | passive, dual slot |

**H100 NVL is an estimate.** NVIDIA's page gives 1,671 TFLOPS *with sparsity*. The dense figure is taken as half, because NVIDIA's sparsity feature is 2x dense on every other SKU in these tables.

**Sources:**
- NVIDIA architecture whitepapers:
  - GA102 V1 (RTX 3090, RTX A6000)
  - Ada (RTX 4090)
  - RTX Blackwell (RTX 5090)
  - RTX Blackwell PRO v1.1 (RTX A6000, RTX PRO 6000; its 4th column is the 600 W card)
- NVIDIA product pages: A100, H100, L40S, RTX A6000, RTX PRO 6000
- Wikipedia GeForce 30/40/50 series tables (MSRP, bandwidth, TDP)

## Prices

Checked September 2026. **GPU prices rose sharply in 2026:** one source puts it down to a GDDR7 memory shortage, and the tracked prices went up a lot too.

| realRef | Price used | Tag | Source and notes |
| --- | --- | --- | --- |
| RTX 3060 12GB | $283 | published | gpupoet, Sept 2026 "lowest average price". |
| RTX 3090 | $1,355 | published | gpupoet, Sept 2026. PCSP's used guide says $500–650, a big disagreement that gets reported. |
| RTX 4090 | $2,977 | published | gpupoet, Sept 2026. PCSP used: $1,500–1,800. |
| RTX 5090 | $5,409 | published | gpupoet, Sept 2026. MSRP was $1,999. |
| RTX A6000 | $5,000 | **estimate** | A new PNY listing at $4,999 was only seen in a search snippet (page 403). Used snippets run $4,310–8,900. |
| RTX PRO 6000 Blackwell | $16,000 | published | thundercompute, reviewed 2026-09-25. MSRP was $8,565. |
| L40S | $8,000 | published | PCSP used range $7,000–9,000, midpoint used. |
| A100 80GB PCIe | $10,000 | published | jarvislabs new range $8,000–12,000 (Mar 2026), midpoint used. |
| H100 NVL | $30,000 | **estimate** | compute.exchange gives $25k–40k new for the 80GB class, PCIe at the low end. cloudzero gives $31k for a new 80GB card. No NVL-specific price was found. |

## Benchmarks gathered

See `benchmarks.md`.
