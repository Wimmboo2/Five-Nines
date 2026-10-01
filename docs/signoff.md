# Sign-off list (one pass)

Every value Claude picked or estimated that still needs your approval, consolidated from `docs/decisions.md` on 2026-10-01. Change a number here, tell Claude, and it gets updated in code and data. "Where" points at the code or data that holds it.

**Calibration (honest status):** 53 held-out benchmark cases, median error 11.4%, worst 50.7% (tolerance median <= 25%, worst <= 60%: PASS). 35 fit cases (median 4.7%). 19 more rows are reference-only (older engine builds and one data outlier, by your decision) and are not counted: their median error is 75.7%.

## Tuning pass 1 (2026-10-01): changed values, all pending

Measured headless before and after (same seeds). Every value below is a Claude proposal for you to approve or change.

| Value | Before | After | Why |
| --- | --- | --- | --- |
| Demand growth | 2%/sim day, compounding (x19.5 after 1 real hour) | 1% of base per sim day, linear, capped at 3x (`growthPerDay` 0.01, new `marketCeiling` 3) | compounding exploded the arrival rate |
| Arrival rate | 0.08/h per workload at rep 50 | 0.02/h per workload bucket (`arrivalsPerHourAt50Rep`) | one node filled in under a minute; now ~5-10 real minutes, first customer-losing overload at 106 sim h (1.8 real min) in the 3-node test, caused by a demand spike on the RAM-bound VM node |
| Arrival floor | none (rep 0 = no arrivals) | arrivals use max(rep, 10) (`reputationArrivalFloor` 10, a fifth of the base) | death spiral |
| Reputation recovery | +0.1/h only when no workload is overloaded | +0.1/h x share of workloads not overloaded (logic) | one overloaded workload blocked all recovery; after overload + adding capacity, rep went 11 -> 46 in 400 sim h (before: 2.5 -> 0) |
| Overload, churn | per workload | per bucket (each inference size class separately) | size classes |
| Token price | $0.20 per M tokens, same for every model | $0.80 per M for the small class, x (class reference size / 8B)^0.7: small $0.80, medium $2.11, large $3.65 (`priceUSDPerMTokens`, new `tokenPriceExponent` 0.7, `small/medium/largeRefActiveB` 8/32/70, `smallMaxActiveB` 12, `mediumMaxActiveB` 40) | smallest model always won; now per node at 90%: 8B $19/h, 32B $22/h, 70B $27/h |
| Size classes | none | inference customers ask for small (<= 12B active), medium (<= 40B) or large; MoE counts active parameters (30B-A3B = 2.7B = small) | customers ask for a size class |
| Game / VM price | $0.002 per player-hour, $0.02 per vCPU-hour | $0.008, $0.08 (x4) | 3-node DC netted $2.55/sim h (payback ~5.5 real h, far below one job fee); now $13.71/sim h (~$49k per real hour, payback ~1 real hour) |
| VM network per vCPU | 50 Mbit/s | 10 Mbit/s (`netMbpsPerVcpu`) | onboard 1 GbE capped a 128-vCPU host at 20 vCPUs |
| PSU modules | any PSU death took the node down | each hot-swap module fails on its own (group rate = per-module rate x modules); the node runs while modules alive >= modules needed for its full-load wall watts; alert shows N+k; replacing restores redundancy (logic) | redundant modules |
| Job fee | 12-20% of budget for every tier | homelab 12-20%, server 8-12%, datacenter 3-5% (`GEN.feeOfBudget[tier]`) | median fee homelab $530, server $4,380 -> $2,680, datacenter $52,270 -> $13,070 (max $128k -> $32k) |
| Datacenter job xp | 1000 | 500 (`GEN.baseXp.datacenter`) | level 5 came after 2 datacenter jobs; now ~4 |

Electricity: unchanged ($0.12/kWh). It is about 6% of income (3 nodes at ~90%: income $2.72/h, power $0.17/h before; $13.87 / $0.17 after). The "$1-2 per sim hour" in the stage 9 report was income before electricity.

Example job: raising the homelab 40 GB weight cap is not needed. Four ~30B models support 262k natively with 16.7-21.2 GB Q4 weights, and each has 16-28 passing homelab builds. The generator already rolls ~30B examples (seed 1034: Qwen3.8-27B, 28 tok/s target, 700 W; seed 1902: a 31B model at 262k, 600 W limit, closet, quiet). The earlier "all three were 8B" was a misread of truncated search output. Budgets are unchanged.

## 1. Economy

| Value | Now | Affects | Where |
| --- | --- | --- | --- |
| Who pays for parts | the client's budget; your money is never spent on job parts | job economy | your stage 8 answer (logged) |
| Starting money | $0 | early game | `newPlayer`, src/game/player.js |
| Client fee | homelab 12-20%, server 8-12%, datacenter 3-5% of the budget (x difficulty fee) | job income | `GEN.feeOfBudget` |
| Base xp per job | homelab 100, server 300, datacenter 500 | level pace | `GEN.baseXp` |
| Payout / xp scaling | money x score/100 x (1 + bonus); xp x score/100 | rewards | `SCORING`, `scoreDelivery` |
| Under-budget / under-power bonus | up to +6% / +4% (full at 30% under) | rewards | `SCORING.budgetBonusMax`, `powerBonusMax`, `bonusFullAt` |
| Replacing a part that died in the stress test | free | stress test | src/game/flow.js, App |
| Datacenter opening cost | rack + PDU at catalog price ($5,386) | L5 entry | `openCost` |
| Utility feed | starts 20 kW; +20 kW per $25,000 | DC growth | `constants.datacenter.startUtilityW/utilityStepW/utilityStepUSD` |
| Cooling unit | +20 air changes/h for $15,000 | DC growth | `coolingStepAch/coolingStepUSD` |
| Customer prices | see Tuning pass 1: $0.80 per million tokens (small class, x2.6 medium, x4.6 large), $0.008 per player-hour, $0.08 per vCPU-hour | DC income | `priceUSDPerMTokens`, `priceUSDPerPlayerHour`, `priceUSDPerVcpuHour` |
| Electricity | $0.12/kWh | DC costs | `electricityUSDPerKWh` |
| UPS unit price | $900 per 1 kW unit | DC costs | `upsUnitUSD` |
| Snapshot cost | $6.95/TB/month (priced like offsite) | DC costs | `snapshotUSDPerTBMonth` |

## 2. Demand (personal datacenter)

| Value | Now | Affects | Where |
| --- | --- | --- | --- |
| Time scale | 1 real second = 1 simulated hour (logged exception to the real-time rule) | everything in the DC | `simHoursPerRealSecond` |
| Arrivals | 0.02 per hour per served workload bucket at reputation 50, scaled by max(reputation, 10)/50 | customer flow | `arrivalsPerHourAt50Rep`, `reputationArrivalFloor` |
| Growth | +1% of base per simulated day, linear, max 3x (x difficulty) | long-run demand | `growthPerDay`, `marketCeiling` |
| Daily rhythm | +/-30% over 24 h | load swings | `rhythmAmplitude`, `rhythmPeriodH` |
| Spikes | 1%/h chance, x2-5 for 6-24 h (x difficulty) | surprise overload | `spikeChancePerHour`, `spikeMult*`, `spikeHours*` |
| Customer sizes | 20-300 tok/s; 5-40 players; 2-16 vCPU (4 GB, 500 IOPS per vCPU) | load per customer | `*SizeMin/Max`, `vmRamGBPerVcpu`, `vmIopsPerVcpu` |
| Network per unit | 32 bit/token, 100 kbit/s per player, 50 Mbit/s per vCPU; onboard NIC 1 Gbit/s | network gauge, VM limit | `netBitsPerToken`, `netKbpsPerPlayer`, `netMbpsPerVcpu`, `onboardNicGbps` |
| Node sizing | inference at up to 32 concurrent sequences, 8k context; VMs 2 vCPU per thread | node capacity | `inferenceConcurrency`, `inferenceContext`, `vmOvercommit` |
| Overload stages | slow above 100% (pay / utilization); customers leave above 125% after 6 h (x difficulty patience) | churn | `slowAbove`, `churnAbove`, `churnAfterH` |
| Reputation | 0-100, starts 50, +0.1/h when nothing is overloaded, -3 per departure | demand | `reputation*` |
| Hall air limit | 32 C | overheating alert | `hallMaxC` |
| Power and temps between idle and full load | linear in load between two evaluateBuild runs | gauges, power bill | src/dc/model.js `nodeGauges` |

## 3. Failures

| Value | Now | Affects | Where |
| --- | --- | --- | --- |
| Part failure rates | durability.js data (GPU 0.091/GPU-yr derived from the Llama 3 paper, Backblaze AFR, datasheet MTBF, Arrhenius heat factor; several are estimates, see appendix) | stress test, DC | `constants.reliability` |
| Bad changes | 0.5 per node-year (no data found) | data loss without snapshots | `badChangePerNodeYear` |
| Site loss | 0.01 per year (no data found) | data loss without offsite | `siteLossPerYear` |
| Power cuts | 1.5/yr (EIA 2024, published); mean 80 min (derived, major events not modeled) | UPS need | `powerCutsPerYear`, `powerCutMeanMin` |
| Offsite copy | every 24 h; restored over min(1 Gbit/s, node network); the copy itself is instant | restore downtime and loss | `offsiteIntervalH`, `offsiteRestoreGbps` |
| A dead GPU/CPU/RAM/PSU | takes the node down until replaced; a dead fan only alerts | DC service | src/dc/datacenter.js |

## 4. Penalties

| Value | Now | Affects | Where |
| --- | --- | --- | --- |
| Data-loss penalty | 8.5 / 10 / 13% of money (easy / normal / hard) | DC risk | `constants.difficulty.*.dataLossPenalty` |
| Partial loss with offsite | penalty x (hours since last copy / 24 h) | DC risk | src/dc/datacenter.js `loseData` |
| Reputation on data loss | -10 (scaled the same way with offsite) | DC demand | `dataLossRepLoss` |
| Reputation on a power cut the UPS can't cover | -2 | DC demand | `powerCutRepLoss` |
| Angry-client penalty | hard only, 15% of money | job risk | `constants.difficulty.hard.angryPenalty` |
| Hard-fail cap and floors | score capped at 25; payout 0 on a hard fail; perf floor 80% of target; budget/power floor 120%; noise floor +6 dB; temperature floor +5 C | scoring | `SCORING` |
| Satisfaction bands | 90 delighted / 75 happy / 50 satisfied / 25 disappointed / below angry | client mood | `SCORING.bands` |

## 5. Difficulty (approved table; listed so it's in one place)

Easy / hard: job slack x1.15 / x0.70, fee x1.15 / x0.70, failure rates x0.85 / x1.30, data-loss 8.5% / 13%, angry-client 0 / 15%, demand x0.85 / x1.30, patience x1.15 / x0.70. Normal is the baseline. Values: `constants.difficulty`; read only through `src/game/difficulty.js`.

## 6. Jobs and game-design picks

