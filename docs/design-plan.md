# Five Nines — Game Design Plan

Oct 1, 2026 · @Wimmboo

## Pitch

Five Nines is a 2D browser game where you take client jobs to build servers, homelabs and mini datacenters, then configure the whole hardware and software stack and deliver it ready to plug in. The depth comes from a simulation driven by real hardware specs, not from graphics.

The only thing borrowed from PC Creator (SeStudio Publishing) is the job and request loop: a client asks for something, you pick parts from menus, you deliver, you get paid and gain xp. It is not a PC building game, so there is no assembly minigame.

The audience is nerds and geeks, so the simulation has to hold up to people who know what memory bandwidth and tensor parallelism are.

## How to work on this (read first)

This document is the brief. It was planned with the user over a long conversation, and the user is strict about how you work. Follow these rules for the whole project.

1. **Never guess.** If something is not in this document and you do not know it, ask the user. Do not fill gaps with plausible defaults, and do not invent numbers, specs, formulas, mechanics or features.
2. **Research instead of assuming.** Anything real, such as hardware specs, benchmark results, how an inference engine behaves, or how PC Creator's job loop works, must be looked up with the web tools before you write it down. Do not write it from memory. Keep the sources.
3. **Stay inside the brief.** The Locked decisions are fixed. Do not add features, change mechanics or reduce realism to make something easier. The user explicitly does not want simplified versions.
4. **Ask once, up front.** Before writing code, collect every unresolved item from Open decisions that blocks the first stage, and ask them together in a single round using the question tool. After that, build without stopping for trivia. Only stop again for a real blocker or a decision that cannot be undone.
5. **Label where data comes from.** Every number in the parts catalog and every constant in the simulation is tagged as one of: measured or published (with the source), or theoretical estimate (with the reasoning). Nothing untagged.
6. **Verify by running.** Run the game in a browser, exercise the simulation with known cases, and look at the result before saying something works. Do not claim a feature is done because the code was written.
7. **Report honestly.** When you finish a stage, say what works, what does not, and what you were unsure about. Do not hide gaps.
8. **Keep your tone direct.** The user writes casually and gets frustrated fast when work is guessed or skimmed. Skip filler and over-apologizing. Get the facts right and say plainly what you did.

The user already had one bad experience with an assistant that guessed its way through a build without researching what was asked. Avoiding that is the main job.

## Locked decisions

Everything below was stated by the user. Claude Code should treat it as fixed and ask before changing any of it.

- Name: Five Nines.
- 2D game in the browser, written in JavaScript. No 3D.
- Realism is the priority: real logged data where it exists, sound theoretical estimates where it does not. No simplified versions of mechanics.
- Jobs roll at random between homelab, server and mini datacenter.
- Parts come from menus, like PC Creator. No assembly minigame.
- Real hardware specs with fake brand names.
- No part is locked. Only features are locked by level.
- The player configures everything, hardware and software, and delivers a build that is ready to plug in.
- Jobs come with budgets and a simulated room.
- Clients care about different things on different jobs.
- A higher score pays more money and gives more xp. A failed test run makes the client angry and pays less money and xp.
- Three difficulties: easy (15% easier), normal, hard (30% harder), applied across everything.
- Stress tests run one simulated hour and can be skipped through. If anything fails partway, the player fixes it and redoes the whole test.
- The game does not progress while the tab is closed. Time runs in real time while it is open.
- Saves live in the browser (localStorage). No accounts.
- Level 5 is the minimum for the personal datacenter: passive income, demand that changes with what you serve, and real risk of part failure and data loss.
- Built in Claude Code.

## Core loop

A job is a bundle of constraints that fight each other, and the game's main work is computing whether a build satisfies all of them at once.

