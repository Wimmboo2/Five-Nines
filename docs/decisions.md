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

## 2026-09-30: models (parked)

- The user wants **all the latest popular open-source models** in the game, researched from Hugging Face and current trends, not from memory. Then they said to park it and finish the current work first.
- For now the model list stays the benchmark-backed set used for calibration. The latest-models expansion is a checkpoint item. The raw HF snapshot is in `docs/research/models-hf-snapshot-2026-09-30.md`.

## 2026-09-30: checkpoint round after stage 3 (first answers)

- **Calibration tolerance:** median |error| <= 25% and worst case <= 60%, over the held-out (`check`) benchmark cases. `npm run calibrate` reports pass/fail against it.
- **Near misses:** partial credit. Missing a target (e.g. 18 tok/s vs 20) lowers the score in proportion. It doesn't make the client angry unless a hard limit fails (doesn't fit, power, overheating). The exact formula is still an open question.
- **Real names:** models and inference engines use their real names in the game. Hardware keeps fake brand names (locked decision).
- **Tensor parallel:** add a per-layer TP synchronization overhead term, tagged as an estimate and **not fitted** to the one arXiv measurement. Keep hunting for more TP benchmarks (especially small models over PCIe). The user asked what that measurement used: Qwen2.5-32B-Instruct BF16, vLLM v0.9.2, 4x A100 80GB SXM, "NVLink pairs, PCIe across pairs", chat workload with 64 input / 128 output tokens.