| Value | Now | Where |
| --- | --- | --- |
| Job slack around the reference build | perf target ref x [0.75,0.95]; power ref x [1.10,1.35]; noise +[2,6] dB; temp +[1,3] C; budget ref cost x [1.10,1.40] (normal) | `GEN` |
| Workload menus | homelab: weights <= 40 GB, contexts 4k-32k **and 262k (added stage 10)**, concurrency 1/1/2, 4-30 players; server: <= 300 GB, 8k/32k/64k, 1/4/8, 20-120 players; datacenter: native weights >= 60 GB, 8k/32k/128k, 16-128 | `WORKLOAD` |
| VM jobs | homelab 2-6 VMs x 2/4 vCPU x 4/8 GB x 32/64 GB disk; server 8-24 x 2/4/8 x 8/16 x 64/128; overcommit 2 or 4 | `WORKLOAD.*.vms` |
| Clients | 11 presets and their priority weights | src/jobs/clients.js |
| Reference pick | random among passing builds, weighted to cheap (n x u^2) | `findReference` |
| Game-server distances asked by clients | at least 10 (the published default) | `GAME_SERVER_DISTANCE` |
| Levels | xp to level n = 250 x (n-1)^2; gates L2 server, L3 mixed + VMs, L4 datacenter jobs, L5 personal DC (your decision) | src/jobs/levels.js |
| Stress test playback | computed at once, then shown at 60x | src/ui/StressTest.jsx |
| Autosave | 500 ms after changes, every 15 s, on close; play clock adds at most 2 s per tick; hidden tab = closed | src/App.jsx, src/save/clock.js |

## 7. Simulation estimates (no published number found)

- **Game server (weakest part of the sim):** per-player tick cost 1.5 ms and base 5 ms on a reference core; tick cost and RAM scale with the (2r+1)^2 chunk area; optimized fork x0.7. No measurement ties tick time to players, CPU or distance.
- **Virtualization mapping:** CPU type "host" = the paper's tuned KVM run (-2%), the default = untuned (-17%); qcow2 = 1/1.1 of raw IOPS; VM CPU share counts physical cores only.
- **Tensor-parallel sync** 10 us per layer (estimate, deliberately not fitted).
- **UPS runtime** between the two published points (25.8 min at 500 W, 7.2 min at 1000 W) follows a fitted power law.
- **Hardware:** every remaining hardware estimate (prices, idle power, fan specs, temperatures, the flagged datacenter figures) is in the generated appendix below and in `docs/estimates-for-signoff.md`.

## Appendix: every estimate-tagged value in the data (generated by `node scripts/list-estimates.js`)

