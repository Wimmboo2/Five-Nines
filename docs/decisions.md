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

- (none yet)
