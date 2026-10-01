# Decisions log

Every decision the user made after the brief (`docs/design-plan.md`). Newest at the bottom. Where this log and the brief differ, this log wins.

## 2026-09-30: first question round (before stage 0)

- **Tech:** left to Claude ("use wtv u want, go all out"). Chosen: Vite + React, plain JavaScript (JSX, no TypeScript, since JavaScript is locked). Vitest for tests. The simulation engine uses no framework.
- **Devices:** desktop only. No phone layout.
- **Catalog size:** lean, about 6-10 parts per category, covering consumer, workstation and datacenter tiers. Claude compiles it from spec sheets and reviews with a source on every value. The user reviews it before it's locked.
- **Missing data:** when a real number can't be found, use a theoretical estimate with written reasoning, tag it `estimate`, keep going, and list every estimate in the stage report for sign-off. Anything the user rejects gets swapped out.

## 2026-09-30: plan review (stages 0-3 approved, with changes)

1. **Inference math.** Model layer split and CPU offload (devices take turns, so their times add) separately from tensor parallelism (devices work at the same time, so the time is the slowest device's shard plus the all-reduce cost). Never add up per-device times for TP. There must be a test showing 2 identical GPUs in TP are faster than 1 but not a perfect 2x.
2. **No real names in the shipped bundle.** `realRef` and any real product names stay in dev-only files that are stripped at build time. The in-game "where this number comes from" display uses generic source labels. The build searches `dist/` for real brand names and fails on a hit.
3. **Cloud/VM hosting is a workload** alongside inference and Minecraft. Research the real settings, and bring it to the checkpoint questions. Don't invent a model for it.
4. **Reporting.** Don't report the example job as generated end to end, or difficulty as working, until stages 4 and 10 exist.

## Brand check allowlist

Real names allowed in `dist/`. Each entry needs the user's decision recorded above.

- Inference engine names: llama.cpp, vLLM, SGLang (decision 2026-09-30, checkpoint round)
- Open model family and model names in the catalog: Llama, Qwen, Mistral, gpt-oss (and their full model names) (decision 2026-09-30, checkpoint round)
- Company names stay denied even where they are part of a model's name (Meta, OpenAI, Mistral AI as a company are not shown).
- 2026-09-30 (Part 0b, 30 models): allowed model family terms added for the new models: Qwen3.5, Qwen3.6, Qwen3.8, Llama-3.2, Llama-4, Ministral, phi-4, Phi, gemma-4, Gemma, GLM (GLM-4.5-Air, GLM-4.7-Flash, GLM-5.3), MiniMax (MiniMax-M2.7), DeepSeek (DeepSeek-V3.2), MiniCPM (MiniCPM5), plus every full model name (realRef). Where the company and the model brand share a word (DeepSeek, MiniMax, Mistral) the word is allowed only because it is the model name; the company forms stay denied: DeepSeek AI, deepseek-ai, MiniMax AI, MiniMaxAI, Mistral AI, mistralai, Google, Microsoft, Alibaba, Zhipu, Z.ai, zai-org, OpenBMB, ModelBest, Moonshot, Meta Platforms, Meta AI, meta-llama.
- The bare word "Meta" is not on the denylist: React's bundled keyboard-key table contains the string "Meta" (the Meta key), a false positive. "Meta Platforms", "Meta AI" and "meta-llama" are denied instead.

## 2026-09-30: models (parked)

- The user wants **all the latest popular open-source models** in the game, researched from Hugging Face and current trends, not from memory. Then they said to park it and finish the current work first.
- For now the model list stays the benchmark-backed set used for calibration. The latest-models expansion is a checkpoint item. The raw HF snapshot is in `docs/research/models-hf-snapshot-2026-09-30.md`.

## 2026-09-30: checkpoint round after stage 3 (first answers)

- **Calibration tolerance:** median |error| <= 25% and worst case <= 60%, over the held-out (`check`) benchmark cases. `npm run calibrate` reports pass/fail against it.
- **Near misses:** partial credit. Missing a target (e.g. 18 tok/s vs 20) lowers the score in proportion. It doesn't make the client angry unless a hard limit fails (doesn't fit, power, overheating). The exact formula is still an open question.
- **Real names:** models and inference engines use their real names in the game. Hardware keeps fake brand names (locked decision).
- **Tensor parallel:** add a per-layer TP synchronization overhead term, tagged as an estimate and **not fitted** to the one arXiv measurement. Keep hunting for more TP benchmarks (especially small models over PCIe). The user asked what that measurement used: Qwen2.5-32B-Instruct BF16, vLLM v0.9.2, 4x A100 80GB SXM, "NVLink pairs, PCIe across pairs", chat workload with 64 input / 128 output tokens.