1. The job board offers jobs. Each one is rolled as homelab, server or mini datacenter.
2. The player reads the job card: workload, targets, budget, room, and what this client cares about most.
3. The player buys parts from the shop menus within the budget.
4. The player sets up the software stack (see Software layer).
5. The player runs the stress test. One simulated hour, skippable. A failure means fixing the cause and redoing the whole test.
6. The player delivers. The game scores the result and pays money and xp.

The user's example job shows the shape of a job card. It is an example only, not a fixed job:

| Field | Example |
| --- | --- |
| Workloads | Minecraft servers, plus an AI model up to 32B parameters |
| Performance target | 20+ tokens/s with a 262k context window |
| Power limit | Under 1000 W |
| Noise | Quiet |
| Room | Small closed space, must not overheat |
| Budget | Set per job |

## Simulation engine

Every result is computed from part specs, software settings and the room. Nothing is authored per job. The formulas below are a starting model built on real physics, to be calibrated against published benchmarks and real logged data before anything is trusted.

LLM decode speed is mostly limited by memory bandwidth, because each generated token reads the active weights once:

```latex
\text{tokens/s} \approx \frac{\text{effective memory bandwidth}}{\text{bytes of active weights read per token}}
```

KV cache size decides whether a long context fits in memory at all:

```latex
\text{KV bytes} = 2 \times \text{layers} \times \text{KV heads} \times \text{head dim} \times \text{context tokens} \times \text{bytes per element} \times \text{sequences}
```

Heat in a closed room follows from wall power and how much air moves through it:

```latex
\Delta T = \frac{P_{\text{wall}}}{\dot{m}\, c_p}
```

What the engine has to compute, and what feeds each value:

| Result | Driven by |
| --- | --- |
| Inference speed and capacity | Memory bandwidth, VRAM, model size, quantization, offload split, tensor parallelism and interconnect, engine, batch and concurrency |
| Memory fit | Weights plus KV cache plus runtime overhead against VRAM and system RAM |
| Power draw | Per-part draw at the current load, PSU efficiency curve |
| Temperatures | Heat output, cooler capability, case or rack airflow, room size and ventilation, ambient temperature |
| Noise | Fan speeds needed to hold those temperatures, combined across fans |
| Durability | Temperature, sustained load, part quality, power quality |
| Game server performance | CPU single-thread speed, RAM, storage latency, player count |

All of it has to run fast enough in the browser to recompute whenever the player changes one setting.

## Software layer

The player sets up the software themselves. The user's rule: "i want this server to be AI inference" is not one click, the player goes through all of it.

Two parts:

1. **In-game browser.** A search engine inside the game with preset pages for the things a job needs, so the player researches instead of guessing. It is simpler than the real internet on purpose.
2. **Config apps.** The tools themselves are where it gets complicated, and every setting must feed the simulation.

Settings the user named so far:

- Operating system
- Inference engine: llama.cpp, vLLM, SGLang
- Model choice, made from the client's demand
- Quantization
- GPU offload
- Tensor parallelism
- Backups

The user also said workloads include cloud and game servers (Minecraft was the example), set up the same way. Their individual settings are not specified yet, see Open decisions.

## Scoring and difficulty

A delivery is scored on how well the build did the job: power, durability, performance and the other measured results, weighted by what this particular client cares about. A higher score pays more money and gives more xp. A build that fails its test run makes the client angry, and the payout and xp drop.

Difficulty is one setting chosen by the player:

| Difficulty | Effect |
| --- | --- |
| Easy | 15% easier |
| Normal | Normal, the baseline |
| Hard | 30% harder |

The user said this applies to everything: job targets, budgets, failure rates and penalties.

On higher difficulty, a dissatisfied client can cost the player money directly. The user's example: on hard, making a client unhappy takes 15% of the money the player has. That figure is an example of the idea, not a final number.

The exact scoring formula, and how a near miss is treated, are not decided yet. See Open decisions.

## Time and saving

Time passes in real time while the tab is open and stops when it is closed. Nothing is simulated for the hours the player was away, so there is no catch-up calculation and no system-clock cheating.

