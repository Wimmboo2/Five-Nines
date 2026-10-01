# Five Nines: session handoff (2026-09-30)

> **Update 2026-10-01 (after tuning pass 1): real hardware names.** All hardware now shows real product names (map in `data-dev/hardware-names.js`, ids unchanged); the brand check only blocks Mojang/Microsoft/Minecraft/PaperMC/Proxmox Server Solutions/Hugging Face and model-company names. Trademark footer in the app. This replaces every "hardware keeps fake names" statement below (decisions.md, 2026-10-01). PR: Wimmboo2/Five-Nines#1.
>
> **Update 2026-10-01 (final): stage 10 is done** (commits "Stage 10a" and "Stage 10b"). All 10 stages of the build order exist. This block is the current state; §2-§10 below describe the project before stage 6.
>
> - **Difficulty:** `src/game/difficulty.js` + `constants.difficulty` (user-approved table), picked at New game, locked per save (save v3). Applies to jobs and the datacenter.
> - **Offsite copy** restores after any data loss with downtime and a partial loss since the last daily copy.
> - **Brief's example job** is reachable through the generator (seed 928, homelab, level 3; test in tests/jobs.test.js).
> - **Sign-off:** every pending value is in `docs/signoff.md`.
> - **Verified in the browser (Playwright, 2026-10-01):**
>   - new game on easy/hard/normal;
>   - 15 jobs played through the real UI from level 1 to 5 (all scored 100);
>   - datacenter opened, 3 nodes, offsite, 2 UPS, 3 real minutes of natural customers and churn, reload mid-run restored exactly;
>   - a natural stress-test part failure (attempt 7056 of an 8-GPU datacenter job) stopped the test, Replace, rerun from 0:00, passed;
>   - no console errors (favicon fixed).
> - **Acceptance checks (docs/design-plan.md):**
>   - **all 13 passing,** with these caveats:
>     - the stress test is computed and then played back;
>     - the datacenter clock is a logged 3600x exception to the real-time rule;
>     - natural datacenter part failures were shown headless (40,000 simulated hours) rather than in the 3-minute browser run.
> - **Untuned:** everything in signoff.md.
> - **Known weak:**
>   - game-server tick model (no measurement);
>   - datacenter economics: payback is slow next to level 4-5 job fees; reputation collapses under constant overload.
> - **Next:** the user's sign-off pass and playtesting.
>
> **Update 2026-10-01 (latest): stage 9 is done** (commits "Stage 9a..." and "Stage 9b..."). Personal datacenter in `src/dc/` (`model.js` node capacity from evaluateBuild, `datacenter.js` state/purchases/hourly step, `failures.js` RAID/UPS/penalty/part failures, `clock.js` visible-only time), dashboard `src/ui/Datacenter.jsx`, Datacenter tab gated at level 5. Save version 2 (first migration). Every game-design number is in `constants.datacenter`, tagged pending and listed in decisions.md. Next: stage 10 (difficulty + full playthrough), which needs its own question round; the datacenter already takes a `difficulty` option for the data-loss penalty.
>
> **Update 2026-10-01 (later): stage 8 is done** (commit "Stage 8: localStorage saves"). `src/save/` (save.js format + checksum + migrations + pruning, storage.js try/catch wrapper, tabs.js second-tab detection, clock.js play clock), `src/game/state.js` (whole game state, `toSaveData`, `restoreRun`), `src/ui/SaveBar.jsx` (export/import/new game, banners). All game state in `src/App.jsx` is one object that autosaves. Economy answer logged (client pays parts, fee is profit, $0 start). Next: stage 9 (personal datacenter, backups), stage 10 (difficulty).
>
> **Update 2026-10-01: stages 6 and 7 are done** (commits "Stage 6: in-game browser, config apps, cloud/VM sim" and "Stage 7: stress test, delivery, payout, xp, levels"). This note is current where it disagrees with §2-§10 below, which describe the state before stage 6.
>
> - **Stage 6:** Software tab with four config apps (OS, inference, game server, VMs), every setting fed into `evaluateBuild`; Browser tab with 8 guide pages (`src/content/pages.js`, sources in `docs/research/software.md`); `src/sim/vm.js` (VM fleet on KVM); game-server distances + server software in `src/sim/gameserver.js`; OS compatibility in `src/sim/evaluate.js`; cloud job type and level gates in `src/jobs/` (`levels.js`, `generate.js`); `defaultSoftware` became the generator-only `referenceSoftware`. Calibration (stage 3 follow-up) passes: held-out median 11.4%, worst 50.7%.
> - **Stage 7:** `src/game/player.js` (money/xp/level in memory), `src/game/flow.js` (stress run keyed to build+software, delivery gate), `src/ui/StressTest.jsx` (60x playback with live gauges, Skip), `src/ui/DeliveryResult.jsx`, top-bar money/level, locked-features note.
> - **Names:** Proxmox VE shown by name; the block-building game stays fake; its server fork is "Optimized fork".
> - **Pending sign-off:** all values under "Stage 6 values..." and "Stage 7 values..." in `docs/decisions.md`, plus the older game-design list.
> - **Next:** stage 8 (localStorage saves), stage 9 (personal datacenter, backups), stage 10 (difficulty). Each needs its own question round.
> - **Known gaps:** no datacenter-tier cloud jobs; GPU passthrough into VMs not simulated; game-server tick costs are estimates; the stress test is precomputed then played back.