## 2026-09-30: stage 4-5 question round (scoring, near misses, job types, after delivery)

- **Scoring:** weighted average. Each axis (performance, budget, power, noise, temperature) scores 0-100; the client's priority weights set how much each counts. Hard fails (won't fit, over the PSU/PDU, overheats, bad config) cap the total.
- **Near misses and bonuses:** linear partial credit from 100 at the target down to 0 at a floor (e.g. 18 of 20 tok/s = 50 with the floor at 80% of target). Small capped bonuses for coming in under budget and under the power limit (up to +10% payout combined).
- **Job types at launch:** inference, Minecraft server, and mixed (both on one box). Fairness: the generator builds a reference build from the catalog for every roll and only keeps the job if that build passes every target within budget. No cloud/VM jobs yet (no model built for it).
- **After delivery:** the stress test is final. Once it passes and the player is paid, the job is done for good.

## Game-design values picked by Claude, pending sign-off

The user chose "keep, log for sign-off" (2026-09-30, stage 4-5). These are game-design picks, not measurements. Only the 80% performance floor and the +10% combined bonus cap come from an option the user picked; the Minecraft 20 TPS target is sourced (minecraft.wiki: Tick). Everything else below needs the user's sign-off.

**Scoring** (`SCORING`, `src/jobs/score.js`)
- `perfFloor` 0.8: performance scores 0 at 80% of the target (user-picked option).
- `overFloor` 1.2: budget and power score 0 at 120% of the limit.
- `noiseFloorDB` 6: noise scores 0 at 6 dB over the limit.
- `tempFloorC` 5: room temperature scores 0 at 5 C over the limit.
- `budgetBonusMax` 0.06 and `powerBonusMax` 0.04 (+10% combined, user-picked cap; the 6/4 split is Claude's).
- `bonusFullAt` 0.3: the bonus is full at 30% under the limit.
- `hardFailCap` 25: a hard fail caps the score at 25, and the payout is 0.
- Satisfaction bands: 90 delighted, 75 happy, 50 satisfied, 25 disappointed, below that angry; "rejected" on a hard fail.
- Payout multiplier = score/100 x (1 + bonus). XP multiplier = score/100.

**Job generation** (`GEN`, `src/jobs/generate.js`)
- `perfTargetOfRef` [0.75, 0.95]: performance target = reference build result x this.
- `powerLimitOfRef` [1.1, 1.35]: wall power limit = reference draw x this (rounded up to 50 W).
- `noiseLimitOverRefDB` [2, 6]: noise limit = reference level + this (only for clients with noise weight > 0).
- `tempLimitOverRefC` [1, 3]: room temperature limit = reference room temp + this.
- `budgetOfRefCost` [1.1, 1.4]: budget = reference build cost x this.
- `feeOfBudget` [0.12, 0.2]: payout = budget x this.
- `baseXp`: homelab 100, server 300, datacenter 1000.
- `maxTries` 12 rolls before the generator gives up.
- Reference build pick: random among passing candidates sorted by cost, index = n x u^2 (weighted toward cheap).

**Workloads per tier** (`WORKLOAD`, `src/jobs/generate.js`)
- Homelab: model weights <= 40 GB (smallest quant), contexts 4k/8k/16k/32k, concurrency 1/1/2, 4-30 players.
- Server: weights <= 300 GB, contexts 8k/32k/64k, concurrency 1/4/8, 20-120 players.
- Datacenter: native (FP8/MXFP4/BF16) weights >= 60 GB, contexts 8k/32k/128k, concurrency 16/32/64/128, no game servers.

**Clients** (`CLIENTS`, `src/jobs/clients.js`). Priority weights in percent: performance / budget / noise / power / temperature.
- Homelab: Hobbyist tinkerer 35/35/15/5/10 (inference, mixed); Remote worker 25/20/35/10/10 (inference); Student on a budget 25/50/10/10/5 (inference, game server); Gaming group host 40/30/10/10/10 (game server, mixed).
- Server: Small law office 25/25/20/15/15 (inference); Game server host 45/25/5/15/10 (game server, mixed); AI startup 50/20/5/15/10 (inference, mixed).
- Datacenter (noise not judged): Research lab 50/25/0/15/10; Inference provider 40/20/0/30/10; University cluster 35/40/0/15/10 (all inference).

## 2026-09-30: calibration tolerance round (after stage 5)

- **Set E** (the arXiv vLLM TP point): reference-only, not counted toward the tolerance. It contradicts sets G/H, and fitting to it was already ruled out.
- **Rows from older engine builds:** reference-only, with the build and reason stored on each row (`refReason`). Applied to: XD Q4_K_M prefill rows (llama.cpp before PR #8075, a different code path; XD decode and F16 prefill rows use the same path in both eras and stay counted), set G (vLLM 0.7.3), set H (vLLM <= 0.8.2 by publish date). Note: Claude scoped the XD part to the rows whose code path changed, not every XD row; flag it if you wanted all of XD out.
- **`B-l40s-8bf16-pp`:** data outlier, reference-only.
- **Fix method:** research + model fix. Added `prefillTokenLayerOverheadUs` (fitted) and made `stageHandoffUs` a fitted engine constant (was an assumed 30 us). To fit the handoff cost, Claude promoted the two 2-GPU XD rows (`B-3090x2-8b`, `B-4090x2-8b`) from check to fit, since no multi-GPU fit row existed. Flag it if you'd rather keep those held out. Details in `docs/calibration.md`.
- **Result:** held-out median 11.4%, worst 50.7%, **PASS**.

## 2026-10-01: stage 6-7 question round

- **Stress test speed:** runs at 60x (one real minute per simulated hour) with live gauges (temperatures, watts, noise, throttling) and a Skip button that jumps to the result. A failure stops at its exact simulated time.
- **Levels:** XP to reach level n = 250 x (n-1)^2 (L2 250, L3 1000, L4 2250, L5 4000). Gates: L1 homelab tier with inference and game-server jobs; L2 server tier; L3 mixed and cloud/VM jobs; L4 datacenter tier; L5 personal datacenter (stage 9). The browser and config apps are never gated; parts never are.
- **Cloud/VM jobs:** VM fleet. The client asks for N VMs with vCPUs, RAM and disk each, a maximum vCPU overcommit ratio, and per-VM CPU and disk IOPS targets. RAM is never overcommitted (hard fail). Judged on those plus budget, power, noise and temperature.
- **Config apps:** game server = view-distance, simulation-distance (3-32, default 10) and server software (vanilla / optimized fork). OS picker = compatibility only (vLLM and SGLang need Linux; VMs need the hypervisor OS). No OS speed modifier.
- **After delivery:** already decided (stress test is final); not asked again.
- **Names:** "real names if relatively safe, else fake; tell me which". Claude's call after reading both policies (docs/research/software.md): **Proxmox VE real** (referential use matches its trademark rules; "Proxmox Server Solutions" stays denied), **the block-building game stays fake** (Mojang's guidelines exclude commercial use for unrelated products), so its server fork is "Optimized fork" (PaperMC denied). Linux and Windows are plain OS names. Mojang added to the denylist.

### Stage 6 values picked by Claude, pending sign-off
Simplest reasonable values where the user's answers and the research left a number open:
- Game server tick cost per player scales with the ticked area ((2 x simulation-distance + 1) / 21)^2; RAM per player with ((2 x view-distance + 1) / 21)^2 (`minecraft.tickScalesWithSimArea`, `ramScalesWithViewArea`, both exponent 1). No measurement of MSPT or RAM vs distance found. The existing per-player MSPT and base MSPT stay as they were (estimates, still the weakest part of the sim; no better data found).
- Optimized fork tick cost x0.7 (`minecraft.optimizedForkTickFactor`). Meterstick and the fork's docs give no number.
- Game-server clients ask for view and simulation distance of at least the published default 10 (`GAME_SERVER_DISTANCE` in src/jobs/generate.js).
- CPU type "host" maps to the paper's tuned run (-2%), the default generic type to the untuned run (-17%) (`virt.cpuTypeHostIsTuned`). qcow2 gets 1/1.1 of raw IOPS (the wiki's "up to 10%" upper bound).
- VM CPU share counts physical cores only (`virt.vcpuPerCore` 1); overcommit ratio counts host threads.
- Cloud workloads (`WORKLOAD.*.vms` in src/jobs/generate.js): homelab 2-6 VMs, 2/4 vCPU, 4/8 GB, 32/64 GB disk; server 8-24 VMs, 2/4/8 vCPU, 8/16 GB, 64/128 GB disk; max overcommit 2 or 4. No datacenter-tier cloud jobs (the datacenter reference builds are GPU nodes).
- Cloud clients: "Hobbyist tinkerer" and "Small law office" also take cloud jobs; new "Small VPS host" (server tier, performance 40 / budget 30 / noise 5 / power 15 / temperature 10).
- VM targets: per-VM CPU and IOPS targets = reference result x `GEN.perfTargetOfRef` (same slack as inference), CPU rounded to 0.1 reference cores, IOPS to 1000.
- On the hypervisor OS only VM hosting is simulated (inference or game servers there are a config error), since GPU passthrough inside VMs isn't modeled.
