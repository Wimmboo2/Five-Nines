# Checkpoint after stage 3

Dated 2026-09-30. This file is dev-only: it contains real product names and never ships.

## Acceptance checks: status

| Check | Status |
| --- | --- |
| Example job generated and evaluated end to end | **Not started.** The job generator is stage 4. Only a hand-written copy of the example job is evaluated, in `dev/sim-harness.html` and the tests. |
| Build too small for weights + KV fails, and says why | **Passing** (tested). |
| Every software setting changes at least one result | **Passing for inference settings** (19 tested variants). Cloud/VM and game-server settings don't exist yet. |
| Over the power limit / too loud / too hot gets penalized | **Partly.** The sim computes wall power, dBA at the listener and temperatures, and fails PSU overload and thermal shutdown. Penalties against job targets are scoring, which is stage 4. |
| Temperature in a small closed room depends on wall power and airflow over the stress test | **Passing** (tested: rises with wall power, falls with more air changes). |
| A part failure during the stress test stops it, and the test restarts | **Partly.** It stops, and reports the part and the time (tested). The fix-and-redo loop is UI, stage 7. |
| Simulated inference close to published benchmarks | **Measured, not judged.** The tolerance hasn't been agreed. See `docs/calibration.md`. |
| Every catalog value and sim constant tagged | **Passing** for data (the validator enforces it). Code keeps only unit conversions and solver step sizes. |
| Easy/hard difficulty | **Not started** (stage 10). |
| Parts buyable at level 1 / features gated | **Not started** (stages 5/7). No gating exists. |
| Personal datacenter | **Not started** (stage 9). |
| Tab close pauses; reload restores | **Not started** (stage 8). |
| Nothing contradicts the locked decisions | **No known conflicts.** |

## Proposed fake names (for approval)

### GPUs

| Proposed fake name | Real part (dev-only) |
| --- | --- |
| Halcyon Ember G3-12 | NVIDIA GeForce RTX 3060 12GB |
| Halcyon Ember G3-24 Link | NVIDIA GeForce RTX 3090 |
| Halcyon Ember G4-24 | NVIDIA GeForce RTX 4090 |
| Halcyon Ember G5-32 | NVIDIA GeForce RTX 5090 |
| Halcyon Atelier A48 | NVIDIA RTX A6000 |
| Halcyon Atelier B96 | NVIDIA RTX PRO 6000 Blackwell Workstation Edition |
| Halcyon Bastion P48 | NVIDIA L40S |
| Halcyon Bastion H80 | NVIDIA A100 80GB PCIe |
| Halcyon Bastion X94 | NVIDIA H100 NVL |

### CPUs

| Proposed fake name | Real part (dev-only) |
| --- | --- |
| Orrin Vela 8 | AMD Ryzen 7 9700X |
| Orrin Vela 16 | AMD Ryzen 9 9950X |
| Orrin Summit 32 | AMD Ryzen Threadripper PRO 9975WX |
| Orrin Keystone 32 G2 | AMD EPYC 7532 |
| Orrin Keystone 32 G5 | AMD EPYC 9355P |
| Orrin Keystone 64 G5 | AMD EPYC 9555 |

### RAM

| Proposed fake name | Real part (dev-only) |
| --- | --- |
| Mnemo Sprint 32 (2x16) D5-6000 | Generic: DDR5-6000 CL30 2x16GB kit (price tracker basket, no single brand) |
| Mnemo Sprint 64 (2x32) D5-6000 | Generic: DDR5-6000 2x32GB kit (price tracker median, no single brand) |
| Mnemo Rack 32 D5-5600 ECC-R | Kingston KSM56R46BD8PMI 32GB DDR5-5600 ECC RDIMM |
| Mnemo Rack 64 D5-5600 ECC-R | Micron MTC40F2046S1RC56BD2 64GB DDR5-5600 ECC RDIMM |
| Mnemo Rack 64 D5-6400 ECC-R | A-Tech 64GB DDR5-6400 ECC RDIMM |
| Mnemo Rack 32 D4-2933 ECC-R | Generic: DDR4-2933 32GB ECC RDIMM (price tracker, cheapest listing) |

### Storage