Tags used below:
- **[V]** = verified this session: I ran it or opened the source.
- **[U]** = unverified: from memory, a search snippet, or inferred.

## 1. Project Overview

Five Nines is a 2D browser game (JS, desktop only) with a job loop like PC Creator. The player:
1. takes client jobs (homelab, server, mini datacenter);
2. buys hardware and configures the software stack;
3. delivers the build.

The depth is a simulation driven by real hardware specs (fake brand names in game). It covers:
- memory fit and inference speed;
- power, thermals and noise;
- durability;
- game-server load.

Documents:
- `docs/design-plan.md` is the original brief (build order: stages 0-10).
- `docs/decisions.md` logs every user decision. It overrides the brief where they differ.

## 2. Current State

### Done and verified [V]
- **Stage 0 (setup):** Vite + React, plain JS, Vitest.
- **Stage 1 (research):** notes in `docs/research/*.md`.
- **Stage 2 (data layer):**
  - dev data with provenance in `data-dev/`;
  - generated game data with realRef and URLs stripped;
  - a validator;
  - a dist brand check.
- **Stage 3 (sim engine):** in `src/sim/`, with calibration and a browser harness.
- **Part 0a:** datacenter hardware.
  - 10 datacenter GPUs, 6 eight-GPU nodes, 4 server PSU modules, a server fan, 5 datacenter network parts, 2 PDUs;
  - sim support for nodes;
  - benchmark set I;
  - fitted `hbmBwFactor`.
- **Part 0b:** 30 models. The 19 new ones come from HF config.json and file listings. Sim support added for:
  - MLA latent KV;
  - linear-attention layers;
  - Gemma-4 global-layer KV;
  - MoE with leading dense layers.
- **Stage 4:** `src/jobs/`. Job generator with seeded RNG, reference-build solvability proof, and `scoreDelivery`.
- **Stage 5:** React UI.
  - job board;
  - shop (all 66 parts, category and tier filters, sourceLabel shown);
  - budget meter;
  - build screen with live `evaluateBuild` and a labeled temporary default software setup.
- **Test and build status:**
  - `npm test`: 76 tests passed [V].
  - `npm run build`: passes, including the brand check [V].
  - One Playwright pass through board → shop → build screen [V].

### Partly done
- **Calibration tolerance** (agreed: held-out median ≤25%, worst ≤60%):
  - held-out median 19.2% (passes) [V];
  - worst case 299% (fails) [V].
- **Stage 4-5 follow-up fixes:** planned and approved but **not done**. The user stopped because of their usage limit. See §7 step 1.
- **Game-design numbers in `src/jobs/`:** kept by user choice, but still need to be written to `docs/decisions.md` for sign-off (§7 step 1d).

### Not started
- **Stage 6:** in-game browser and config apps (inference / game-server / cloud-VM config apps). Includes the cloud/VM workload model.
- **Stage 7:** stress test UI, delivery, payout, xp, levels.
- **Stage 8:** localStorage saves; time stops when the tab closes.
- **Stage 9:** personal datacenter from level 5.
- **Stage 10:** difficulty (easy −15% / hard +30% per brief) applied to every system, then a full playthrough against the acceptance checks.

## 3. Architecture & Stack

**Stack:**
- Node 22 [V];
- Vite 8.3.1, React/react-dom 19.3, @vitejs/plugin-react [V from package.json];
- Vitest 5.0.3;
- playwright-core (devDep, used only from scratch scripts).
- No TypeScript: the user locked JavaScript.

