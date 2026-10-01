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

### Stage 7 values picked by Claude, pending sign-off
- Starting money 0 (`newPlayer` in src/game/player.js). Parts are paid from the client's budget, so the player's money is only fees earned.
- Replacing a part that failed in the stress test costs nothing extra: "Replace it" marks it fixed, then the whole test reruns from 0 with a new seed (`job.seed x 1000 + attempt`).
- XP per delivery = job xp x score/100 rounded; money = payout x payoutMultiplier rounded (existing SCORING rules).
- The stress test is computed in full when started and then played back at 60x (one sample per simulated minute, one per real second). Same results as running it live, since the sim is deterministic per seed.
- Delivered jobs leave the board; the board rerolls when the level changes (new tiers/types unlock).

## 2026-10-01: stage 8 question round (saving)

- **Job board on reload:** the rolled jobs are saved as they are (full job objects). A job whose model or reference parts no longer exist is dropped on load and the player is told.
- **Economy (logged, not built):** the client's budget pays for parts, the fee is the player's profit, starting money stays $0. Money is what the player spends on the level 5 personal datacenter and what the hard-mode penalty takes.
- **Save slots:** one save with a New game button (asks to confirm and offers an export first).

### Stage 8 values picked by Claude, pending sign-off
- Autosave 500 ms after any change, every 15 s for the play clock, and on tab close (`AUTOSAVE_DEBOUNCE_MS`, `PLAYED_SAVE_EVERY_MS` in src/App.jsx).
- Play clock: 1 s ticks, each adds at most 2 s (`MAX_TICK_S` in src/save/clock.js), so a sleeping laptop or throttled background tab adds no time away.
- Save checksum is FNV-1a: it catches corruption and hand edits, but anyone can recompute it, so it is not tamper-proof.
- An unreadable save (corrupt, unknown version) is never overwritten: the game runs unsaved until the player picks New game or imports, and can export the old raw save.
- Two tabs: the tab opened later stops saving and warns; it has a "Use this tab instead" button that hands saving over to it.

## 2026-10-01: stage 9 personal datacenter (no question round: Claude's design, approved by the user)

All of the following are **pending sign-off**.

**Approved design (user):** unlock at level 5 (4000 xp), parts never locked. Sells AI inference, game servers and VMs; customers appear and use capacity, no contracts. The player buys the hardware with their own money (until now money was only job profit). Start with a small rack and grow by buying racks, nodes, power and cooling; limits are money and the room's power and cooling. Passive income from customers. Demand grows slowly with a rhythm plus seeded random spikes. Overload in stages: slower service and lower pay first, then customers leave and reputation drops; reputation sets how many new customers show up. Failures in real time from durability.js, with alerts, degraded service until replaced, and replacement costs money (stage 9b). Data loss with nothing protecting it costs money scaled by difficulty (hard example: 15% of current money); difficulty is passed through but not implemented until stage 10. Backups: RAID, snapshots, offsite copy, UPS, each against its own failure (stage 9b). Time only passes while the tab is open and visible; a hidden tab pauses the datacenter; no catch-up.