| Proposed fake name | Real part (dev-only) |
| --- | --- |
| Strata Nova 2TB | Samsung 990 PRO 2TB |
| Strata Vault 3.84TB U.3 | Micron 7450 PRO 3.84TB U.3 |
| Lodestone X 24TB | Seagate Exos X24 24TB SATA (ST24000NM002H) |
| Lodestone NAS 8TB | WD Red Plus 8TB (WD80EFPX) |

### PSUs

| Proposed fake name | Real part (dev-only) |
| --- | --- |
| Voltaic G650 | Corsair RM650e (2025) |
| Voltaic G850 | Corsair RM850e (2025) |
| Voltaic P1000 | Corsair HX1000i |
| Voltaic T1600 | Corsair AX1600i |

### Fans and coolers

| Proposed fake name | Real part (dev-only) |
| --- | --- |
| Sirocco S12 Quiet | ARCTIC P12 PWM PST |
| Sirocco S12 Max | ARCTIC P12 Max |
| Frostline Tower D2 | Noctua NH-D15 G2 (LBC) |
| Frostline Loop 360 | ARCTIC Liquid Freezer III 360 |

### Network

| Proposed fake name | Real part (dev-only) |
| --- | --- |
| Latticenet LN-8E2S | MikroTik CRS310-8G+2S+IN |
| Latticenet LN-8S10 | MikroTik CRS309-1G-8S+IN |
| Latticenet LN-24S2Q | MikroTik CRS326-24S+2Q+RM |
| Latticenet LN-4Q100 | MikroTik CRS504-4XQ-IN |

### Chassis and rack

| Proposed fake name | Real part (dev-only) |
| --- | --- |
| Hollowform Quiet XL | Fractal Design Define 7 XL |
| Hollowform Gale | Fractal Design Torrent |
| Hollowform R4-12 | Sliger CX4712 |
| Hollowform Rack 42 | APC NetShelter SX AR3100 |

### Models (placeholder names)

| Proposed fake name | Real part (dev-only) |
| --- | --- |
| Tamarin 2 7B | Llama-2-7B |
| Tamarin 3.1 8B | Llama-3.1-8B-Instruct |
| Quill 2.5 7B | Qwen2.5-7B-Instruct |
| Quill 3 8B | Qwen3-8B |
| Mistle 3.2 24B | Mistral-Small-3.2-24B-Instruct-2506 |
| Quill 2.5 32B | Qwen2.5-32B-Instruct |
| Quill 3 32B | Qwen3-32B |
| Quill 3 30B-A3B (2507) | Qwen3-30B-A3B-Instruct-2507 |
| Tamarin 3.3 70B | Llama-3.3-70B-Instruct |
| Ossia 20B | gpt-oss-20b |
| Ossia 120B | gpt-oss-120b |

### Engines (placeholder names)

| Proposed fake name | Real part (dev-only) |
| --- | --- |
| Kettle | llama.cpp |
| Sluice | vLLM |
| Loom | SGLang |
## Estimates

The full list is `docs/estimates-for-signoff.md` (generated by `node scripts/list-estimates.js`): 220 hand estimates plus 21 fitted engine constants. Many entries repeat one assumption across parts, such as the CPU Tjmax and the PSU MTBF.

The ones that move results most:
- **GPU power during decode/prefill.** Taken from a search snippet; the page returned 403.
- **All-reduce latencies** for NVLink, PCIe P2P and PCIe-through-host.
- **GPU cooler thermal resistances** by cooling type, and GPU fan noise.
- **Minecraft tick cost** per player and at idle. This is the weakest part of the sim.
- **Case airflow restriction factors,** and the stock case fans modeled as a catalog fan.
- **Room wall U-value and air changes.** These only exist in the test fixture; the real values come from the job generator.

## Gaps found
- **No AMD GPU.**
- **No server PSU.**
- **No Noctua fans** (their site blocked the fetch).
- **No SGLang benchmark on catalog hardware**, so its constants copy vLLM's.
- **Price problems:**
  - GPU prices come from different trackers and disagree. For example, a used 3090 is $1,355 at gpupoet vs $500–650 at PCSP.
  - Several chassis and PSU prices are estimates.
- **Tensor parallel doesn't match the one published measurement.**
- **Models are a benchmark-backed 2024–2025 set.** The "all latest models" request is parked; see `docs/research/models-hf-snapshot-2026-09-30.md`.
- **"SeStudio Publishing" wasn't found** linked to PC Creator. The PC Creator 2 seller is Creaty Global.