### Layout
- `data-dev/`: dev-only data with real names. Never imported by game code. Every value goes through `pub()/meas()/est()` from `data-dev/lib.js`.
  - `parts/`: gpu.js (PCIe cards + calibration GPUs `cal-a5000`, `cal-h100-pcie`), gpu-dc.js (socketed modules), node.js, cpu.js, ram.js, storage.js, psu.js, cooling.js (fans + coolers), network.js, chassis.js (cases + rack), pdu.js.
  - `models.js` (11 original, `models2025`) + `models-2026.js` (19 new, `models2026`).
  - `engines.js`: `kvCacheTypes`, `formatComputePath`, and engines `eng-kettle`=llama.cpp, `eng-sluice`=vLLM, `eng-loom`=SGLang.
  - `fitted-perf.js`: GENERATED by `node scripts/calibrate.js --fit`. Never edit by hand.
  - `constants.js`, `benchmarks.js` (sets A-I, `role: 'fit' | 'check'`), `rooms.js` (`roomSchema`, `roomArchetypes`), `sources.js` (`SOURCE_LABELS` + source list), `brand-denylist.json`, `index.js`.
- `scripts/`:
  - `dev-data.js` exports `allParts()`, `validateAll()`, `deniedTerms()`, `allowedTerms()` (model/engine realRefs + family terms), `buildAndCheck()`.
  - `build-game-data.js` writes `src/generated/game-data.json` (gitignored).
  - `check-dist-brands.js`, `calibrate.js`, `list-estimates.js`.
- `src/data/`:
  - `build.js`: `buildGameData(dev)` strips realRef/source/url/title/reasoning/note and adds `sourceLabel`; `resolve()` turns tagged values into plain values.
  - `validate.js`.
  - `index.js` exports `tagged` (with labels) and `catalog` (resolved).
- `src/sim/` (pure functions):
  - `util.js`: `makeRng` (mulberry32), `indexCatalog`, `cpuCount`, `nodeOf`, `effectivePsu`.
  - `model.js`: `weightGeometry`, `avgExpertParamsPerLayer`, `kvBytesPerTokenLayer`, `kvTpShare`, `kvBytesForLayers`, `avgAttentionFlops`.
  - `layout.js` (`buildLayout`) and `memory.js` (`planMemory`, `systemRam`, `maxSequences`).
  - `inference.js`: `memBwEff`, `groupLink`, `decodeStep`, `decodeRate`, `prefillSeconds`.
  - `power.js`, `thermal.js`, `noise.js`, `durability.js`, `gameserver.js`, `stress.js` (`runStressTest`), `bench.js` (`simulateBenchmark`).
  - `evaluate.js`: `checkHardware`, `assignLanes`, `operatingPoint`, `evaluateBuild(catalog, build, software, room, opts)`.
- `src/jobs/`:
  - `clients.js` (`CLIENTS`, `TIERS`), `cost.js` (`buildCost`), `templates.js` (`referenceCandidates`), `software.js` (`defaultSoftware`, `DEFAULT_SOFTWARE_NOTE`, TEMPORARY).
  - `generate.js`: `generateJob`, `generateJobs`, `measure`, `GEN`, `WORKLOAD`.
  - `score.js`: `scoreDelivery`, `evaluateForJob`, `SCORING`.
  - `index.js`.
- `src/ui/`: `format.js`, `Tagged.jsx`, `buildState.js` (`emptyBuild`, `addPart`, `removeOne`, `installed`, `simBuild`), `JobBoard.jsx`, `Shop.jsx`, `BudgetMeter.jsx`, `BuildScreen.jsx`, `styles.css`. `src/App.jsx` wires them.
- `tests/`: `data.test.js`, `brand-check.test.js`, `sim.test.js`, `jobs.test.js`, `fixtures/example-job.js`.
- `dev/sim-harness.html|js`: dev-only, served by `npm run dev`, not in dist.

### Build object shape [V]
```
{ gpus:[{part}], cpu, cpuCount, cooler, ram:[{part,count}], storage:[{part,count}],
  psu, psuCount, chassis, fans:[{part,count}], network:[{part,count}], pdu, nvlinkBridges }
```
The UI adds a `rack` field, which `simBuild` strips.

### Software object shape [V]
```
software.inference = { engine, model, quant, kvType, contextLength, concurrency,
  splitMode, gpuLayers, tp, pp, cpuMoeLayers, cpuOffloadGB, tensorSplit, workDepth, promptTokens }
```
Plus `gameServers: [{ type: 'minecraft', players }]`.