**Stage 9a values picked by Claude** (all in `data-dev/constants.js` → `datacenter`, each tagged estimate with a "Pending" reasoning string; pointer comment above the block):
- Time scale: 1 real second = 1 simulated hour (`simHoursPerRealSecond`), so yearly failure rates and daily rhythms happen within a session. The play clock (stage 8) now also stops while the tab is hidden.
- Site: opening costs one 42U rack + one PDU at catalog prices; hall = the data-hall room archetype at its minimum size. Utility feed starts at 20 kW, +20 kW per $25,000 upgrade; a cooling unit adds 20 air changes per hour for $15,000; hall air limit 32 C (`hallMaxC`, ASHRAE A1 allowable as commonly quoted, page not opened).
- Nodes: the job generator's reference builds (server tier with or without GPUs, datacenter GPU nodes), priced by `buildCost`; rack space from each chassis' rack units. Template nodes have only an onboard 1 GbE port (`onboardNicGbps`); catalog network cards can be added.
- Node capacity: inference = `evaluateBuild` aggregate tok/s at the largest concurrency up to 32 that fits (`inferenceConcurrency`), 8k context (`inferenceContext`); game = servers (one per 3 cores, published) x players per server at 20 TPS, also limited by RAM; VMs = threads x 2 vCPUs (`vmOvercommit`), RAM minus the hypervisor reserve, IOPS from the VM model.
- Power and temperatures between idle and full load are linear in utilization between two `evaluateBuild` runs (approximation). Each node is evaluated with the hall air as its inlet.
- Customers: sizes 20-300 tok/s, 5-40 players, 2-16 vCPUs (4 GB and 500 IOPS per vCPU); arrivals 0.08/h per served workload at reputation 50, scaled by reputation/50, growing 2%/simulated day; daily rhythm +/-30%; spikes 1%/h, x2-5 for 6-24 h.
- Prices: $0.20 per million tokens, $0.002 per player-hour, $0.02 per vCPU-hour; electricity $0.12/kWh.
- Network per unit: 32 bit per token, 100 kbit/s per player, 50 Mbit/s per vCPU.
- Overload: above 100% service is slow and pay drops to 1/utilization; above 125% for 6 h the biggest customer of that workload leaves and reputation drops 3, repeating every 6 h; reputation 0-100, starts 50, +0.1/h while everything is at or under 100%. Network saturation counts as overload too.
- A site power shortfall (utility feed or a rack's PDUs) holds every node back proportionally.
- History graph keeps the last 240 simulated hours.
- Save version 2: the first real migration (v1 -> v2 adds `datacenter: null`).

**Stage 9b values picked by Claude** (also in `constants.datacenter`, pending):
- Each protection covers only its own failure (per the approved design): RAID a drive dying, snapshots a bad change, the offsite copy losing the site, a UPS a power cut for its runtime. In reality an offsite copy also restores after a lost array (after a restore delay); that is not modeled.
- RAID levels none/1/5/6/10 with minimum drives 1/2/3/4/4 and tolerated failures 0/1/1/2/1; with one failure tolerated, a drive death also rolls the rebuild read-error risk from the datasheet URE rate (published formula, tagged rates). Usable space: RAID1 one drive, RAID5 n-1, RAID6 n-2, RAID10 n/2 (of the smallest drive).
- A dead GPU, CPU, RAM or PSU takes the node down until replaced (layer split and tensor parallel need every GPU); a dead fan only raises an alert. Replacement costs one unit of that part at catalog price. A node whose data was lost comes back empty once its drives are replaced.
- UPS: 1 kW units at $900 each (no price on the opened page); runtime is a power law through the two published points; several units share the load evenly; a cut longer than the runtime darkens the site for the remainder of that hour and costs 2 reputation.
- Power cuts 1.5 per year (EIA 2024), lasting on average 80 min (exponential), derived from the ~2 h/yr outside major events. Major events are not modeled.
- Bad changes 0.5 per node-year; site loss 0.01 per year (no data found).
- Data loss: penalty = fraction of the player's current money (easy 5%, normal 10%, hard 15% per the user's example), reputation -10, and the biggest customer of that workload leaves. Difficulty is passed in as 'normal' until stage 10.
- Snapshots cost like offsite storage ($6.95/TB/month of the node's usable data); offsite is billed on all usable data.

## 2026-10-01: stage 10 question round (difficulty, time scale)

- **Difficulty table (approved as proposed),** read through one function (`src/game/difficulty.js`, values in `constants.difficulty`). Job limits scale the slack around each job's reference build, so hard jobs stay provably solvable:
  - performance target (ref x [0.75,0.95]): easy x[0.71,0.94], hard x[0.83,0.97]
  - power limit (ref x [1.10,1.35]): easy [1.12,1.40], hard [1.07,1.25]
  - noise limit (ref +[2,6] dB): easy +[2.3,6.9], hard +[1.4,4.2]
  - room temperature limit (ref +[1,3] C): easy +[1.15,3.45], hard +[0.7,2.1]
  - budget (ref cost x [1.10,1.40]): easy [1.12,1.46], hard [1.07,1.28]
  - client fee: easy x1.15, hard x0.70
  - failure rates (stress test and datacenter parts, bad changes, power cuts, site loss): easy x0.85, hard x1.30
  - data-loss penalty: easy 8.5%, normal 10%, hard 13% of money (replaces the stage 9 picks of 5/10/15%)
  - angry-client penalty (brief example): hard only, 15% of money when a client is angry or rejects the delivery
  - datacenter demand growth and spike chance/size: easy x0.85, hard x1.30
  - overload patience before customers leave (6 h): easy 6.9 h, hard 4.2 h
- **Scope:** difficulty applies to client jobs and the personal datacenter.
- **When:** chosen at New game and locked for that save. Saves from before stage 10 load as normal (save version 3 migration).
- **Datacenter time scale:** stays at 1 real second = 1 simulated hour, as a **deliberate, logged exception** to the locked "time runs in real time" decision. It applies only to the personal datacenter; client jobs, the stress test (60x by the stage 7 decision) and the play clock are unchanged.
- **Example job (written item, unanswered):** Claude's stated default applied: 262,144 tokens added to the homelab context menu (only for models that support it natively). Pending sign-off.

### Stage 10 values picked by Claude, pending sign-off
- Offsite copy: one copy every 24 h (`offsiteIntervalH`; the Proxmox backup docs set no default schedule), restored over a 1 Gbit/s internet link or the node's own network if slower (`offsiteRestoreGbps`). It now restores after **any** data loss (drive or array death, failed rebuild, bad change without snapshots, site loss): the node is down for data size / link speed, and the changes since the last copy are lost. The penalty and reputation hit scale with (hours since the last copy / 24 h), capped at a full loss. Without an offsite copy, data loss stays total. The copy itself is treated as instant, and its upload time isn't modeled.
- **Example job result (stage 10b):** with 262,144 in the homelab menu, the real generator rolls the brief's example. Seed 928 (homelab, level 3) is a mixed job: block-game server (11 players) plus Ministral-3-8B at 262,144 context, 29 tok/s target, 800 W limit, 35 dBA noise limit, in a closet. Its reference build scores 100 (test in tests/jobs.test.js). Over 1,690 homelab rolls, 333 were mixed, 19 had 262k context, and 3 met every condition. All three used an 8B model: no 30B-class model fits the homelab 40 GB weight limit at 262k context within the generated budgets.
- **All pending values are consolidated in `docs/signoff.md`** (economy, demand, failures, penalties, difficulty, jobs, sim estimates, plus the generated estimate appendix).

## 2026-10-01: real hardware names (replaces the fake-hardware-names decision)

- **All hardware shows its real product name** (GPUs, CPUs, RAM, storage, PSUs, fans, coolers, network, cases, racks, nodes, PDUs). This **supersedes** the locked brief decision "real hardware specs with fake brand names" and the stage 2 rule that hardware names stay dev-only. Do not switch them back.
- Names live in one map, `data-dev/hardware-names.js` (part id -> name), cleaned from each part's realRef. **Part ids are unchanged** (`gpu-ember-g4-24` etc.), so saves keep loading. No simulation change.
- Generic realRefs (price-tracker baskets) get a plain description with no brand: `ram-sprint-2x16-d5` "DDR5-6000 CL30 32GB (2x16GB) kit", `ram-sprint-2x32-d5` "DDR5-6000 64GB (2x32GB) kit", `ram-rack-32-d4-2933` "DDR4-2933 32GB ECC RDIMM". The DGX entries are modeled as barebones equivalents, so they show as "NVIDIA DGX A100-class 8-GPU node" (and H100/H200, B200, B300); the DGX PSUs show as "NVIDIA DGX ... PSU module".
- **Still blocked by the brand check:** Mojang, Microsoft, Minecraft (the game stays "block-building game"), PaperMC (the fork stays "Optimized fork"), Proxmox Server Solutions, Hugging Face, and the model-company names (OpenAI, Google, Meta AI, Alibaba, ...). Model and engine names stay allowed as before. Hardware brand terms were removed from `data-dev/brand-denylist.json`; `deniedTerms()` only adds model/engine realRefs.
- No logos or brand imagery. Footer: "Five Nines is an independent fan project, not affiliated with or endorsed by any hardware company. All trademarks belong to their owners."