The exception is stress testing: the player can skip through it. A stress test represents one simulated hour of sustained load. If something fails partway, the player fixes the cause and the whole test starts over.

Saves live in the browser only, in localStorage, with no accounts or backend. The known cost is that clearing site data wipes the save. The user chose this knowing that.

## Personal datacenter (level 5 and up)

Late in the game the player can build and run their own datacenter instead of only delivering to clients. It is locked until level 5 at minimum.

- **Income.** Passive. The player chooses what to serve and sets it up themselves: AI inference, cloud, game servers and similar. Nothing is picked from a list of ready-made services.
- **Demand.** It moves with what the player serves. The example given: an AI customer can demand more than the hardware delivers.
- **Risk.** Parts can break. Data can be lost. The player is expected to have real backups, and if they do not, they lose money. The penalty scales with the chosen difficulty.
- **Whose data.** Both the clients' data on builds the player delivered and the data of the datacenter's own customers.
- **Backups.** The user wants real mechanics here with no simplification, for example RAID, snapshots, offsite copies and power protection, each with real trade-offs. The exact list is not decided.

## Parts and data

Parts use real specifications under fake brand names, so the game stays realistic without using real company names. The simulation is only as believable as this data, so the catalog is the most important content in the project.

The specs the engine needs per part type. This is a proposed starting list, not a decision:

| Part type | Specs the simulation reads |
| --- | --- |
| GPU | VRAM, memory bandwidth, compute throughput, power limit, cooler type, interconnect |
| CPU | Cores, single-thread speed, memory channels, PCIe lanes, power |
| RAM | Capacity, speed, channels, ECC |
| Storage | Capacity, throughput, latency, endurance |
| Power supply | Wattage, efficiency curve, connectors |
| Cooling and fans | Airflow, static pressure, noise curve |
| Networking | Speed, ports |
| Case, rack, room | Volume, airflow paths, ventilation, ambient temperature |

Rule for the data: use real logged or benchmarked numbers where they exist, and clearly labeled theoretical estimates where they do not. Where the game outputs a number such as tokens per second, it should be checked against published results for real hardware running the same model and engine.

## Progression

Money and xp come from delivered jobs, scaled by score. Levels unlock features, never parts: a level 1 player can buy any part they can afford.

The one unlock the user has defined is the personal datacenter at level 5 or higher. Every other unlock, and the level curve, is still open.

## Research checklist

Look these up with the web tools, open the pages you take numbers from, and record the source next to each value. Snippets from search results are not enough.

| Topic | What to find |
| --- | --- |
| PC Creator (SeStudio Publishing) | How its job and request loop actually works, so the job board and delivery flow match the reference. Only the loop is borrowed. |
| Server, workstation and datacenter GPUs and CPUs | Real VRAM, memory bandwidth, power limits, PCIe lanes, interconnect options. These become the parts with fake brand names. |
| RAM, storage, PSUs, fans, cooling, networking, racks | Real specs, efficiency curves, noise and airflow figures. |
| llama.cpp, vLLM, SGLang | What each one supports and how each behaves: quantization formats, GPU offload, tensor parallelism, batching, context limits, memory overhead. |
| Open models around 32B and other common sizes | Layer count, KV heads, head dimension and active parameters, because these decide weight size and KV cache size. |
| Real inference benchmarks | Published tokens per second for real hardware, model and engine combinations, to calibrate the simulation against. |
| Thermals and noise | How heat builds up in small closed rooms, fan noise curves, and how temperature affects throttling. |
| Failure and durability data | Real failure rates and how temperature and load change them, for drives, fans, PSUs and GPUs. |
| Backup and protection concepts | RAID levels and their trade-offs, snapshots, offsite copies, UPS behavior. |
| Game servers | Real resource needs for the game servers used as job workloads, starting with Minecraft. |

If a number cannot be found, say so and ask the user whether to use a labeled theoretical estimate.

## Suggested build order