### Non-obvious choices
- **Nodes are chassis parts.** They have `formFactor 'gpu-node'` plus `gpuSocket`, `gpuBays`, `fabric ('switch'|'mesh')`, `cpuSockets`, `psuBays`, `acceptsPsu`, `maxSystemPowerW`, `airflowCFM`.
- **GPUs have a `formFactor`.** Values: `'pcie'` or a socket token (`sxm4`, `sxm5`, `bw1`, `bw2`, `oam3`, `oam4`). Socketed modules only fit a node with the matching `gpuSocket`.
- **PSU modules share load.** `effectivePsu` = N × module rating. Spare modules are reported as `power.psuSpareModules`.
- **Node TP fabric.** `groupLink` returns type `'nvswitch'` or `'mesh'` using per-GPU `linkBandwidthGBs/2`.
- **Compute path depends on the engine.** `formatComputePath[engine][quant]` picks one of `cuda-core`, `tensor-fp16acc`, `tensor-fp32acc`.
- **Memory is binary.** `bytesPerMarketedGB = 2^30`. llama.cpp keeps input embeddings on the CPU.

## 4. Key Decisions & Rationale

All are logged in `docs/decisions.md` unless marked otherwise. [V: I wrote them]

- **Tech:** the user said "use wtv u want". I picked Vite + React, plain JS, Vitest, desktop only.
- **Catalog:** lean, about 6-10 parts per category (the datacenter tier is now bigger at the user's request).
- **Missing data:** estimate, flag, keep going. Every estimate carries reasoning.
- **Tensor parallel vs layer split:**
  - Sequential stages (layer split, CPU offload) add their times.
  - A TP group takes its slowest shard plus 2 all-reduces per layer plus a TP sync term (`interconnect.tpSyncUsPerLayer` = 10 µs, estimate).
  - The user said explicitly **not to fit** the sync term to the one arXiv paper.
- **No real names in `dist/`:**
  - Real names live only in `data-dev/`.
  - The UI shows generic `sourceLabel`s.
  - `npm run build` fails on any denied term (case-sensitive whole-word match).
- **Real names allowed for models and engines** (checkpoint answer). Hardware stays fake. Company names stay denied.
  - Allowlist: `allowedTerms()` in `scripts/dev-data.js`.
  - The bare word "Meta" was removed from the denylist because React's bundle contains the keyboard key name "Meta". "Meta AI", "Meta Platforms" and "meta-llama" are denied instead.
- **Cloud/VM:** it is a workload, but its model must NOT be invented. The user deferred it; no cloud jobs yet.
- **Calibration tolerance:** held-out median ≤25%, worst ≤60%.
- **Near misses:** partial credit.
- **Scoring:** weighted average of axis scores (performance, budget, power, noise, temperature). The client's priority weights set how much each counts. Hard fails cap the total.
- **Near-miss curve:** linear from 100 at the target to 0 at a floor (the perf floor is 80% of target). Bonuses for coming in under budget and under the power limit, capped at +10% combined.
- **Job types at launch:** inference, game server (Minecraft), and mixed.
  - Fairness: every job is proven solvable by a reference build from the catalog.
  - No cloud/VM jobs yet.
- **After delivery:** the stress test is final.
- **Game-design numbers** (floors, slack, fee, xp, client presets, satisfaction bands): I picked them without asking. The user chose "Keep, log for sign-off". **Not yet logged** (§7).
- **HBM bandwidth factor:**
  - Why: one bandwidth efficiency could not fit GDDR and HBM cards; llama.cpp on HBM ran 30-80% fast.
  - The factor is fitted for llama.cpp only.
  - vLLM keeps 1 for lack of data.
- **Reference-build pick:** random among the passing candidates, weighted toward cheap (index = n·u²).
  - Why: taking the cheapest always put every datacenter job on the same cheapest node, so jobs didn't scale with the catalog.
- **Rejected approaches** (don't retry):
  - A batch-efficiency constraint penalizing batch-1 decode. Replaced by `seqLayerOverheadUs` plus matmul efficiency.
  - Using the A5000 "derived 576 GB/s" from a WebFetch summary. The Wikipedia table says 768.
  - Fitting TP sync to the arXiv paper.
  - Modeling DeepSeek-V4 and Nemotron-3: their attention layouts couldn't be verified, so they were skipped.
- **Unsure why:** some constants from stages 1-3 were chosen before this session's context window. Their reasoning strings in `data-dev/constants.js` are the record; I can't add to them.

## 5. Files Touched

This covers this session's part (0a, 0b, stages 4 and 5). Stages 0-3 files exist from earlier commits.

- `data-dev/parts/gpu-dc.js` (new): 7 socketed modules (A100 SXM, H100 SXM, H200, B200, B300, MI300X, MI355X) under fake names.
- `data-dev/parts/gpu.js`:
  - the SXM calibration GPUs were moved out to gpu-dc;
  - `formFactor: 'pcie'` added to every card;
  - `cal-h100-pcie` added;
  - `gpus = [...pcieGpus, ...dcGpus]`.
- `data-dev/parts/node.js` (new): 6 nodes (`node-forge-a8/h8/b8/b8u`, `node-loom-t8/t8x`).
- `data-dev/parts/pdu.js` (new): `pdu-conduit-22k`, `pdu-conduit-17k`.
- `data-dev/parts/psu.js`:
  - 230 V redundant 80 PLUS curves;
  - 4 modules (`psu-voltaic-m3000t/m3300/m3200/m6600t`);
  - `formFactor` added.
- `data-dev/parts/cooling.js`: server fan `fan-gale-80s`.
- `data-dev/parts/network.js`: 5 datacenter parts, plus the `kind` and `noiseDBA` fields.
- `data-dev/parts/cpu.js`: `maxSockets` field.
- `data-dev/models-2026.js` (new): 19 models.
- `data-dev/models.js`: `models = [...models2025, ...models2026]`.
- `data-dev/rooms.js`: `roomArchetypes` (6 archetypes, tagged ranges).
- `data-dev/sources.js`: about 16 new sources (DGX guides, HGX page, AMD wiki, Supermicro, price-il-dc, NVIDIA networking docs, `hf-configs-2026`, `hf-files-2026`, and others).
- `data-dev/benchmarks.js`:
  - set I added;
  - `cal-a100-sxm` → `gpu-bastion-h80-sxm`;
  - `cal-h100-sxm` → `gpu-bastion-x80-sxm`.
- `data-dev/fitted-perf.js`: regenerated by `--fit`.
- `data-dev/brand-denylist.json`: datacenter brands, model families and company names added; "Meta" removed.
- `data-dev/index.js`: exports `nodes`, `pdus`, `roomArchetypes`.
- `scripts/dev-data.js`: `allParts`, trees, allowlist families.
- `scripts/calibrate.js`: `hbmBwFactor` fit step (2b).
- `src/data/build.js`: ships nodes in `chassis`, plus `pdu` and `roomArchetypes`.
- `src/sim/util.js`: `cpuCount`, `nodeOf`, `effectivePsu`.
- `src/sim/model.js`: MLA, linear layers, full-layer KV shape, `avgExpertParamsPerLayer`, `kvTpShare`, `avgAttentionFlops`.
- `src/sim/inference.js`: `memBwEff`, node fabric in `groupLink`, dual-CPU RAM bandwidth and FLOPs.
- `src/sim/memory.js`: uses `kvTpShare`.
- `src/sim/power.js`: dual CPU, `effectivePsu`.
- `src/sim/thermal.js`: heat per CPU socket.
- `src/sim/noise.js`: per-part `noiseDBA`.
- `src/sim/durability.js`: `effectivePsu`.
- `src/sim/evaluate.js`:
  - node, socket, PSU bay and CPU socket checks;
  - node GPUs get x16 lanes;
  - PSU redundancy warning;
  - PDU capacity failure;
  - "GPU bridges" / "Game server" wording (brand check).
- `src/jobs/*` (new): the stage 4 files listed in §3.
- `src/ui/*` (new), `src/App.jsx` (rewritten), `src/main.jsx` (imports `styles.css`).
- `tests/jobs.test.js` (new, 11 tests).
- `tests/sim.test.js`: 6 Part 0 tests (node sockets, fabric type, PSU modules, PDU, MLA KV, linear-layer KV).
- `docs/decisions.md`:
  - allowlist entries for the new model families;
  - the "Meta" note;
  - the stage 4-5 answers.
- `docs/research/datacenter.md` (new).
- `docs/calibration.md`: Part 0a update section.

## 6. Known Issues & Blockers

There are no build or test errors: tests pass and the build passes [V]. Unresolved:

1. **Bug: ATX PSU double count** [V, from reading code].
   - `src/ui/buildState.js` `addPart` increments `psuCount` when the same ATX PSU is re-added.
   - `buildCost` then charges twice, while `effectivePsu` uses one unit.
2. **Bug: rack cost ignored by scoring** [V, from reading code].
   - `src/jobs/cost.js` `buildCost` ignores `build.rack`.
   - `App.jsx` adds the rack to the budget meter, but `evaluateForJob().costUSD` doesn't, so the projected score's budget axis misses it.
3. **Gap: no noise field on datacenter cards.** Those jobs have no `noiseLimitDBA` because datacenter clients have noise weight 0. The user asked for every field on every card.
4. **Calibration worst case fails** [V]. Held-out cases over 60%:
   - `I-a100sxmx4-8b`, `I-h100p-8bf16-pp`;
   - B Q4 prefill rows, `B-l40s-8bf16-pp`;
   - `E-tp2`/`E-tp4`: measured vLLM TP is slower than TP1; the sim is 2-3x faster;
   - `G-a5000` c64 rows, `H-4090` TP rows.
5. **The 19 new models have no benchmarks**, so they are uncalibrated. Assumptions (all estimates):
   - Gemma-4 `attention_k_eq_v` applied to global layers only;
   - Llama-4 chunked attention treated as an 8192 sliding window;
   - DeepSeek/GLM-5.3 DSA sparse attention treated as full attention;
   - DeltaNet state stored as fp32.
6. **No H200/B200/MI300X-class benchmark was found on an opened page.** Attempts that failed:
   - aimultiple: charts only;
   - Medium: 403;
   - amd.com: 503 / empty;
   - generalcompute's numbers look physically impossible for a single GPU, so they were rejected.
7. **Estimates that need sign-off:**
   - **prices:** nodes, switches, AMD GPUs, PSU modules;
   - **server fan specs:** from a DigiKey search summary; the Sanyo, Farnell and DigiKey pages returned 404/503;
   - **power figures from search snippets:** SN5600 940 W, QM9700 747 W, ConnectX-7 25.9 W;
   - **MI355X link bandwidth**, assumed equal to MI300X's 896 GB/s.
8. **Sim limits:**
   - one build = one machine (no multi-node workload);
   - CPU temperature isn't modeled inside nodes (no server heatsink data);
   - the build screen shows nothing without an active job.
9. **Reference-build weighting sometimes oversizes budgets.** Example: an $83k job for Ministral-3-8B on 4 A100 PCIe cards [V].
10. **`docs/checkpoint-stage3.md` is stale.** It still lists the old placeholder model and engine names; the user was told.
11. **Missing favicon.** It causes one 404 in the browser console [V].

## 7. Next Steps

**Step 1 — approved, not started when the session ended.** The plan was approved, then the user said "not now" because of their usage limit. It is the stage 4-5 fix list:
   - a. `buildState.js`: only change `psuCount` when `part.formFactor === 'module'`. Re-adding an ATX PSU is a no-op.
   - b. `cost.js`: include `build.rack` in `buildCost`, and remove the rack special case in `App.jsx`.
   - c. `JobBoard.jsx`: show "Noise: not judged (data hall)" when `targets.noiseLimitDBA` is absent.
   - d. `docs/decisions.md`: add a section "Game-design values picked by Claude, pending sign-off". List every value in:
     - `SCORING` (`src/jobs/score.js`): `perfFloor` 0.8, `overFloor` 1.2, `noiseFloorDB` 6, `tempFloorC` 5, `budgetBonusMax` 0.06, `powerBonusMax` 0.04, `bonusFullAt` 0.3, `hardFailCap` 25, payout 0 on hard fail, bands 90/75/50/25, xp multiplier = score/100.
     - `GEN` (`src/jobs/generate.js`): `perfTargetOfRef` [0.75,0.95], `powerLimitOfRef` [1.1,1.35], `noiseLimitOverRefDB` [2,6], `tempLimitOverRefC` [1,3], `budgetOfRefCost` [1.1,1.4], `feeOfBudget` [0.12,0.2], `baseXp` 100/300/1000, `maxTries` 12; reference pick weighting n·u².
     - `WORKLOAD` (`src/jobs/generate.js`): contexts, concurrency and player ranges per tier; homelab weights ≤40 GB; datacenter native weights ≥60 GB.
     - `CLIENTS` (`src/jobs/clients.js`): 10 presets and their weights.
     - Note that the 80% floor and the +10% bonus cap came from the option the user picked.
     - Add a pointer comment in `score.js`, `generate.js` and `clients.js`.
   - e. Tests in `tests/jobs.test.js`: an ATX PSU added twice costs once; a rack counts in `buildCost`.
   - f. Run `npm test` and `npm run build`, commit "Stage 4-5 fixes", push to `Claude`.
2. **Correct the report wording.** The acceptance check "example job generated and evaluated end to end" passes by the user's own criterion (a rolled job really goes through the evaluator). Caveat: the exact 262k-context example isn't in the homelab `WORKLOAD.contexts` menu. I wrongly called it "partly".
3. **Stage 6:** the in-game browser and config apps.
   - Ask the user one round of blocking questions first:
     - which settings each config app exposes (inference, game server, cloud/VM);
     - the cloud/VM workload model (from the Proxmox research in `docs/research/physics-failure-workloads.md`, plus a researched overhead model).
   - Then replace `src/jobs/software.js` `defaultSoftware` in the build screen with the config apps.
4. **Stages 7-10**, per `docs/design-plan.md`. Each needs its own question round. Open brief questions include difficulty detail, levels and unlocks, stress-test skip speed, backups, and personal-datacenter details.
5. **Keep hunting TP and datacenter benchmarks**, especially small models over PCIe, and H200/B200/MI300X single-request decode.

## 8. Conventions & Environment

**Commands** [V]:
- `npm test`: regenerates `src/generated/game-data.json`, then runs Vitest.
- `npm run build`: gen:data + vite build + `scripts/check-dist-brands.js`.
- `npm run calibrate`: prints the table. `node scripts/calibrate.js --fit` refits and rewrites `data-dev/fitted-perf.js`.
- `npm run dev`: dev server; the harness is at `/dev/sim-harness.html`.
- `node -e "import('./scripts/dev-data.js').then(m=>console.log(m.validateAll()))"`: quick validation.
- `npx vitest run`: runs tests WITHOUT regenerating data. Stale data can pass; use `npm test`.

**Rules:**
- Every number in `data-dev` goes through `pub(value, unit, sourceId, note)`, `meas(...)` or `est(value, unit, reasoning, sourceId?)`.
  - The validator rejects untagged values, unknown sources, and short reasoning ("Assumed." is too short).
  - Keys like `id`, `displayName`, `realRef`, `category`, `tier`, `family` are exempt.
  - A field named `label` or `note` is NOT exempt. Use `displayName`, or wrap the value in `est()`.
- **Brand check:**
  - Adding any real name to a UI or sim string fails the build.
  - "Minecraft" and "NVLink" in strings were caught and replaced by "block-building game server" and "GPU bridges".
  - Test `every branded realRef is covered by the brand denylist` requires a curated denylist term for each realRef. New model families need both a denylist term AND an `allowedTerms()` family entry.
- **IDs:** fake family codes for models (`tamarin`=Llama, `quill`=Qwen, `mistle`=Mistral, `ossia`=gpt-oss, `gem`=Gemma, `glade`=GLM, `deep`=DeepSeek, `mmx`=MiniMax, `cpm`=MiniCPM, `phi`). Hardware IDs use fake brand stems (Halcyon Ember/Atelier/Bastion/Citadel, Corvid Tessera, Anvilworks Forge/Loom, Voltaic, Latticenet, Strandline, Conduit, Hollowform, Orrin CPUs).
- **Git:**
  - Only branch `Claude`; push with `git push -u origin Claude`.
  - No PR unless asked.
  - Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_0168wQqvgWZDWWPVqvyphjNj`.
  - No model identifiers in repo files.
- **Gotchas:**
  - `pkill -f "vite ..."` inside a bash command kills that same bash (exit 144). Use `for p in $(pgrep -f "vite preview"); do kill $p; done` in a separate call.
  - Playwright: import `/home/user/Five-Nines/node_modules/playwright-core/index.mjs` by absolute path from scratch scripts. Browser executable: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. Serve with `npx vite preview --port 4173` after `npm run build`.
  - Wikipedia tables: fetch the HTML with curl and parse it. WebFetch summaries garble tables, and the Wikipedia API rate-limited us.
  - Hugging Face API works via curl: `/api/models?author=X&sort=createdAt`, `/{repo}/resolve/main/config.json`, `/api/models/{repo}/tree/main?recursive=true`. Gated meta-llama repos return 401; use the unsloth mirrors.
  - These sites blocked fetches: amd.com, TechPowerUp, Geekbench, PassMark, Noctua, Medium.
  - The scratchpad scripts (`wtab.py`, `sizes.py`, `getcfg.py`, `ui-pass.mjs`, `node-eval.mjs`, `models-eval.mjs`) were in the session scratchpad and **will not exist** in a new session.

## 9. Verification Status

**Verified by running [V]:**
- 76 Vitest tests pass.
- The build and brand check pass.
- Calibration numbers:
  - fit set: 33 cases, median 4.7%, max 35.8%;
  - held-out set: 74 cases, median 19.2%, max 299.4%.
- 810 rolled jobs:
  - 0 generator throws;
  - every reference build scores 100;
  - generating a board of 6 jobs takes ≤250 ms.
- All 30 models evaluate without NaN on a 1x 5090-class build or an 8x B300-class node.
- Node builds (H200/B200/MI300X/B300 class) evaluate in 0.3-9 ms.
- Playwright pass:
  - the board shows 6 cards;
  - shop filters work (gpu + datacenter = 10);
  - rebuilding a job's reference build via shop clicks gave fits, 86.6 tok/s, 1,165 W, 23.4 dBA, room 26.4 C, projected score 100, 0.9 ms;
  - removing the PSU shows "No power supply installed.";
  - console shows only the favicon 404.
- Values taken from pages I opened: DGX A100/H100/B200/B300 user guides, the HGX page, the Supermicro AS-8125GS-TNMR2 and AS-A126GS-TNMR pages, the Wikipedia Nvidia Tesla / AMD Instinct / 80 Plus tables, the IntuitionLabs price article (2026-09-05), the NVIDIA SN4000 manual, the Dell QM9700/SN5600 PDFs (ports and rack units only), the Scan AP8886 listing, the AWS EC2 SLA page, the XD benchmark README, and the HF configs and file listings.

**Unverified [U]:**
- Everything tagged "search results / page not opened" in the data, listed in §6 item 7.
- AMD Infinity Fabric 896 GB/s.
- MI355X FP16 = 2,500 (derived from INT8/2).
- B200/B300 FP16 dense = 2,250 (HGX sparse/2; Wikipedia shows 1,191.2, a conflict).
- DGX fan counts (derived from airflow).
- The UI has not been retested since stage 5. The planned fixes are untested because they don't exist yet.
- Correctness of new-model speeds (no benchmarks).
- Datacenter room thermal behavior. ACH 30-60 stands in for CRAC cooling; this is an estimate.

## 10. Open Questions (need the user)

1. Sign-off on the game-design numbers listed in §7 step 1d. The user chose to keep them for now and review later.
2. Sign-off on the flagged hardware estimates (§6 item 7), plus the older list in `docs/estimates-for-signoff.md`.
3. Stage 6 question round (not asked yet):
   - which settings the config apps expose;
   - the cloud/VM workload model and its scoring.
4. Stage 7-10 question rounds (not asked yet):
   - difficulty mapping;
   - levels and unlocks;
   - stress-test skip speed;
   - backup options;
   - personal datacenter.
5. Whether to include the exact 262k-context example job in the homelab roll menu. This is cosmetic and was never asked.
6. Reference-build weighting (n·u²) sometimes oversizes budgets. Keep it, or cap the pick to the cheapest ~40%? Never asked.

## Git

- Branch: `Claude`, tracking `origin/Claude`, in sync [V].
- Last commit before this handoff: `148132a` "Stage 5: job board, shop and build screen UI with live evaluation" [V].
- Working tree before this handoff: clean [V].
- This handoff commit adds `docs/handoff.md` and a line in `CLAUDE.md`.
- History: 7810678 initial → 1b7b387 stage 0 → 8ce6613 stage 1 → 3e0af6d stage 2 → 33245dc stage 3 → f64297c checkpoint report → 9c4742f checkpoint answers → 6220b29 Part 0a → f8809e1 Part 0b → b13deb0 stage 4 → 148132a stage 5.

## How the user works

Only what happened in this session.

- **Tone** (user preferences): wants a casual best-friend tone.
  - Mostly lowercase.
  - No "certainly / absolutely / great question".
  - No emojis.
  - No headers or bullets in normal chat.
  - Honest, and pushes back when wrong.
- **Working rules from the brief,** repeated by the user in each big request: never guess, research with real pages and keep sources, tag every number, verify by running, report honestly, be direct.
- **Usage limits:** the user is tight on usage and said so explicitly: "be efficient".
  - No parallel agents.
  - Don't re-read big files you already know.
  - Only take screenshots when you need one.
  - Commit after each stage.
  - They stopped the session at 96% of their limit ("good plan but not now bruh").
- **Question rounds:** likes one round of questions via the question tool, with the recommended option first and researched options, then no more stops. They picked the recommended option every time this session.
- **Pushback** from earlier in the project, carried in the summary:
  - Plan changes: TP ≠ layer split; no real names in the bundle; cloud/VM as a workload without an invented model.
  - "don't report the example job as generated end to end... or difficulty as working" until those stages exist.
  - When the conversation drifted: "lock in on wht u were doing bruh".
- **Wants current, real data:** "all of the latest popular open source models... go on huggingface", not from memory.
- **Asks quick status checks:** e.g. "stage 4 n 5 done right?", "how many GPUs per tier... counts only, no list". Wants short direct answers to these.