| Where | Value | Reasoning |
| --- | --- | --- |
| gpus[gpu-ember-g3-12].fp16TensorTflops | 25.6 TFLOPS | Wikipedia lists 51.2 dense FP16 tensor TFLOPS (FP16 accumulate). On GeForce Ampere the FP32-accumulate rate is half of the FP16-accumulate rate (GA102 whitepaper: RTX 3090 142 vs 71), so 51.2 / 2. |
| gpus[gpu-ember-g3-12].int8TensorTops | 102.4 TOPS | GeForce Ampere INT8 dense = 2x FP16-accumulate dense (GA102 whitepaper: RTX 3090 284 vs 142). 2 x 51.2. |
| gpus[gpu-ember-g3-12].idlePowerW | 15 W | No idle figure found. RTX 4090 idle is 19 W (NVIDIA page); a smaller GA106 card is assumed a bit lower. |
| gpus[gpu-ember-g3-12].maxTempC | 93 C | No figure found for the 3060. Same Ampere generation as the RTX 3090, whose NVIDIA page lists 93 C. |
| gpus[gpu-ember-g3-12].pcieGen | 4 | Ampere GeForce cards are PCIe 4.0 (GA102 whitepaper lists Gen 4 for GA102); assumed the same for GA106. |
| gpus[gpu-ember-g3-12].pcieLanes | 16 lanes | Full-length x16 card assumed. |
| gpus[gpu-ember-g3-12].p2pOverPcie | false bool | GeForce cards: peer-to-peer over PCIe treated as unavailable. A search summary of nccl-tests issue #117 said "RTX 4090 does not support P2P by default"; applied to RTX 3060 as well. Not confirmed on an opened page. |
| gpus[gpu-ember-g3-12].cooling | "open-air" | The 3060 12GB shipped as partner (AIB) cards with axial open-air coolers; no Founders Edition. |
| gpus[gpu-ember-g3-12].slots | 2 slots | Typical partner card width; no reference design. |
| gpus[gpu-ember-g3-12].formFactor | "pcie" | Add-in PCIe card (edge connector) per its product page and slot count. |
| gpus[gpu-ember-g3-24].idlePowerW | 20 W | No idle figure found. RTX 4090 idle is 19 W (NVIDIA page); GA102 with 24 GB GDDR6X assumed similar. |
| gpus[gpu-ember-g3-24].pcieLanes | 16 lanes | Full-length card with an x16 edge connector (lane count not stated on the pages read). |
| gpus[gpu-ember-g3-24].p2pOverPcie | false bool | GeForce cards: peer-to-peer over PCIe treated as unavailable. A search summary of nccl-tests issue #117 said "RTX 4090 does not support P2P by default"; applied to RTX 3090 as well. Not confirmed on an opened page. |
| gpus[gpu-ember-g3-24].cooling | "open-air" | Founders Edition uses two axial fans; heat goes into the case. |
| gpus[gpu-ember-g3-24].formFactor | "pcie" | Add-in PCIe card (edge connector) per its product page and slot count. |
| gpus[gpu-ember-g4-24].pcieLanes | 16 lanes | Full-length card with an x16 edge connector (lane count not stated on the pages read). |
| gpus[gpu-ember-g4-24].p2pOverPcie | false bool | GeForce cards: peer-to-peer over PCIe treated as unavailable. A search summary of nccl-tests issue #117 said "RTX 4090 does not support P2P by default"; applied to RTX 4090 as well. Not confirmed on an opened page. |
| gpus[gpu-ember-g4-24].cooling | "open-air" | Founders Edition axial flow-through design; heat goes into the case. |
| gpus[gpu-ember-g4-24].formFactor | "pcie" | Add-in PCIe card (edge connector) per its product page and slot count. |
| gpus[gpu-ember-g5-32].idlePowerW | 25 W | No idle figure found. RTX 4090 idle is 19 W; the larger GB202 with 32 GB GDDR7 assumed somewhat higher. |
| gpus[gpu-ember-g5-32].p2pOverPcie | false bool | GeForce cards: peer-to-peer over PCIe treated as unavailable. A search summary of nccl-tests issue #117 said "RTX 4090 does not support P2P by default"; applied to RTX 5090 as well. Not confirmed on an opened page. |
| gpus[gpu-ember-g5-32].cooling | "flow-through" | Founders Edition double flow-through with vapor chamber; heat goes into the case. |
| gpus[gpu-ember-g5-32].formFactor | "pcie" | Add-in PCIe card (edge connector) per its product page and slot count. |
| gpus[gpu-atelier-a48].idlePowerW | 20 W | No idle figure found; assumed similar to other GA102 boards. |
| gpus[gpu-atelier-a48].maxTempC | 93 C | No figure found; assumed equal to the GA102-based RTX 3090 (93 C). |
| gpus[gpu-atelier-a48].p2pOverPcie | true bool | Professional cards are assumed to allow PCIe peer-to-peer (not confirmed on an opened page). |
| gpus[gpu-atelier-a48].formFactor | "pcie" | Add-in PCIe card (edge connector) per its product page and slot count. |
| gpus[gpu-atelier-a48].priceUSD | 5000 USD | A new PNY listing at $4,999 was only seen in a search snippet (page returned 403); used listings in snippets were $4,310-$8,900. |
| gpus[gpu-atelier-b96].idlePowerW | 30 W | No idle figure found; assumed above the RTX 4090 idle (19 W) for a 600 W board with 96 GB GDDR7. |
| gpus[gpu-atelier-b96].maxTempC | 90 C | No figure found; assumed equal to the same-die RTX 5090 (90 C). |
| gpus[gpu-atelier-b96].pcieLanes | 16 lanes | Full-length card with an x16 edge connector (lane count not stated on the pages read). |
| gpus[gpu-atelier-b96].linkType | "none" | No NVLink mentioned on the product page. |
| gpus[gpu-atelier-b96].linkBandwidthGBs | 0 GB/s | No NVLink. |
| gpus[gpu-atelier-b96].p2pOverPcie | true bool | Professional cards are assumed to allow PCIe peer-to-peer (not confirmed on an opened page). |
| gpus[gpu-atelier-b96].formFactor | "pcie" | Add-in PCIe card (edge connector) per its product page and slot count. |
| gpus[gpu-bastion-p48].fp16AccTensorTflops | 362.05 TFLOPS | NVIDIA lists one BF16/FP16 tensor figure without the accumulate type; datacenter Ada runs FP32 accumulate at full rate (RTX 6000 Ada: 364 either way), so the same figure is used. |
| gpus[gpu-bastion-p48].boostClockMHz | 2490 MHz | L40S clock not found; the L40 (same AD102 core configuration) lists 2490 MHz max boost on Wikipedia. |
| gpus[gpu-bastion-p48].idlePowerW | 30 W | No idle figure found; assumed for a 350 W datacenter board. |
| gpus[gpu-bastion-p48].maxTempC | 88 C | No figure found; passive datacenter card assumed to throttle a little below GeForce Ada (90 C). |
| gpus[gpu-bastion-p48].p2pOverPcie | true bool | Datacenter cards are assumed to allow PCIe peer-to-peer (not confirmed on an opened page). |
| gpus[gpu-bastion-p48].formFactor | "pcie" | Add-in PCIe card (edge connector) per its product page and slot count. |
| gpus[gpu-bastion-h80].idlePowerW | 40 W | No idle figure found; assumed for an HBM2e datacenter board. |
| gpus[gpu-bastion-h80].maxTempC | 85 C | No figure found; passive datacenter card assumed to throttle at 85 C. |
| gpus[gpu-bastion-h80].pcieLanes | 16 lanes | PCIe Gen4 64 GB/s bidirectional implies x16. |
| gpus[gpu-bastion-h80].p2pOverPcie | true bool | Datacenter cards are assumed to allow PCIe peer-to-peer. |
| gpus[gpu-bastion-h80].cooling | "passive" | NVIDIA lists "PCIe dual-slot air-cooled": a heatsink that relies on server chassis airflow. |
| gpus[gpu-bastion-h80].formFactor | "pcie" | Add-in PCIe card (edge connector) per its product page and slot count. |
| gpus[gpu-bastion-x94].fp16TensorTflops | 835.5 TFLOPS | NVIDIA lists 1,671 TFLOPS with sparsity; dense is half, as on every other SKU in these tables. |
| gpus[gpu-bastion-x94].fp16AccTensorTflops | 835.5 TFLOPS | Same as the FP16 tensor figure: Hopper has one FP16 tensor rate. 1,671 with sparsity / 2. |
| gpus[gpu-bastion-x94].int8TensorTops | 1670.5 TOPS | NVIDIA lists 3,341 TOPS with sparsity; dense is half. |
| gpus[gpu-bastion-x94].boostClockMHz | 1785 MHz | Not found on an opened page. Wikipedia lists H100 PCIe at 1755 MHz and SXM at 1980 MHz; NVL placed between them. |
| gpus[gpu-bastion-x94].idlePowerW | 50 W | No idle figure found; assumed for an HBM3 datacenter board. |
| gpus[gpu-bastion-x94].maxTempC | 85 C | No figure found; passive datacenter card assumed to throttle at 85 C. |
| gpus[gpu-bastion-x94].pcieLanes | 16 lanes | PCIe Gen5 128 GB/s bidirectional implies x16. |
| gpus[gpu-bastion-x94].p2pOverPcie | true bool | Datacenter cards are assumed to allow PCIe peer-to-peer. |
| gpus[gpu-bastion-x94].cooling | "passive" | NVIDIA lists "PCIe dual-slot air-cooled": relies on server chassis airflow. |
| gpus[gpu-bastion-x94].formFactor | "pcie" | Add-in PCIe card (edge connector) per its product page and slot count. |
| gpus[gpu-bastion-x94].priceUSD | 30000 USD | No NVL-specific price found. compute.exchange gives $25k-40k new for the 80GB class with PCIe at the low end; CloudZero gives ~$31k for a new 80GB card. |
| gpus[gpu-bastion-h80-sxm].idlePowerW | 50 W | No idle figure found. Assumed about 12% of board power (400 W), the same ratio as the other HBM boards in the catalog (A100 PCIe 40/300 W, H100 NVL 50/400 W). |
| gpus[gpu-bastion-h80-sxm].maxTempC | 85 C | No figure found; socketed datacenter module assumed to throttle at 85 C like the PCIe datacenter cards in the catalog. |
| gpus[gpu-bastion-h80-sxm].pcieLanes | 16 lanes | Each module has a x16 host link through the baseboard PCIe switches (DGX docs list PCIe Gen5 hosts). |
| gpus[gpu-bastion-h80-sxm].p2pOverPcie | true bool | Datacenter module; peer-to-peer allowed. |
| gpus[gpu-bastion-h80-sxm].cooling | "passive" | Socketed module with a heatsink cooled by the node's fans (air-cooled system specs list front-to-back airflow). |
| gpus[gpu-bastion-h80-sxm].slots | 0 slots | Socketed module on a baseboard: uses no PCIe expansion slots. |
| gpus[gpu-bastion-h80-sxm].formFactor | "sxm4" | SXM4 module; fits A100-generation 8-GPU baseboards only. |
| gpus[gpu-bastion-h80-sxm].priceUSD | 10000 USD | Article gives "approx. $10,000 by 2023" and no 2026 figure; used as the older-generation price. |
| gpus[gpu-bastion-x80-sxm].fp16TensorTflops | 989.5 TFLOPS | 1,979 with sparsity / 2. |
| gpus[gpu-bastion-x80-sxm].fp16AccTensorTflops | 989.5 TFLOPS | 1,979 with sparsity / 2; one FP16 tensor rate. |
| gpus[gpu-bastion-x80-sxm].int8TensorTops | 1979 TOPS | 3,958 with sparsity / 2. |
| gpus[gpu-bastion-x80-sxm].idlePowerW | 70 W | No idle figure found. Assumed about 12% of board power (700 W), the same ratio as the other HBM boards in the catalog (A100 PCIe 40/300 W, H100 NVL 50/400 W). Rounded down to 10%. |
| gpus[gpu-bastion-x80-sxm].maxTempC | 85 C | No figure found; socketed datacenter module assumed to throttle at 85 C like the PCIe datacenter cards in the catalog. |
| gpus[gpu-bastion-x80-sxm].pcieLanes | 16 lanes | Each module has a x16 host link through the baseboard PCIe switches (DGX docs list PCIe Gen5 hosts). |
| gpus[gpu-bastion-x80-sxm].p2pOverPcie | true bool | Datacenter module; peer-to-peer allowed. |
| gpus[gpu-bastion-x80-sxm].cooling | "passive" | Socketed module with a heatsink cooled by the node's fans (air-cooled system specs list front-to-back airflow). |
| gpus[gpu-bastion-x80-sxm].slots | 0 slots | Socketed module on a baseboard: uses no PCIe expansion slots. |
| gpus[gpu-bastion-x80-sxm].formFactor | "sxm5" | SXM5 module; the DGX H100/H200 user guide describes one system for both GPUs, so H100 and H200 share the board. |
| gpus[gpu-bastion-x141].fp16TensorTflops | 989.5 TFLOPS | Page lists 1,979 TFLOPS FP16 with sparsity; dense is half. |
| gpus[gpu-bastion-x141].fp16AccTensorTflops | 989.5 TFLOPS | Same as fp16TensorTflops (Hopper has one FP16 tensor rate). |
| gpus[gpu-bastion-x141].int8TensorTops | 1979 TOPS | Twice the dense FP16 rate, as on the H100 SXM (same GH100 compute). |
| gpus[gpu-bastion-x141].idlePowerW | 85 W | No idle figure found. Assumed about 12% of board power (700 W), the same ratio as the other HBM boards in the catalog (A100 PCIe 40/300 W, H100 NVL 50/400 W). |
| gpus[gpu-bastion-x141].maxTempC | 85 C | No figure found; socketed datacenter module assumed to throttle at 85 C like the PCIe datacenter cards in the catalog. |
| gpus[gpu-bastion-x141].pcieGen | 5 | Same GH100 host interface as the H100 SXM (PCIe Gen5). |
| gpus[gpu-bastion-x141].pcieLanes | 16 lanes | Each module has a x16 host link through the baseboard PCIe switches (DGX docs list PCIe Gen5 hosts). |
| gpus[gpu-bastion-x141].p2pOverPcie | true bool | Datacenter module; peer-to-peer allowed. |
| gpus[gpu-bastion-x141].cooling | "passive" | Socketed module with a heatsink cooled by the node's fans (air-cooled system specs list front-to-back airflow). |
| gpus[gpu-bastion-x141].slots | 0 slots | Socketed module on a baseboard: uses no PCIe expansion slots. |
| gpus[gpu-bastion-x141].formFactor | "sxm5" | Shares the H100 board (one DGX H100/H200 system spec). |
| gpus[gpu-citadel-c180].fp16TensorTflops | 2250 TFLOPS | HGX B200 lists 36 PFLOPS FP16/BF16 for 8 GPUs with sparsity; 36/8/2 = 2.25 PF dense per GPU. Wikipedia's table shows 1,191.2 in its half-precision column: the sources disagree; the vendor figure is used. |
| gpus[gpu-citadel-c180].fp16AccTensorTflops | 2250 TFLOPS | Same as fp16TensorTflops (one FP16 tensor rate on datacenter parts). |
| gpus[gpu-citadel-c180].int8TensorTops | 4500 TOPS | Twice the dense FP16 estimate (HGX lists FP8 at twice FP16: 72 vs 36 PF); INT8 not listed, assumed equal to FP8. |
| gpus[gpu-citadel-c180].idlePowerW | 120 W | No idle figure found. Assumed about 12% of board power (1000 W), the same ratio as the other HBM boards in the catalog (A100 PCIe 40/300 W, H100 NVL 50/400 W). |
| gpus[gpu-citadel-c180].maxTempC | 85 C | No figure found; socketed datacenter module assumed to throttle at 85 C like the PCIe datacenter cards in the catalog. |
| gpus[gpu-citadel-c180].pcieGen | 5 | DGX B200 host CPUs are PCIe Gen5; the host link runs at Gen5. |
| gpus[gpu-citadel-c180].pcieLanes | 16 lanes | Each module has a x16 host link through the baseboard PCIe switches (DGX docs list PCIe Gen5 hosts). |
| gpus[gpu-citadel-c180].p2pOverPcie | true bool | Datacenter module; peer-to-peer allowed. |
| gpus[gpu-citadel-c180].cooling | "passive" | Socketed module with a heatsink cooled by the node's fans (air-cooled system specs list front-to-back airflow). |
| gpus[gpu-citadel-c180].slots | 0 slots | Socketed module on a baseboard: uses no PCIe expansion slots. |
| gpus[gpu-citadel-c180].formFactor | "bw1" | B200 8-GPU baseboard; B300 systems use a different board and system spec. |
| gpus[gpu-citadel-c288].fp16TensorTflops | 2250 TFLOPS | HGX B300 lists the same 36 PFLOPS FP16/BF16 (sparse, 8 GPUs) as HGX B200: 2.25 PF dense per GPU. |
| gpus[gpu-citadel-c288].fp16AccTensorTflops | 2250 TFLOPS | Same as fp16TensorTflops. |
| gpus[gpu-citadel-c288].int8TensorTops | 4500 TOPS | Not listed on any opened page. Assumed equal to the dense FP8 rate (72 PF sparse / 8 / 2); flagged because Blackwell Ultra is reported to trade away some integer throughput. |
| gpus[gpu-citadel-c288].idlePowerW | 150 W | No idle figure found. Assumed about 12% of board power (1400 W), the same ratio as the other HBM boards in the catalog (A100 PCIe 40/300 W, H100 NVL 50/400 W). Rounded down. |
| gpus[gpu-citadel-c288].maxTempC | 85 C | No figure found; socketed datacenter module assumed to throttle at 85 C like the PCIe datacenter cards in the catalog. |
| gpus[gpu-citadel-c288].pcieGen | 5 | DGX B300 host CPUs (Xeon 6776P) are PCIe Gen5 hosts; assumed Gen5 host link. |
| gpus[gpu-citadel-c288].pcieLanes | 16 lanes | Each module has a x16 host link through the baseboard PCIe switches (DGX docs list PCIe Gen5 hosts). |
| gpus[gpu-citadel-c288].p2pOverPcie | true bool | Datacenter module; peer-to-peer allowed. |
| gpus[gpu-citadel-c288].cooling | "passive" | Socketed module with a heatsink cooled by the node's fans (air-cooled system specs list front-to-back airflow). |
| gpus[gpu-citadel-c288].slots | 0 slots | Socketed module on a baseboard: uses no PCIe expansion slots. |
| gpus[gpu-citadel-c288].formFactor | "bw2" | B300 8-GPU baseboard (DGX B300 spec differs from DGX B200: CPUs, 12 PSUs, 800G NICs). |
| gpus[gpu-tessera-t192].idlePowerW | 90 W | No idle figure found. Assumed about 12% of board power (750 W), the same ratio as the other HBM boards in the catalog (A100 PCIe 40/300 W, H100 NVL 50/400 W). |
| gpus[gpu-tessera-t192].maxTempC | 85 C | No figure found; socketed datacenter module assumed to throttle at 85 C like the PCIe datacenter cards in the catalog. |
| gpus[gpu-tessera-t192].linkType | "infinity-fabric" | GPU-to-GPU links on the 8-GPU baseboard (Supermicro page: "AMD Infinity Fabric Link"). |
| gpus[gpu-tessera-t192].linkBandwidthGBs | 896 GB/s | Search summaries (AMD platform data sheet, not opened) give 128 GB/s to each of the other 7 GPUs, 896 GB/s aggregate per GPU. A full mesh, not a switch: treated as 896 GB/s per GPU for all-reduce, an approximation. |
| gpus[gpu-tessera-t192].p2pOverPcie | true bool | Datacenter module; peer-to-peer allowed. |
| gpus[gpu-tessera-t192].cooling | "passive" | Socketed module with a heatsink cooled by the node's fans (air-cooled system specs list front-to-back airflow). |
| gpus[gpu-tessera-t192].slots | 0 slots | Socketed module on a baseboard: uses no PCIe expansion slots. |
| gpus[gpu-tessera-t192].priceUSD | 20000 USD | List price undisclosed (article). Cloud on-demand from $2.59/GPU-h, below the MI355X ($8.60/GPU-h); assumed below the H100 SXM 2026 range ($25k-31k). Flagged. |
| gpus[gpu-tessera-t288].fp16TensorTflops | 2500 TFLOPS | The table lists 5,000 in the INT8 column and only vector FP16 (157.3). On the MI300X row dense FP16 matrix is exactly half of INT8 (1,307.4 vs 2,614.9); the same ratio gives 2,500. |
| gpus[gpu-tessera-t288].fp16AccTensorTflops | 2500 TFLOPS | Same as fp16TensorTflops. |
| gpus[gpu-tessera-t288].idlePowerW | 150 W | No idle figure found. Assumed about 12% of board power (1400 W), the same ratio as the other HBM boards in the catalog (A100 PCIe 40/300 W, H100 NVL 50/400 W). Rounded down. |
| gpus[gpu-tessera-t288].maxTempC | 85 C | No figure found; socketed datacenter module assumed to throttle at 85 C like the PCIe datacenter cards in the catalog. |
| gpus[gpu-tessera-t288].linkType | "infinity-fabric" | Same Infinity Fabric baseboard design as the MI300X platform. |
| gpus[gpu-tessera-t288].linkBandwidthGBs | 896 GB/s | No figure on an opened page; assumed the same 7-link mesh bandwidth as the MI300X platform. Flagged. |
| gpus[gpu-tessera-t288].p2pOverPcie | true bool | Datacenter module; peer-to-peer allowed. |
| gpus[gpu-tessera-t288].cooling | "passive" | Socketed module with a heatsink cooled by the node's fans (air-cooled system specs list front-to-back airflow). |
| gpus[gpu-tessera-t288].slots | 0 slots | Socketed module on a baseboard: uses no PCIe expansion slots. |
| gpus[gpu-tessera-t288].priceUSD | 45000 USD | List price undisclosed (article). Same 288 GB HBM3e class as the B300 (~$53k) and B200 (street $45-50k), cloud rate $8.60/GPU-h; assumed at the B200 street low end. Flagged. |
| cpus[cpu-vela-8].maxSockets | 1 sockets | Desktop socket AM5 platform: one CPU per board. |
| cpus[cpu-vela-8].eccSupport | false bool | Consumer platform; ECC UDIMM support depends on the motherboard and is not modeled. |
| cpus[cpu-vela-8].ipcFactor | 1.5598519999999996 x Zen 2 | Chained AMD IPC claims: Zen 3 +19% (wiki-zen3), Zen 4 +13% (wiki-zen4), Zen 5 +16% (reg-zen5). |
| cpus[cpu-vela-8].idlePowerW | 25 W | No idle package power found on an opened page; assumed for a desktop AM5 CPU. |
| cpus[cpu-vela-8].tjMaxC | 95 C | AMD Tjmax not found on an opened page (AMD site returned 503); 95 C assumed. |
| cpus[cpu-vela-16].maxSockets | 1 sockets | Desktop socket AM5 platform: one CPU per board. |
| cpus[cpu-vela-16].eccSupport | false bool | Consumer platform; ECC UDIMM support depends on the motherboard and is not modeled. |
| cpus[cpu-vela-16].ipcFactor | 1.5598519999999996 x Zen 2 | Chained AMD IPC claims: Zen 3 +19% (wiki-zen3), Zen 4 +13% (wiki-zen4), Zen 5 +16% (reg-zen5). |
| cpus[cpu-vela-16].idlePowerW | 25 W | No idle package power found on an opened page; assumed for a desktop AM5 CPU. |
| cpus[cpu-vela-16].tjMaxC | 95 C | AMD Tjmax not found on an opened page (AMD site returned 503); 95 C assumed. |
| cpus[cpu-summit-32].maxSockets | 1 sockets | Workstation sTR5 platform: one CPU per board. |
| cpus[cpu-summit-32].ipcFactor | 1.5598519999999996 x Zen 2 | Chained AMD IPC claims: Zen 3 +19% (wiki-zen3), Zen 4 +13% (wiki-zen4), Zen 5 +16% (reg-zen5). |
| cpus[cpu-summit-32].idlePowerW | 60 W | No idle figure found; assumed for a 350 W workstation part. |
| cpus[cpu-summit-32].tjMaxC | 95 C | AMD Tjmax not found on an opened page (AMD site returned 503); 95 C assumed. |
| cpus[cpu-keystone-32-g2].maxSockets | 2 sockets | EPYC 7002 non-P part: 2-socket capable (P suffix marks single-socket parts). |
| cpus[cpu-keystone-32-g2].memMaxMTs | 3200 MT/s | Rome is described as eight-channel DDR4 (wiki-epyc); DDR4-3200 maximum not found on an opened page. |
| cpus[cpu-keystone-32-g2].ipcFactor | 1 x Zen 2 | Reference architecture for the IPC chain. |
| cpus[cpu-keystone-32-g2].idlePowerW | 60 W | No idle figure found; assumed for a 200 W server part. |
| cpus[cpu-keystone-32-g2].tjMaxC | 95 C | AMD Tjmax not found on an opened page (AMD site returned 503); 95 C assumed. |
| cpus[cpu-keystone-32-g5].maxSockets | 1 sockets | EPYC 9355P: the P suffix marks a single-socket part. |
| cpus[cpu-keystone-32-g5].ipcFactor | 1.5598519999999996 x Zen 2 | Chained AMD IPC claims: Zen 3 +19% (wiki-zen3), Zen 4 +13% (wiki-zen4), Zen 5 +16% (reg-zen5). |
| cpus[cpu-keystone-32-g5].idlePowerW | 70 W | No idle figure found; assumed for a 280 W server part. |
| cpus[cpu-keystone-32-g5].tjMaxC | 95 C | AMD Tjmax not found on an opened page (AMD site returned 503); 95 C assumed. |
| cpus[cpu-keystone-64-g5].ipcFactor | 1.5598519999999996 x Zen 2 | Chained AMD IPC claims: Zen 3 +19% (wiki-zen3), Zen 4 +13% (wiki-zen4), Zen 5 +16% (reg-zen5). |
| cpus[cpu-keystone-64-g5].idlePowerW | 80 W | No idle figure found; assumed for a 360 W server part. |
| cpus[cpu-keystone-64-g5].tjMaxC | 95 C | AMD Tjmax not found on an opened page (AMD site returned 503); 95 C assumed. |
| rams[ram-sprint-2x16-d5].ecc | false bool | Consumer non-ECC kit. |
| rams[ram-sprint-2x16-d5].registered | false bool | Consumer desktop kits are unbuffered DIMMs (UDIMM). |
| rams[ram-sprint-2x16-d5].powerPerModuleW | 5 W | Per-DIMM power under load not found on an opened page; assumed for a DDR5 UDIMM. |
| rams[ram-sprint-2x32-d5].ecc | false bool | Consumer non-ECC kit. |
| rams[ram-sprint-2x32-d5].registered | false bool | Consumer desktop kits are unbuffered DIMMs (UDIMM). |
| rams[ram-sprint-2x32-d5].powerPerModuleW | 5 W | Per-DIMM power under load not found on an opened page; assumed for a DDR5 UDIMM. |
| rams[ram-rack-32-d5-5600].powerPerModuleW | 10 W | Per-DIMM power under load not found on an opened page; assumed for a DDR5 RDIMM (registered clock driver + PMIC on module). |
| rams[ram-rack-64-d5-5600].powerPerModuleW | 10 W | Per-DIMM power under load not found on an opened page; assumed for a DDR5 RDIMM (registered clock driver + PMIC on module). |
| rams[ram-rack-64-d5-6400].powerPerModuleW | 10 W | Per-DIMM power under load not found on an opened page; assumed for a DDR5 RDIMM (registered clock driver + PMIC on module). |
| rams[ram-rack-32-d4-2933].powerPerModuleW | 6 W | Per-DIMM power under load not found on an opened page; assumed for a DDR4 RDIMM. |
| rams[ram-rack-32-d4-2933].priceUSD | 286 USD | $8.95/GB lowest DDR4-2933 listing x 32 GB (datacenterdisk, 2026-09-30). |
| storages[sto-strata-nova-2].uberBits | 100000000000000000 bits | SSD unrecoverable bit error rate not in the datasheet; consumer TLC SSDs are commonly specified at 1 per 10^15 to 10^17. Upper value used; flagged. |
| storages[sto-strata-vault-3t8].randReadIopsQD1 | 15000 IOPS | QD1 figure not in the brief; assumed below the consumer 990 PRO QD1 figure (22K) because enterprise drives are tuned for high queue depth. |
| storages[sto-strata-vault-3t8].randWriteIopsQD1 | 50000 IOPS | QD1 figure not in the brief; assumed. |
| storages[sto-strata-vault-3t8].activePowerW | 14 W | Active power not in the product brief; assumed for a U.3 enterprise NVMe drive. |
| storages[sto-strata-vault-3t8].idlePowerW | 5 W | Idle power not in the product brief; assumed for a U.3 enterprise NVMe drive. |
| storages[sto-strata-vault-3t8].mtbfHours | 2000000 h | MTTF not in the product brief; assumed at a typical enterprise SSD rating. |
| storages[sto-strata-vault-3t8].maxOperatingTempC | 70 C | Not in the brief; assumed. |
| storages[sto-strata-vault-3t8].uberBits | 100000000000000000 bits | Not in the brief; enterprise SSDs are commonly specified at 1 per 10^17. Flagged. |
| storages[sto-lodestone-x24].randReadIopsQD1 | 80 IOPS | QD1 not in the datasheet; for a 7200 rpm drive the average rotational latency is 4.17 ms plus seek, giving roughly 80 IOPS. |
| storages[sto-lodestone-x24].randWriteIopsQD1 | 80 IOPS | Same mechanical limit as QD1 reads (seek + rotational latency); drive write cache ignored. |
| storages[sto-lodestone-nas8].randReadIopsQD1 | 60 IOPS | Not in the datasheet; 5640 rpm gives ~5.3 ms average rotational latency plus seek, roughly 60 IOPS. |
| storages[sto-lodestone-nas8].randWriteIopsQD1 | 60 IOPS | Same mechanical limit as QD1 reads (seek + rotational latency); drive write cache ignored. |
| storages[sto-lodestone-nas8].randReadIopsHighQD | 120 IOPS | Not in the datasheet; scaled from the Exos 7200 rpm QD16 read figure by rpm ratio. |
| storages[sto-lodestone-nas8].randWriteIopsHighQD | 120 IOPS | Not in the datasheet; assumed equal to reads. |
| psus[psu-voltaic-g650].rating | "80plus-gold" | Listed as Cybenetics Gold in a search result; the 80 PLUS Gold tier minimums are used for the curve. |
| psus[psu-voltaic-g650].formFactor | "atx" | Desktop ATX power supply. |
| psus[psu-voltaic-g650].mtbfHours | 100000 h | MTBF not found on an opened page; assumed. PSU fan noise not modeled separately yet: counted as part of the chassis airflow. |
| psus[psu-voltaic-g650].priceUSD | 105 USD | Search results (pages not opened) put US pricing around $104.99 in 2026. |
| psus[psu-voltaic-g850].rating | "80plus-gold" | ATX 3.1 Gold unit per search listings; 80 PLUS Gold tier minimums used. |
| psus[psu-voltaic-g850].formFactor | "atx" | Desktop ATX power supply. |
| psus[psu-voltaic-g850].mtbfHours | 100000 h | MTBF not found on an opened page; assumed. |
| psus[psu-voltaic-g850].priceUSD | 95 USD | Search results (pages not opened) show $94.99 at Amazon in 2026. |
| psus[psu-voltaic-p1000].rating | "80plus-platinum" | Listed as 80 PLUS Platinum in search results; tier minimums used. |
| psus[psu-voltaic-p1000].formFactor | "atx" | Desktop ATX power supply. |
| psus[psu-voltaic-p1000].mtbfHours | 100000 h | MTBF not found on an opened page; assumed. |
| psus[psu-voltaic-p1000].priceUSD | 220 USD | Search results (pages not opened) show $219.99 promotional and EUR 222-250 in 2026. |
| psus[psu-voltaic-t1600].rating | "80plus-titanium" | 80 PLUS Titanium per search results; tier minimums used. |
| psus[psu-voltaic-t1600].formFactor | "atx" | Desktop ATX power supply. |
| psus[psu-voltaic-t1600].mtbfHours | 100000 h | MTBF not found on an opened page; assumed. |
| psus[psu-voltaic-t1600].priceUSD | 550 USD | Search results (pages not opened) show EUR 469-580 in 2026; converted and rounded. |
| psus[psu-voltaic-m3000t].formFactor | "module" | Hot-swap server PSU module: goes into a node PSU bay; several share the load. |
| psus[psu-voltaic-m3000t].mtbfHours | 250000 h | MTBF not found on an opened page. Assumed higher than desktop units (100,000 h assumed) because hot-swap server modules are built for continuous duty. Flagged. |
| psus[psu-voltaic-m3000t].priceUSD | 900 USD | No price opened. Assumed for a 3 kW Titanium hot-swap module. Flagged. |
| psus[psu-voltaic-m3300].rating | "80plus-platinum" | Efficiency level not stated in the DGX guides; 80 PLUS Platinum 230 V redundant minimums assumed. Flagged. |
| psus[psu-voltaic-m3300].formFactor | "module" | Hot-swap server PSU module: goes into a node PSU bay; several share the load. |
| psus[psu-voltaic-m3300].mtbfHours | 250000 h | MTBF not found on an opened page. Assumed higher than desktop units (100,000 h assumed) because hot-swap server modules are built for continuous duty. Flagged. |
| psus[psu-voltaic-m3300].priceUSD | 1000 USD | No price opened. Assumed for a 3.3 kW hot-swap module. Flagged. |
| psus[psu-voltaic-m3200].rating | "80plus-titanium" | Efficiency level not stated in the DGX B300 guide; Titanium 230 V redundant minimums assumed for a 2025 design. Flagged. |
| psus[psu-voltaic-m3200].formFactor | "module" | Hot-swap server PSU module: goes into a node PSU bay; several share the load. |
| psus[psu-voltaic-m3200].mtbfHours | 250000 h | MTBF not found on an opened page. Assumed higher than desktop units (100,000 h assumed) because hot-swap server modules are built for continuous duty. Flagged. |
| psus[psu-voltaic-m3200].priceUSD | 1000 USD | No price opened. Assumed for a 3.2 kW hot-swap module. Flagged. |
| psus[psu-voltaic-m6600t].formFactor | "module" | Hot-swap server PSU module: goes into a node PSU bay; several share the load. |
| psus[psu-voltaic-m6600t].mtbfHours | 250000 h | MTBF not found on an opened page. Assumed higher than desktop units (100,000 h assumed) because hot-swap server modules are built for continuous duty. Flagged. |
| psus[psu-voltaic-m6600t].priceUSD | 1800 USD | No price opened. Assumed roughly twice the 3 kW module. Flagged. |
| fans[fan-sirocco-12q].priceUSD | 8 USD | Price not shown on the product page; assumed for a single 120 mm fan. |
| fans[fan-sirocco-12m].priceUSD | 12 USD | Price not shown on the product page; assumed. |
| fans[fan-gale-80s].sizeMm | 80 mm | 80 x 80 x 38 mm per the listing title (DigiKey/Farnell search results; product pages returned 404/503). |
| fans[fan-gale-80s].minRpm | 1500 rpm | Minimum PWM speed not read; assumed ~10% of max. |
| fans[fan-gale-80s].maxRpm | 14900 rpm | Rated speed from a DigiKey listing search summary (page not opened). |
| fans[fan-gale-80s].maxAirflowCFM | 130.7 CFM | DigiKey listing search summary: 130.7 CFM (3.66 m3/min). Page not opened. |
| fans[fan-gale-80s].maxStaticPressureMmH2O | 101.6 mmH2O | DigiKey listing search summary: 996.3 Pa = 101.6 mmH2O. Page not opened. |
| fans[fan-gale-80s].maxNoiseSone | 7.46 sone | Listing gives 69.0 dB(A). Stored as sone so the sim sone->dB(A) conversion returns 69: 2^((69-40)/10) = 7.46. |
| fans[fan-gale-80s].maxPowerW | 40.8 W | DigiKey listing search summary: 40.8 W. Page not opened. |
| fans[fan-gale-80s].l10Hours40C | 60000 h | Expected life not read. Industrial ball-bearing server fan assumed twice the ARCTIC desktop fan L10 (30,000 h at 40 C). Flagged. |
| fans[fan-gale-80s].mttfHours40C | 420000 h | MTTF ~= 7 x L10, the relation in the ARCTIC MTTF report, applied to the assumed L10. |
| fans[fan-gale-80s].priceUSD | 45 USD | No price opened; assumed for an 80 mm 15k rpm industrial fan. Flagged. |
| coolers[clr-frostline-d2].noiseMaxDBA | 40 dBA | Full-speed noise for the NH-D15 G2 not read from the review; assumed near the AIO full-speed figure (39.8 dBA). |
| coolers[clr-frostline-d2].fanCount | 2 fans | Dual-fan tower cooler. |
| coolers[clr-frostline-d2].socketSupport | ["AM5"] | Consumer socket only; server/workstation sockets need a separate SKU. |
| coolers[clr-frostline-d2].priceUSD | 150 USD | Tom's Hardware review title "Not worth $150" (search result, page not opened). |
| coolers[clr-frostline-loop360].fanCount | 3 fans | 360 mm radiator with three 120 mm fans. |
| coolers[clr-frostline-loop360].socketSupport | ["AM5"] | Consumer socket only in this catalog. |
| coolers[clr-frostline-loop360].priceUSD | 110 USD | Price not collected on an opened page; assumed. |
| networks[net-lattice-64x100].kind | "switch" | Ethernet switch. |
| networks[net-lattice-64x100].maxPowerW | 466 W | Only typical power with passive cables (466 W) is published; used as the max. |
| networks[net-lattice-64x100].fans | 4 fans | Fan count not read; assumed for a 2U switch. |
| networks[net-lattice-64x100].priceUSD | 15000 USD | No price opened. Assumed for a 64-port 100GbE datacenter switch. Flagged. |
| networks[net-lattice-32x400].kind | "switch" | Ethernet switch. |
| networks[net-lattice-32x400].maxPowerW | 630 W | Only typical power with passive cables (630 W) is published; used as the max. |
| networks[net-lattice-32x400].fans | 6 fans | Fan count not read; assumed for a 1U switch. |
| networks[net-lattice-32x400].noiseDBA | 67.6 dBA | Not published for this model; assumed equal to the SN4600C (67.6 dBA) from the same manual. |
| networks[net-lattice-32x400].priceUSD | 25000 USD | No price opened. Assumed for a 32-port 400GbE datacenter switch. Flagged. |
| networks[net-lattice-64x800].kind | "switch" | Ethernet switch. |
| networks[net-lattice-64x800].maxPowerW | 940 W | Datasheet text did not include power. Search results give 940 W typical; used as the max. Page not opened for that figure. |
| networks[net-lattice-64x800].noiseDBA | 67.6 dBA | Not found; assumed equal to the SN4600C (67.6 dBA). |
| networks[net-lattice-64x800].priceUSD | 60000 USD | No price opened. Assumed for a 64-port 800GbE switch. Flagged. |
| networks[net-strand-ib64].kind | "switch" | InfiniBand switch. |
| networks[net-strand-ib64].maxPowerW | 747 W | Datasheet text did not include power. Search results give 747 W typical with passive cables (max 1,720 W with active optics); typical used. Page not opened for that figure. |
| networks[net-strand-ib64].noiseDBA | 67.6 dBA | Not found; assumed equal to the SN4600C (67.6 dBA). |
| networks[net-strand-ib64].priceUSD | 35000 USD | No price opened. Assumed for a 64-port 400G InfiniBand switch. Flagged. |
| networks[net-strand-nic400].kind | "nic" | Host adapter card, one per GPU in scale-out nodes. |
| networks[net-strand-nic400].ports[0].count | 1 ports | Single-port model (DGX H100 uses "8 x ConnectX-7 Single Port"). |
| networks[net-strand-nic400].ports[0].speedGbps | 400 Gbps | DGX H100 guide: up to 400 Gbps InfiniBand per card. |
| networks[net-strand-nic400].ports[0].medium | "osfp-ib" | OSFP InfiniBand/Ethernet. |
| networks[net-strand-nic400].maxPowerW | 25.9 W | Search results give ~24.4-25.9 W for the single-port 400G card; upper value used. Page not opened. |
| networks[net-strand-nic400].fans | 0 fans | Passive card cooled by the server airflow. |
| networks[net-strand-nic400].priceUSD | 2000 USD | No price opened. Assumed for a 400G adapter. Flagged. |
| chassis[chs-hollow-quiet-xl].includedFanModel | "fan-sirocco-12q" | Stock fan specs not published on the page; modeled as the quiet 120 mm catalog fan scaled by area (140/120)^2. Flagged. |
| chassis[chs-hollow-quiet-xl].dampingDB | 4 dB | No attenuation figure published. Assumed reduction in radiated noise from dense damping panels and a closed front. Flagged. |
| chassis[chs-hollow-quiet-xl].dustFilters | true bool | Define series ships with filters; not read on the page. |
| chassis[chs-hollow-quiet-xl].priceUSD | 250 USD | No price on the product page; assumed. |
| chassis[chs-hollow-gale].includedFanSizeMm | 160 mm | Mixed 180/140 mm stock fans; average size used for the area scaling. |
| chassis[chs-hollow-gale].includedFanModel | "fan-sirocco-12q" | Stock fan specs not published on the page; modeled as the quiet 120 mm catalog fan scaled by area. Flagged. |
| chassis[chs-hollow-gale].driveBays35 | 2 bays | Not read on the page; assumed. |
| chassis[chs-hollow-gale].soundDamping | false bool | High-airflow open-front design; no damping listed. |
| chassis[chs-hollow-gale].dampingDB | 0 dB | No damping. |
| chassis[chs-hollow-gale].priceUSD | 230 USD | No price on the product page; assumed. |
| chassis[chs-hollow-r4].volumeL | 48.6 L | Only depth (25" = 635 mm) is published on the page. Geometric volume: 4U height (177.8 mm) x typical 19" chassis body width (~430 mm, assumed) x 635 mm = 48.6 L. |
| chassis[chs-hollow-r4].includedFans | 0 fans | Included fans not stated on the page; assumed none included (fans bought separately). |
| chassis[chs-hollow-r4].includedFanModel | "fan-sirocco-12m" | Mounts are 120 mm; high-pressure catalog fan used when the player adds fans. |
| chassis[chs-hollow-r4].maxGpuLengthMm | 330 mm | Page states GPUs up to 158 mm tall but not max length; assumed from a 25" deep chassis minus drive cage. |
| chassis[chs-hollow-r4].soundDamping | false bool | Rackmount chassis; no damping listed. |
| chassis[chs-hollow-r4].dampingDB | 0 dB | No damping. |
| chassis[chs-hollow-r4].dustFilters | false bool | Not listed. |
| chassis[chs-hollow-r4].priceUSD | 500 USD | No price on the product page; assumed. |
| chassis[rack-hollow-42].doorsPerforated | true bool | Perforation % not on the page; NetShelter SX doors are perforated for front-to-back airflow (assumed). |
| chassis[rack-hollow-42].priceUSD | 1800 USD | No price on the product page; assumed. |
| models[mdl-tamarin-2-7b].headDim | 128 | hidden_size 4096 / 32 attention heads (config has no head_dim field). |
| models[mdl-quill-25-7b].headDim | 128 | hidden_size 3584 / 28 attention heads. |
| models[mdl-mistle-32-24b].tiedEmbeddings | false | text_config does not set tie_word_embeddings; default false for Mistral. |
| models[mdl-mistle-32-24b].totalParams | 23570000000 params | HF reports 24.01B including the vision tower. Text-only count: BF16 GGUF file 47,153,524,544 bytes / 2 bytes per param = 23.58B. |
| models[mdl-quill-25-32b].headDim | 128 | hidden_size 5120 / 40 attention heads. |
| models[mdl-quill-3-30b-a3b].moe.expertParamsPerExpertLayer | 4718592 params | 3 x hidden (2048) x moe_intermediate (768). 48 layers x 128 experts x this = 28.99B of the 30.53B total; with 8 active experts the active count including embeddings is 3.34B, matching the card (3.3B). |
| models[mdl-ossia-20b].moe.expertParamsPerExpertLayer | 24883200 params | 3 x hidden (2880) x intermediate (2880). 24 layers x 32 experts x this = 19.11B, matching the 19,110,297,600 MXFP4 (U8) parameter count; 4 active experts plus non-expert weights minus the input embedding = 3.6B, matching the card. |
| models[mdl-ossia-120b].moe.expertParamsPerExpertLayer | 24883200 params | 3 x hidden x intermediate (both 2880). 36 x 128 x this = 114.66B, matching the 114,661,785,600 MXFP4 parameter count; active = 5.1B as on the card. |
| models[mdl-mistle-3-8b].totalParams | 8493779584 params | Multimodal repo: API total includes the vision tower. Text weights = BF16 GGUF 16987559168 bytes / 2 bytes per param. |
| models[mdl-phi-4-14b].headDim | 128 | hidden_size 5120 / 40 attention heads (config has no head_dim). |
| models[mdl-mistle-3-14b].totalParams | 13510432976 params | Multimodal repo: API total includes the vision tower. Text weights = BF16 GGUF 27020865952 bytes / 2 bytes per param. |
| models[mdl-quill-38-27b].totalParams | 27328867808 params | Multimodal repo: API total includes the vision tower. Text weights = BF16 GGUF 54657735616 bytes / 2 bytes per param. |
| models[mdl-quill-38-27b].attention.linearStateBytesPerLayer | 3145728 bytes | Linear-attention (Gated DeltaNet) state: 48 value heads x 128 key dim x 128 value dim, fp32 (llama.cpp keeps recurrent state in f32; assumed for all engines). Conv state left out (kernel 4, small). |
| models[mdl-quill-38-27b].weights.Q4_K_M | 16670609363 bytes | No Q4_K_M GGUF on HF for this model. BF16 GGUF 54657735616 bytes x 0.305 (median Q4_K_M/BF16 ratio of the other 2026 models that have both). |
| models[mdl-quill-36-35b-a3b].totalParams | 34688319088 params | Multimodal repo: API total includes the vision tower. Text weights = BF16 GGUF 69376638176 bytes / 2 bytes per param. |
| models[mdl-quill-36-35b-a3b].moe.expertParamsPerExpertLayer | 3145728 params | 3 x hidden (2048) x moe_intermediate (512) (gate, up, down). 40 MoE layers x 256 experts x this = 32.21B of the 34.69B total. |
| models[mdl-quill-36-35b-a3b].attention.linearStateBytesPerLayer | 2097152 bytes | Linear-attention (Gated DeltaNet) state: 32 value heads x 128 key dim x 128 value dim, fp32 (llama.cpp keeps recurrent state in f32; assumed for all engines). Conv state left out (kernel 4, small). |
| models[mdl-quill-36-35b-a3b].weights.Q4_K_M | 21159874644 bytes | No Q4_K_M GGUF on HF for this model. BF16 GGUF 69376638176 bytes x 0.305 (median Q4_K_M/BF16 ratio of the other 2026 models that have both). |
| models[mdl-gem-4-31b].totalParams | 31184016896 params | Multimodal repo: API total includes the vision tower. Text weights = BF16 GGUF 62368033792 bytes / 2 bytes per param. |
| models[mdl-gem-4-31b].attention.fullKEqV | true bool | config attention_k_eq_v: true; applied to the global (full) layers only, which carry their own KV shape. Not confirmed in model code. |
| models[mdl-gem-4-26b-a4b].totalParams | 25680183200 params | Multimodal repo: API total includes the vision tower. Text weights = BF16 GGUF 51360366400 bytes / 2 bytes per param. |
| models[mdl-gem-4-26b-a4b].moe.expertParamsPerExpertLayer | 5947392 params | 3 x hidden (2816) x moe_intermediate (704) (gate, up, down). 30 MoE layers x 128 experts x this = 22.84B of the 25.68B total. |
| models[mdl-gem-4-26b-a4b].attention.fullKEqV | true bool | config attention_k_eq_v: true; applied to the global layers only. Not confirmed in model code. |
| models[mdl-gem-4-26b-a4b].weights.Q4_K_M | 15664911752 bytes | No Q4_K_M GGUF on HF for this model. BF16 GGUF 51360366400 bytes x 0.305 (median Q4_K_M/BF16 ratio of the other 2026 models that have both). |
| models[mdl-glade-47-flash].headDim | 256 | MLA query head = qk_nope_head_dim 192 + qk_rope_head_dim 64. |
| models[mdl-glade-47-flash].totalParams | 29954418848 params | API total 31.22B includes the multi-token-prediction layer, which the GGUF files leave out. BF16 GGUF bytes / 2 = 29.95B. |
| models[mdl-glade-47-flash].moe.moeLayers | 46 layers | 47 layers minus first_k_dense_replace (1). |
| models[mdl-glade-47-flash].moe.expertParamsPerExpertLayer | 9437184 params | 3 x hidden (2048) x moe_intermediate (1536) (gate, up, down). 46 MoE layers x 64 experts x this = 27.78B of the 29.95B total. |
| models[mdl-glade-47-flash].attention.mlaLatentDim | 576 elements | MLA caches kv_lora_rank (512) + qk_rope_head_dim (64) = 576 values per token per layer (engines with MLA support store the compressed latent). |
| models[mdl-glade-45-air].moe.moeLayers | 45 layers | 46 layers minus first_k_dense_replace (1). |
| models[mdl-glade-45-air].moe.expertParamsPerExpertLayer | 17301504 params | 3 x hidden (4096) x moe_intermediate (1408) (gate, up, down). 45 MoE layers x 128 experts x this = 99.66B of the 110.47B total. |
| models[mdl-tamarin-4-scout].totalParams | 107780841104 params | Multimodal repo: API total includes the vision tower. Text weights = BF16 GGUF 215561682208 bytes / 2 bytes per param. |
| models[mdl-tamarin-4-scout].moe.expertParamsPerExpertLayer | 125829120 params | 3 x hidden (5120) x moe_intermediate (8192) (gate, up, down). 48 MoE layers x 16 experts x this = 96.64B of the 107.78B total. |
| models[mdl-tamarin-4-scout].attention.fullLayers | 12 layers | no_rope_layers marks 12 NoPE global layers; the other 36 use chunked attention (attention_chunk_size 8192). |
| models[mdl-tamarin-4-scout].attention.slidingLayers | 36 layers | Chunked attention (8192-token chunks) treated as an 8192-token sliding window: the same upper bound on tokens attended. |
| models[mdl-quill-35-122b-a10b].totalParams | 122157005744 params | Multimodal repo: API total includes the vision tower. Text weights = BF16 GGUF 244314011488 bytes / 2 bytes per param. |
| models[mdl-quill-35-122b-a10b].moe.expertParamsPerExpertLayer | 9437184 params | 3 x hidden (3072) x moe_intermediate (1024) (gate, up, down). 48 MoE layers x 256 experts x this = 115.96B of the 122.16B total. |
| models[mdl-quill-35-122b-a10b].attention.linearStateBytesPerLayer | 4194304 bytes | Linear-attention (Gated DeltaNet) state: 64 value heads x 128 key dim x 128 value dim, fp32 (llama.cpp keeps recurrent state in f32; assumed for all engines). Conv state left out (kernel 4, small). |
| models[mdl-mmx-m27].moe.expertParamsPerExpertLayer | 14155776 params | 3 x hidden (3072) x moe_intermediate (1536) (gate, up, down). 62 MoE layers x 256 experts x this = 224.68B of the 228.69B total. |
| models[mdl-mmx-m27].weights.Q4_K_M | 139533542603 bytes | No Q4_K_M GGUF on HF for this model. BF16 GGUF 457487024928 bytes x 0.305 (median Q4_K_M/BF16 ratio of the other 2026 models that have both). |
| models[mdl-deep-v32].headDim | 192 | MLA query head = qk_nope_head_dim 128 + qk_rope_head_dim 64. |
| models[mdl-deep-v32].totalParams | 671136532688 params | API total 685.36B includes the multi-token-prediction layer (num_nextn_predict_layers 1), which the GGUF files leave out. BF16 GGUF bytes / 2 = 671.1B, the main model the sim runs. |
| models[mdl-deep-v32].moe.moeLayers | 58 layers | 61 layers minus first_k_dense_replace (3). |
| models[mdl-deep-v32].moe.expertParamsPerExpertLayer | 44040192 params | 3 x hidden (7168) x moe_intermediate (2048) (gate, up, down). 58 MoE layers x 256 experts x this = 653.91B of the 671.14B total. |
| models[mdl-deep-v32].attention.mlaLatentDim | 576 elements | MLA caches kv_lora_rank (512) + qk_rope_head_dim (64) = 576 values per token per layer (engines with MLA support store the compressed latent). |
| models[mdl-deep-v32].attention.sparseAttentionModeled | false bool | Sparse attention (index_topk 2048) is not modeled: attention is treated as full, which overstates attention work at long context. |
| models[mdl-glade-53].headDim | 256 | MLA query head = qk_nope_head_dim 192 + qk_rope_head_dim 64. |
| models[mdl-glade-53].moe.expertParamsPerExpertLayer | 37748736 params | 3 x hidden (6144) x moe_intermediate (2048) (gate, up, down). 75 MoE layers x 256 experts x this = 724.78B of the 753.33B total. |
| models[mdl-glade-53].attention.mlaLatentDim | 576 elements | MLA caches kv_lora_rank (512) + qk_rope_head_dim (64) = 576 values per token per layer (engines with MLA support store the compressed latent). |
| models[mdl-glade-53].attention.sparseAttentionModeled | false bool | Sparse attention (index_topk 2048) is not modeled: attention is treated as full, which overstates attention work at long context. |
| models[mdl-glade-53].weights.Q4_K_M | 459936348520 bytes | No Q4_K_M GGUF on HF for this model. BF16 GGUF 1507988027936 bytes x 0.305 (median Q4_K_M/BF16 ratio of the other 2026 models that have both). |
| engines[eng-kettle].tensorParallel | true bool | Row and tensor split modes split weights across GPUs and run them in parallel (README); treated as tensor-parallel stages. |
| engines[eng-kettle].memFractionDefault | 1 fraction | llama.cpp does not reserve a fixed fraction; it allocates what the model, KV and compute buffers need. |
| engines[eng-kettle].runtimeOverheadGB | 0.8 GB | CUDA context plus compute buffers at the default -ub 512. Not measured on an opened page. |
| engines[eng-kettle].inputEmbeddingsOnCpu | true bool | llama.cpp keeps the token-embedding table in host memory (only one row is looked up per token). Evidence: the published 6x 24 GB run of Llama 70B F16 does not fit if the 2.1 GB table sits on GPU 0. Not confirmed in docs. |
| engines[eng-sluice].runtimeOverheadGB | 1.5 GB | Activation workspace and CUDA graphs inside the gpu_memory_utilization budget. Not measured on an opened page. |
| engines[eng-sluice].prefillChunkTokens | 8192 tokens | max_num_batched_tokens default not captured from the docs page (listed as "testing convenience value"); 8192 assumed. |
| engines[eng-sluice].inputEmbeddingsOnCpu | false bool | vLLM loads all model weights onto the GPUs (embedding sharded with TP). |
| engines[eng-sluice].perf.hbmBwFactor | 1 fraction | No single-stream vLLM decode data on HBM cards in the fit set; not applied (1). The held-out A100 SXM vLLM cases (set E) check this. |
| engines[eng-sluice].perf.prefillTokenLayerOverheadUs | 0 us | No prefill benchmark for this engine in the fit set; its matmul efficiency is fitted on aggregate throughput, which absorbs this overhead, so it is not applied (0). |
| engines[eng-loom].cpuOffload | [] | --cpu-offload-gb was not on the SGLang server-arguments page read; no CPU offload until confirmed. |
| engines[eng-loom].runtimeOverheadGB | 1.5 GB | Activation workspace and CUDA graphs. Not measured on an opened page. |
| engines[eng-loom].prefillChunkTokens | 8192 tokens | --chunked-prefill-size default is None (auto) on the docs page; 8192 assumed to match the vLLM setting. |
| engines[eng-loom].inputEmbeddingsOnCpu | false bool | SGLang loads all model weights onto the GPUs. |
| constants.air.cfmToM3s | 0.000471947 m3/s per CFM | Unit conversion: 1 ft3 = 0.0283168 m3; per minute / 60. |
| constants.fanLaws.noiseSpeedCoeffDB | 50 dB per decade | Fan noise change = 50 log10(n2/n1). Seen in search results citing fan-acoustics references; the pages that state it returned 404, so not confirmed on an opened page. |
| constants.acoustics.gpuFanMaxDBA.open-air | 40 dBA | GPU cooler noise at full fan speed, 1 m. No per-card figure found; assumed near the full-speed AIO figure in the cooler review (39.8 dBA). |
| constants.acoustics.gpuFanMaxDBA.flow-through | 38 dBA | Assumed slightly quieter than open-air at full speed. |
| constants.acoustics.gpuFanMaxDBA.blower | 48 dBA | Blower coolers are louder at full speed (small radial fan at high rpm). Assumed. |
| constants.acoustics.gpuFanMaxDBA.passive | 0 dBA | No fans on the card. |
| constants.acoustics.switchFanDBA | 30 dBA | Small switch with fans, at 1 m. Assumed. |
| constants.acoustics.psuFanDBA | 25 dBA | PSU fan at moderate load, 1 m. Assumed. |
| constants.acoustics.sonePhonOffset | 40 phon | Standard definition: loudness level (phon) = 40 + 10 log2(sone). Treated as approximately dB(A) for fan ratings. |
| constants.acoustics.distanceAttenuationRef | 1 m | Fan and cooler dB(A) ratings are treated as sound pressure at 1 m; level falls by 20 log10(r / 1 m) in free field. Standard point-source spreading; not confirmed on an opened page. |
| constants.pcie.gen3x16GBs | 16 GB/s | Half of Gen4 per direction; each PCIe generation doubles the per-lane rate. |
| constants.interconnect.allreduceLatencyUs.nvlink | 10 us | One DGX-A100 user reported ~3 us P2P write latency (nccl-tests issue #123); a ring all-reduce needs 2(N-1) such steps plus kernel launch, so ~10 us for 2 GPUs. |
| constants.interconnect.allreduceLatencyUs.pcie-p2p | 25 us | PCIe peer-to-peer adds switch/root-complex latency over NVLink; a search summary mentioned 9-10 us for a custom all-reduce on RTX 4090 over PCIe, but the page was not opened. 25 us assumed for NCCL over PCIe. |
| constants.interconnect.allreduceLatencyUs.pcie-host | 60 us | Without P2P, data is staged through host memory (two PCIe crossings and a host copy). Assumed. |
| constants.interconnect.tpSyncUsPerLayer | 10 us | Per-layer synchronization cost in a tensor-parallel group on top of the all-reduce itself: each layer adds two collective kernels and the ranks wait for the slowest one. Taken as two kernel launches of ~5 us each. NOT fitted: the only published single-stream TP measurement (arXiv 2512.01644) is deliberately not used to set it (user decision). Revisit when more TP data exists. |
| constants.memory.osReserveGB | 4 GB | System RAM kept by the OS, page cache minimum and engine process outside the model. Not measured; assumed. |
| constants.memory.bytesPerMarketedGB | 1073741824 bytes | DRAM chip densities are powers of two (e.g. 16 Gbit = 2 GiB), so a "24 GB" GPU or a "32 GB" DIMM holds 24 or 32 GiB. Evidence in the data: the published 6x 24 GB run of a 141 GB F16 70B model only fits with binary capacities. Model files are decimal bytes. |
| constants.inference.activationBytes | 2 bytes | Activations exchanged between GPUs are fp16/bf16 (2 bytes per element). |
| constants.inference.cpuBwEfficiency | 0.6 fraction | Share of theoretical DRAM bandwidth reached by CPU inference. No CPU-offload benchmark with a normal thread count was found; assumed. Flagged. |
| constants.inference.cpuLayerOverheadUs | 50 us | Per-layer fixed cost on CPU. Assumed. |
| constants.inference.dramBytesPerTransfer | 8 bytes | A DDR4/DDR5 channel is 64 bits wide, so bandwidth = MT/s x 8 bytes per channel. |
| constants.inference.cpuFlopsPerCoreCycle | 32 FLOP/cycle | Two 256-bit FMA units per core = 2 x 8 fp32 lanes x 2 FLOP = 32 FLOP/cycle. Architecture detail not confirmed on an opened page for each CPU. |
| constants.inference.cpuPrefillEfficiency | 0.3 fraction | Share of peak CPU FLOPs reached by prompt processing on CPU-resident layers. No benchmark found; assumed. |
| constants.inference.reportDepthTokens | 1024 tokens | Context depth at which decode speed and load are reported when a workload does not set one. A reporting convention, not a physical value. |
| constants.inference.defaultPromptTokens | 4096 tokens | Prompt length used for time-to-first-token when a workload does not set one. A reporting convention. |
| constants.power.gpuDecodeFraction | 0.6222222222222222 fraction | RTX 4090: ~280 W single-stream decode of 450 W board power (search summary; page 403). |
| constants.power.gpuBatchDecodeFraction | 0.8777777777777778 fraction | RTX 4090: ~395 W batch-32 decode (search summary; page 403). |
| constants.power.gpuBatchDecodeRefBatch | 32 sequences | Batch size of the batched-decode power figure above; power is interpolated between batch 1 and this. |
| constants.power.gpuPrefillFraction | 0.9111111111111111 fraction | RTX 4090: ~410 W prefill (search summary; page 403). |
| constants.power.cpuInferenceLoadFraction | 0.3 fraction | CPU load while the engine feeds GPUs (kernel launches, sampling, serving HTTP). Assumed. When layers run on the CPU, load rises with the share of each step spent there. |
| constants.power.motherboardW | 40 W | Chipset, VRM losses, fans header, NICs on board. Assumed. |
| constants.power.networkLoadFraction | 0.6 fraction | Switches are rated at max power with all ports busy; 60% assumed for a working switch. |
| constants.power.storageBusyFraction | 0.1 fraction | Share of time drives are active while serving inference or game worlds (weights are loaded once, then mostly idle). Assumed. |
| constants.thermal.gpuHeatsinkResistanceCW.open-air | 0.1 C/W | Assumed: a 450 W open-air card reaches ~70 C in 25 C air (45 C rise / 450 W). |
| constants.thermal.gpuHeatsinkResistanceCW.flow-through | 0.09 C/W | Assumed slightly better than open-air. |
| constants.thermal.gpuHeatsinkResistanceCW.blower | 0.18 C/W | Assumed: blower cards run hotter (a 300 W blower card ~80 C in 25 C air). |
| constants.thermal.gpuHeatsinkResistanceCW.passive | 0.12 C/W | Assumed at the required server airflow; much worse without it (see passiveMinAirflowCFM). |
| constants.thermal.passiveMinAirflowCFM | 30 CFM | Airflow a passive datacenter card needs across its heatsink. Not found on an opened page; assumed. |
| constants.thermal.throttleFloorFraction | 0.6 fraction | When a part hits its max temperature it cuts power; below 60% of its normal power the sim calls it a thermal failure. Assumed. |
| constants.thermal.throttlePerfExponent | 0.207 | Speed ~ power^x. From the llama.cpp CUDA discussion: an RTX 3090 capped from 390 W to 250 W decoded at 137.72 vs 151.04 tok/s, so x = ln(0.912)/ln(0.641) = 0.207. A 5090 capped 600->400 W lost only 1.2% (x = 0.03), so the effect varies by card; flagged. |
| constants.thermal.airflowRestriction.damped | 0.6 fraction | Share of fan free-air CFM that gets through a closed, sound-damped case (solid front panel, filters). Not measured; assumed. |
| constants.thermal.airflowRestriction.open | 0.85 fraction | Share of fan free-air CFM through an open mesh case with filters. Assumed. |
| constants.thermal.airflowRestriction.rack | 0.8 fraction | Share through a rack chassis with a drive cage in front. Assumed. |
| constants.thermal.naturalConvectionCFM | 3 CFM | Air that moves through a case with every fan stopped (chimney effect through vents). Assumed small. |
| constants.thermal.convectionExponent | 0.8 | Forced-convection heat transfer grows with airflow^0.8 (turbulent-flow correlations), so heatsink resistance scales with airflow^-0.8. Standard heat-transfer result; not from an opened page. |
| constants.thermal.targetMarginC | 8 C | Fan controllers aim to keep parts this far below their max temperature. Assumed. |
| constants.thermal.gpuFanMinFraction | 0.3 fraction | Lowest GPU fan speed when the card is working. Assumed. |
| constants.thermal.driveRiseC | 8 C | Drives sit this much above the case inlet air. Assumed. |
| constants.thermal.roomAirMixingFactor | 1 fraction | Room air treated as fully mixed (one temperature). Standard lumped assumption. |
| constants.thermal.wallHeatCapacityJPerM2K | 10000 J/(m2 K) | Thermal mass of interior wall surface layers (gypsum board ~12.5 mm, density ~700 kg/m3, cp ~1,000 J/kg K => ~8,750 J/m2 K). Values not from an opened page. |
| constants.reliability.gpuFailuresPerGpuYear | 0.09076153790509259 per GPU-year | Llama 3 paper: 148 faulty-GPU + 72 HBM3 interruptions over a 54-day snapshot on ~16K H100s under full training load. |
| constants.reliability.gpuReferenceTempC | 70 C | Assumed typical GPU temperature during the Llama 3 training run the failure rate comes from. |
| constants.reliability.psuAfrPct | 1 %/yr | No PSU field failure data found. Assumed. |
| constants.reliability.psuInternalRiseC | 15 C | PSU internal components run above room air; rise at zero load. Assumed. |
| constants.reliability.psuRisePerLoadPct | 0.2 C per % | Extra PSU internal temperature per percent of rated load (20 C more at full load). Assumed. |
| constants.reliability.psuReferenceTempC | 40 C | Internal temperature at which psuAfrPct applies. Assumed. |
| constants.reliability.cpuReferenceTempC | 50 C | CPU temperature at which cpuAfrPct applies. Assumed. |
| constants.reliability.idleGpuFailureFactor | 0.25 fraction | The Llama 3 GPU failure rate was measured at full training load; an idle GPU is assumed to fail at a quarter of that rate, rising linearly with load. |
| constants.reliability.driveOverTempDoublingC | 5 C | Above its rated max operating temperature, a drive failure rate is assumed to double every 5 C. Below it, Backblaze-type field data shows no clear temperature effect, so none is applied. |
| constants.reliability.cpuAfrPct | 0.1 %/yr | No CPU field failure data found. Assumed low. |
| constants.reliability.ramAfrPctPerModule | 0.2 %/yr | No DIMM field failure data found. Assumed. |
| constants.minecraft.msptPerPlayerRef | 1.5 ms/player | Assumed per-player main-thread cost on the reference CPU (Zen 2 at 3.3 GHz single-thread index 3.3). No source. |
| constants.minecraft.msptBaseRef | 5 ms | Assumed idle-world tick cost on the reference CPU. No source. |
| constants.minecraft.refSingleThreadIndex | 3.3 GHz x IPC | Reference CPU for the two numbers above: a Zen 2 core at 3.3 GHz. |
| constants.minecraft.ramGBPerPlayer | 0.3 GB | Minecraft wiki: 10+ players ~4 GB (Server/Requirements); ~0.3 GB/player on top of a 1 GB base. Rough. |
| constants.minecraft.tickScalesWithSimArea | 1 exponent | Per-player tick cost is taken as proportional to the ticked chunk area (2r+1)^2 set by simulation-distance, since that is the area whose entities and chunks the server updates (server.properties description). No measurement of MSPT vs distance was found. Pending sign-off. |
| constants.minecraft.ramScalesWithViewArea | 1 exponent | Per-player RAM is taken as proportional to the loaded chunk area (2r+1)^2 set by view-distance (the world data the server keeps and sends). No measurement found. Pending sign-off. |
| constants.minecraft.optimizedForkTickFactor | 0.7 x | Tick-cost multiplier for the optimized server fork vs vanilla. Its docs say it is designed to greatly improve performance but give no number; Meterstick found its ticks often under 50 ms on farm and TNT workloads where vanilla exceeded it, but no clean ratio. Simplest reasonable value, pending sign-off. |
| constants.virt.cpuTypeHostIsTuned | 1 bool | CPU type "host" passes the real CPU model to the guest, the closest hypervisor setting to the paper's tuned run; the generic default type is mapped to the untuned run. Mapping is an estimate. |
| constants.virt.qcow2IopsFactor | 0.9090909090909091 x | Proxmox wiki: raw is "up to 10% faster" than qcow2; the upper bound is used, so qcow2 gets 1/1.1 of raw. |
| constants.virt.vcpuPerCore | 1 x | Guest CPU speed counts physical cores only (an SMT sibling thread adds no full core). No measurement of SMT gain under VMs found; simplest assumption, pending sign-off. |
| constants.datacenter.simHoursPerRealSecond | 1 h/s | Pending. Datacenter time runs 3600x real time so yearly failure rates (AFR) and daily demand rhythms play out within a session; at 1:1 no part would fail while playing. |
| constants.datacenter.startUtilityW | 20000 W | Pending. Utility feed of the starter site; about one loaded 8-GPU node. |
| constants.datacenter.utilityStepW | 20000 W | Pending. Extra feed per utility upgrade. |
| constants.datacenter.utilityStepUSD | 25000 USD | Pending. Price of one utility feed upgrade. |
| constants.datacenter.coolingStepAch | 20 1/h | Pending. Air changes per hour added by one cooling unit (the room model stands in for CRAC capacity with air changes). |
| constants.datacenter.coolingStepUSD | 15000 USD | Pending. Price of one cooling unit. |
| constants.datacenter.hallMaxC | 32 C | Pending. Hall air above this counts as overheating. ASHRAE A1 allowable inlet upper limit is commonly quoted as 32 C (page not opened). |
| constants.datacenter.nodeInletAch | 1000000 1/h | Each node is evaluated with the hall air as its inlet (huge air changes in its own room model), so the hall temperature, not the node alone, sets its inlet. |
| constants.datacenter.priceUSDPerMTokens | 0.2 USD/Mtok | Pending. What inference customers pay per million generated tokens. |
| constants.datacenter.priceUSDPerPlayerHour | 0.002 USD/player/h | Pending. Game-server customers per player slot per hour. |
| constants.datacenter.priceUSDPerVcpuHour | 0.02 USD/vCPU/h | Pending. VM customers per vCPU per hour. |
| constants.datacenter.electricityUSDPerKWh | 0.12 USD/kWh | Pending. Power bill per kWh at the wall. |
| constants.datacenter.arrivalsPerHourAt50Rep | 0.08 1/h | Pending. New customers per simulated hour at reputation 50, per served workload type. |
| constants.datacenter.growthPerDay | 0.02 fraction/day | Pending. Arrival rate grows 2% per simulated day. |
| constants.datacenter.rhythmAmplitude | 0.3 fraction | Pending. Demand swings +/-30% over a simulated day. |
| constants.datacenter.rhythmPeriodH | 24 h | Pending. Daily demand cycle. |
| constants.datacenter.spikeChancePerHour | 0.01 1/h | Pending. Chance per simulated hour that one customer spikes (goes viral / needs far more). |
| constants.datacenter.spikeMultMin | 2 x | Pending. Spike size, lower bound. |
| constants.datacenter.spikeMultMax | 5 x | Pending. Spike size, upper bound. |
| constants.datacenter.spikeHoursMin | 6 h | Pending. Spike length, lower bound. |
| constants.datacenter.spikeHoursMax | 24 h | Pending. Spike length, upper bound. |
| constants.datacenter.inferenceSizeMin | 20 tok/s | Pending. Inference customer size, lower bound (aggregate tokens per second). |
| constants.datacenter.inferenceSizeMax | 300 tok/s | Pending. Inference customer size, upper bound. |
| constants.datacenter.gameSizeMin | 5 players | Pending. Game-server customer size, lower bound. |
| constants.datacenter.gameSizeMax | 40 players | Pending. Game-server customer size, upper bound. |
| constants.datacenter.vmSizeMin | 2 vCPU | Pending. VM customer size, lower bound. |
| constants.datacenter.vmSizeMax | 16 vCPU | Pending. VM customer size, upper bound. |
| constants.datacenter.vmRamGBPerVcpu | 4 GB/vCPU | Pending. RAM a VM customer takes per vCPU. |
| constants.datacenter.vmIopsPerVcpu | 500 IOPS/vCPU | Pending. Disk IOPS a VM customer uses per vCPU. |
| constants.datacenter.vmOvercommit | 2 vCPU/thread | Pending. vCPUs the site sells per host thread. |
| constants.datacenter.netBitsPerToken | 32 bit/token | Pending. Network traffic per generated token (text plus framing). |
| constants.datacenter.netKbpsPerPlayer | 100 kbit/s | Pending. Network traffic per game player. |
| constants.datacenter.netMbpsPerVcpu | 50 Mbit/s | Pending. Network traffic per VM vCPU. |
| constants.datacenter.onboardNicGbps | 1 Gbit/s | Pending. A node with no network card in its build gets one onboard 1 GbE port. |
| constants.datacenter.slowAbove | 1 fraction | Pending. Utilization above 100%: service is slow and pay drops to 1/utilization. |
| constants.datacenter.churnAbove | 1.25 fraction | Pending. Utilization above 125% for churnAfterH hours: customers start leaving. |
| constants.datacenter.churnAfterH | 6 h | Pending. Hours of heavy overload before a customer leaves (then one more every churnAfterH hours). |
| constants.datacenter.reputationStart | 50 points | Pending. Reputation 0-100; arrivals scale with reputation / 50. |
| constants.datacenter.reputationGainPerHour | 0.1 points/h | Pending. Reputation gained per hour when every workload is at or under 100%. |
| constants.datacenter.reputationLossPerChurn | 3 points | Pending. Reputation lost each time an overloaded customer leaves. |
| constants.datacenter.historyPoints | 240 points | Pending. Hours of history kept for the dashboard graph. |
| constants.datacenter.inferenceConcurrency | 32 sequences | Pending. Concurrent sequences an inference node is set up for when sizing its capacity. |
| constants.datacenter.inferenceContext | 8192 tokens | Pending. Context each inference node is set up for. |
| constants.datacenter.upsUnitUSD | 900 USD | Pending. No price on the opened listing; assumed for a 1 kW rack UPS. |
| constants.datacenter.powerCutMeanMin | 80 min | EIA: interruptions outside major events average about two hours per year; at 1.5 per year that is about 80 minutes each. Major-event outages (9 h in 2024) are not modeled. Pending. |
| constants.datacenter.powerCutRepLoss | 2 points | Pending. Reputation lost when the site goes dark. |
| constants.datacenter.snapshotUSDPerTBMonth | 6.95 USD/TB/month | Pending. Snapshot space priced like the offsite copy (extra disk for changed blocks). |
| constants.datacenter.siteLossPerYear | 0.01 1/yr | Pending. Chance per year of losing the whole site (fire, flood). No data found. |
| constants.datacenter.badChangePerNodeYear | 0.5 1/yr | Pending. Chance per node-year that a bad change (wrong delete, broken upgrade) destroys its data. |
| constants.datacenter.dataLossRepLoss | 10 points | Pending. Reputation lost per data-loss event. |
| constants.datacenter.offsiteIntervalH | 24 h | Pending. One offsite copy per day (nightly backups are the common practice; the Proxmox backup docs set no default schedule, opened 2026-10-01). |
| constants.datacenter.offsiteRestoreGbps | 1 Gbit/s | Pending. Internet link the offsite copy is restored over; the restore runs at the slower of this and the node's network. |
| constants.difficulty.easy.slack | 1.15 x | User-approved: easy = 15% easier. Job slack around the reference build x1.15. |
| constants.difficulty.easy.feeMult | 1.15 x | User-approved: client fee x1.15 on easy. |
| constants.difficulty.easy.failureMult | 0.85 x | User-approved: failure rates x0.85 on easy. |
| constants.difficulty.easy.dataLossPenalty | 0.085 fraction of money | User-approved: data-loss penalty 8.5% of money on easy. |
| constants.difficulty.easy.angryPenalty | 0 fraction of money | User-approved: no angry-client penalty on easy. |
| constants.difficulty.easy.demandMult | 0.85 x | User-approved: datacenter demand growth and spike chance/size x0.85 on easy. |
| constants.difficulty.easy.patienceMult | 1.15 x | User-approved: overload patience x1.15 on easy (6 h -> 6.9 h). |
| constants.difficulty.normal.slack | 1 x | User-approved: normal is the baseline. |
| constants.difficulty.normal.feeMult | 1 x | User-approved: normal is the baseline, no change. |
| constants.difficulty.normal.failureMult | 1 x | User-approved: normal is the baseline, no change. |
| constants.difficulty.normal.dataLossPenalty | 0.1 fraction of money | User-approved: data-loss penalty 10% of money on normal. |
| constants.difficulty.normal.angryPenalty | 0 fraction of money | User-approved: no angry-client penalty on normal. |
| constants.difficulty.normal.demandMult | 1 x | User-approved: normal is the baseline, no change. |
| constants.difficulty.normal.patienceMult | 1 x | User-approved: normal is the baseline, no change. |
| constants.difficulty.hard.slack | 0.7 x | User-approved: hard = 30% harder. Job slack around the reference build x0.70. |
| constants.difficulty.hard.feeMult | 0.7 x | User-approved: client fee x0.70 on hard. |
| constants.difficulty.hard.failureMult | 1.3 x | User-approved: failure rates x1.30 on hard. |
| constants.difficulty.hard.dataLossPenalty | 0.13 fraction of money | User-approved: data-loss penalty 13% of money on hard. |
| constants.difficulty.hard.angryPenalty | 0.15 fraction of money | User example from the brief: on hard, an unhappy client takes 15% of the money the player has. |
| constants.difficulty.hard.demandMult | 1.3 x | User-approved: datacenter demand growth and spike chance/size x1.30 on hard. |
| constants.difficulty.hard.patienceMult | 0.7 x | User-approved: overload patience x0.70 on hard (6 h -> 4.2 h). |

479 hand estimates. Plus 30 fitted engine constants (see data-dev/fitted-perf.js and docs/calibration.md).