This order is a proposal, not one of the user's decisions. It puts the simulation first because every other part of the game depends on it, and keeps the interface thin on top of it. Tell the user if you want to change it.

1. **Questions and research.** Ask the blocking open decisions in one round, then work through the Research checklist.
2. **Data layer.** A schema for parts, models, rooms and workloads, and the data files, with a source or estimate tag on every value.
3. **Simulation engine.** A standalone JavaScript module with no interface. Memory fit, inference speed, power, heat, noise and durability, with automated tests and a calibration pass against the published benchmarks.
4. **Jobs and scoring.** The job generator for homelab, server and mini datacenter jobs, client priorities, and the scoring and payout rules once the user has decided them.
5. **Shop and job board.** The 2D menu interface for reading jobs, picking parts and staying in budget.
6. **Software layer.** The in-game browser and the config apps, each setting wired into the engine.
7. **Stress test and delivery.** The simulated one-hour test with skip, failure and redo, delivery, payout, xp and levels.
8. **Saving.** localStorage saves that survive a reload.
9. **Personal datacenter.** Level 5 unlock, demand, failures and data loss, and backups.
10. **Difficulty and playtest.** The easy and hard multipliers across every system, then a full playthrough.

## Acceptance checks

The game is not done until each of these is true and has been tested by running it. Tick them off as they pass.

- [ ] The example job from Core loop can be generated and evaluated end to end.
- [ ] A build whose weights plus KV cache do not fit in memory fails the job for that reason, and the game says why.
- [ ] Changing any single software setting (engine, quantization, offload, tensor parallelism, model) changes at least one computed result. No outcome is scripted per job.
- [ ] A build that draws more than the job's power limit, or runs too loud or too hot for its room, is penalized accordingly.
- [ ] In a small closed room, temperature visibly depends on wall power and airflow over the stress test.
- [ ] If a part fails during a stress test, the test stops, the player fixes it, and the whole test starts over.
- [ ] Simulated inference numbers land close to published benchmarks for real hardware running the same model and engine, within a tolerance agreed with the user.
- [ ] Every value in the catalog and every simulation constant carries a source or estimate tag.
- [ ] Easy and hard change targets, budgets, failure rates and penalties as the user defined.
- [ ] Every part is buyable at level 1 if the player can afford it, and level-gated features stay locked until the right level.
- [ ] The personal datacenter is locked below level 5, earns passive income, reacts to demand, breaks parts, and loses money when data is lost without backups.
- [ ] Closing the tab pauses time, and reloading restores the exact saved state from localStorage.
- [ ] Nothing in the game contradicts the Locked decisions.

## Open decisions

None of these has been decided. Claude Code should ask the user instead of choosing.

- **After delivery.** Can a delivered build fail later, while the tab is open, and bring the client back angry? Or is the stress test result final for client jobs?
- **Near misses.** If a build hits 18 tokens/s against a 20 target, is that a fail or partial credit? Are there bonuses for coming in under budget or under the power limit?
- **Scoring formula.** How the measured results combine into one score, and how client priorities change the weights.
- **Difficulty detail.** Exactly how "15% easier" and "30% harder" map onto each target, budget, failure rate and penalty.
- **Software detail.** The individual settings inside each config app, for inference, cloud and game servers.
- **Job generator.** How the random rolls are built and kept fair, and how many job types exist at launch.
- **Datacenter detail.** What exactly is sold, how demand changes over time, and how quickly failures happen.
- **Backups.** The exact set of backup and protection options and how each is simulated.
- **Stress test speed.** How fast the skip runs in real seconds.
- **Levels.** The xp curve and every unlock besides the datacenter.
- **Catalog.** Which parts and how many at launch, who compiles the data, and where the benchmark numbers come from.
- **Tech.** JavaScript is decided, but no framework, build setup or UI approach has been chosen, and whether it needs to work on phones is unanswered.
- **Name.** Five Nines has not been checked for clashes with existing games or products.
