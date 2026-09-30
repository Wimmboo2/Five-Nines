import { pub, meas, est } from './lib.js';

// Simulation constants. Every one is tagged.

export const constants = {
  air: {
    cpJPerKgK: pub(1006, 'J/(kg K)', 'etb-cp-air', '1.006 kJ/kg K at 20-27 C'),
    densityByTempC: [
      { tempC: pub(20, 'C', 'etb-air-density'), kgPerM3: pub(1.204, 'kg/m3', 'etb-air-density') },
      { tempC: pub(25, 'C', 'etb-air-density'), kgPerM3: pub(1.184, 'kg/m3', 'etb-air-density') },
      { tempC: pub(30, 'C', 'etb-air-density'), kgPerM3: pub(1.164, 'kg/m3', 'etb-air-density') },
      { tempC: pub(40, 'C', 'etb-air-density'), kgPerM3: pub(1.127, 'kg/m3', 'etb-air-density') },
    ],
    cfmToM3s: est(0.000471947, 'm3/s per CFM', 'Unit conversion: 1 ft3 = 0.0283168 m3; per minute / 60.'),
  },

  fanLaws: {
    flowExponent: pub(1, '', 'etb-fan-affinity', 'q ~ n'),
    pressureExponent: pub(2, '', 'etb-fan-affinity', 'dp ~ n^2'),
    powerExponent: pub(3, '', 'etb-fan-affinity', 'P ~ n^3'),
    noiseSpeedCoeffDB: est(50, 'dB per decade', 'Fan noise change = 50 log10(n2/n1). Seen in search results citing fan-acoustics references; the pages that state it returned 404, so not confirmed on an opened page.'),
  },

  acoustics: {
    gpuFanMaxDBA: {
      'open-air': est(40, 'dBA', 'GPU cooler noise at full fan speed, 1 m. No per-card figure found; assumed near the full-speed AIO figure in the cooler review (39.8 dBA).'),
      'flow-through': est(38, 'dBA', 'Assumed slightly quieter than open-air at full speed.'),
      blower: est(48, 'dBA', 'Blower coolers are louder at full speed (small radial fan at high rpm). Assumed.'),
      passive: est(0, 'dBA', 'No fans on the card.'),
    },
    switchFanDBA: est(30, 'dBA', 'Small switch with fans, at 1 m. Assumed.'),
    psuFanDBA: est(25, 'dBA', 'PSU fan at moderate load, 1 m. Assumed.'),
    sumRule: pub('10log10(sum 10^(L/10))', '', 'etb-adding-db'),
    sonePhonOffset: est(40, 'phon', 'Standard definition: loudness level (phon) = 40 + 10 log2(sone). Treated as approximately dB(A) for fan ratings.'),
    distanceAttenuationRef: est(1, 'm', 'Fan and cooler dB(A) ratings are treated as sound pressure at 1 m; level falls by 20 log10(r / 1 m) in free field. Standard point-source spreading; not confirmed on an opened page.'),
  },

  pcie: {
    // Per direction. NVIDIA pages give bidirectional totals: Gen4 x16 64 GB/s, Gen5 x16 128 GB/s.
    gen4x16GBs: pub(32, 'GB/s', 'nv-a100-page', 'PCIe Gen4: 64 GB/s bidirectional, so 32 per direction'),
    gen5x16GBs: pub(64, 'GB/s', 'nv-h100-page', 'PCIe Gen5: 128 GB/s bidirectional, so 64 per direction'),
    gen3x16GBs: est(16, 'GB/s', 'Half of Gen4 per direction; each PCIe generation doubles the per-lane rate.'),
  },

  interconnect: {
    // Small-message all-reduce latency dominates decode-time tensor parallelism.
    // No measured intra-node small-message latency was found on an opened page
    // (see docs/research/benchmarks.md). These are estimates.
    allreduceLatencyUs: {
      nvlink: est(10, 'us', 'One DGX-A100 user reported ~3 us P2P write latency (nccl-tests issue #123); a ring all-reduce needs 2(N-1) such steps plus kernel launch, so ~10 us for 2 GPUs.'),
      'pcie-p2p': est(25, 'us', 'PCIe peer-to-peer adds switch/root-complex latency over NVLink; a search summary mentioned 9-10 us for a custom all-reduce on RTX 4090 over PCIe, but the page was not opened. 25 us assumed for NCCL over PCIe.'),
      'pcie-host': est(60, 'us', 'Without P2P, data is staged through host memory (two PCIe crossings and a host copy). Assumed.'),
    },
    stageHandoffUs: est(30, 'us', 'Passing hidden-state activations between sequential pipeline stages (one small PCIe copy plus synchronization). Assumed.'),
  },

  memory: {
    osReserveGB: est(4, 'GB', 'System RAM kept by the OS, page cache minimum and engine process outside the model. Not measured; assumed.'),
    bytesPerMarketedGB: est(1073741824, 'bytes', 'DRAM chip densities are powers of two (e.g. 16 Gbit = 2 GiB), so a "24 GB" GPU or a "32 GB" DIMM holds 24 or 32 GiB. Evidence in the data: the published 6x 24 GB run of a 141 GB F16 70B model only fits with binary capacities. Model files are decimal bytes.'),
  },

  inference: {
    activationBytes: est(2, 'bytes', 'Activations exchanged between GPUs are fp16/bf16 (2 bytes per element).'),
    cpuBwEfficiency: est(0.6, 'fraction', 'Share of theoretical DRAM bandwidth reached by CPU inference. No CPU-offload benchmark with a normal thread count was found; assumed. Flagged.'),
    cpuLayerOverheadUs: est(50, 'us', 'Per-layer fixed cost on CPU. Assumed.'),
    dramBytesPerTransfer: est(8, 'bytes', 'A DDR4/DDR5 channel is 64 bits wide, so bandwidth = MT/s x 8 bytes per channel.'),
    cpuFlopsPerCoreCycle: est(32, 'FLOP/cycle', 'Two 256-bit FMA units per core = 2 x 8 fp32 lanes x 2 FLOP = 32 FLOP/cycle. Architecture detail not confirmed on an opened page for each CPU.'),
    cpuPrefillEfficiency: est(0.3, 'fraction', 'Share of peak CPU FLOPs reached by prompt processing on CPU-resident layers. No benchmark found; assumed.'),
    reportDepthTokens: est(1024, 'tokens', 'Context depth at which decode speed and load are reported when a workload does not set one. A reporting convention, not a physical value.'),
    defaultPromptTokens: est(4096, 'tokens', 'Prompt length used for time-to-first-token when a workload does not set one. A reporting convention.'),
  },

  power: {
    // GPU power while decoding / prefilling, as a fraction of board power.
    // From a search summary of a 4090 measurement (280 W decode b1, 395 W decode
    // b32, 410 W prefill of 450 W); the page itself returned 403.
    gpuDecodeFraction: est(280 / 450, 'fraction', 'RTX 4090: ~280 W single-stream decode of 450 W board power (search summary; page 403).'),
    gpuBatchDecodeFraction: est(395 / 450, 'fraction', 'RTX 4090: ~395 W batch-32 decode (search summary; page 403).'),
    gpuBatchDecodeRefBatch: est(32, 'sequences', 'Batch size of the batched-decode power figure above; power is interpolated between batch 1 and this.'),
    gpuPrefillFraction: est(410 / 450, 'fraction', 'RTX 4090: ~410 W prefill (search summary; page 403).'),
    cpuInferenceLoadFraction: est(0.3, 'fraction', 'CPU load while the engine feeds GPUs (kernel launches, sampling, serving HTTP). Assumed. When layers run on the CPU, load rises with the share of each step spent there.'),
    motherboardW: est(40, 'W', 'Chipset, VRM losses, fans header, NICs on board. Assumed.'),
    networkLoadFraction: est(0.6, 'fraction', 'Switches are rated at max power with all ports busy; 60% assumed for a working switch.'),
    storageBusyFraction: est(0.1, 'fraction', 'Share of time drives are active while serving inference or game worlds (weights are loaded once, then mostly idle). Assumed.'),
  },

  thermal: {
    gpuHeatsinkResistanceCW: {
      // Effective GPU core rise over the air entering the card, per watt.
      // No per-card figure was found; assumed so each card sits near its
      // typical reviewed load temperature in open air.
      'open-air': est(0.10, 'C/W', 'Assumed: a 450 W open-air card reaches ~70 C in 25 C air (45 C rise / 450 W).'),
      'flow-through': est(0.09, 'C/W', 'Assumed slightly better than open-air.'),
      blower: est(0.18, 'C/W', 'Assumed: blower cards run hotter (a 300 W blower card ~80 C in 25 C air).'),
      passive: est(0.12, 'C/W', 'Assumed at the required server airflow; much worse without it (see passiveMinAirflowCFM).'),
    },
    passiveMinAirflowCFM: est(30, 'CFM', 'Airflow a passive datacenter card needs across its heatsink. Not found on an opened page; assumed.'),
    throttleFloorFraction: est(0.6, 'fraction', 'When a part hits its max temperature it cuts power; below 60% of its normal power the sim calls it a thermal failure. Assumed.'),
    throttlePerfExponent: est(0.207, '', 'Speed ~ power^x. From the llama.cpp CUDA discussion: an RTX 3090 capped from 390 W to 250 W decoded at 137.72 vs 151.04 tok/s, so x = ln(0.912)/ln(0.641) = 0.207. A 5090 capped 600->400 W lost only 1.2% (x = 0.03), so the effect varies by card; flagged.', 'bench-lcpp-cuda'),
    airflowRestriction: {
      damped: est(0.6, 'fraction', 'Share of fan free-air CFM that gets through a closed, sound-damped case (solid front panel, filters). Not measured; assumed.'),
      open: est(0.85, 'fraction', 'Share of fan free-air CFM through an open mesh case with filters. Assumed.'),
      rack: est(0.8, 'fraction', 'Share through a rack chassis with a drive cage in front. Assumed.'),
    },
    naturalConvectionCFM: est(3, 'CFM', 'Air that moves through a case with every fan stopped (chimney effect through vents). Assumed small.'),
    convectionExponent: est(0.8, '', 'Forced-convection heat transfer grows with airflow^0.8 (turbulent-flow correlations), so heatsink resistance scales with airflow^-0.8. Standard heat-transfer result; not from an opened page.'),
    targetMarginC: est(8, 'C', 'Fan controllers aim to keep parts this far below their max temperature. Assumed.'),
    gpuFanMinFraction: est(0.3, 'fraction', 'Lowest GPU fan speed when the card is working. Assumed.'),
    driveRiseC: est(8, 'C', 'Drives sit this much above the case inlet air. Assumed.'),
    roomAirMixingFactor: est(1.0, 'fraction', 'Room air treated as fully mixed (one temperature). Standard lumped assumption.'),
    wallHeatCapacityJPerM2K: est(10000, 'J/(m2 K)', 'Thermal mass of interior wall surface layers (gypsum board ~12.5 mm, density ~700 kg/m3, cp ~1,000 J/kg K => ~8,750 J/m2 K). Values not from an opened page.'),
  },

  reliability: {
    boltzmannEvPerK: pub(8.617333e-5, 'eV/K', 'arrhenius-calc'),
    activationEnergyEv: pub(0.7, 'eV', 'arrhenius-calc', '"typical activation energy of 0.7 eV (common for silicon-based semiconductors)"'),
    fanLifeHalvingC: pub(10, 'C', 'arctic-mttf-p9max', 'AF = 2^((Ts-Tu)/10)'),
    referenceTempC: pub(40, 'C', 'arctic-mttf-p9max', 'Fan ratings at 40 C'),
    hddFleetAfrPct: meas(1.39, '%/yr', 'bb-q1-2026', 'Backblaze lifetime AFR across 341,263 drives'),
    gpuFailuresPerGpuYear: est((148 + 72) / (16384 * 54 / 365), 'per GPU-year', 'Llama 3 paper: 148 faulty-GPU + 72 HBM3 interruptions over a 54-day snapshot on ~16K H100s under full training load.', 'arxiv-llama3'),
    gpuReferenceTempC: est(70, 'C', 'Assumed typical GPU temperature during the Llama 3 training run the failure rate comes from.'),
    psuAfrPct: est(1.0, '%/yr', 'No PSU field failure data found. Assumed.'),
    psuInternalRiseC: est(15, 'C', 'PSU internal components run above room air; rise at zero load. Assumed.'),
    psuRisePerLoadPct: est(0.2, 'C per %', 'Extra PSU internal temperature per percent of rated load (20 C more at full load). Assumed.'),
    psuReferenceTempC: est(40, 'C', 'Internal temperature at which psuAfrPct applies. Assumed.'),
    cpuReferenceTempC: est(50, 'C', 'CPU temperature at which cpuAfrPct applies. Assumed.'),
    idleGpuFailureFactor: est(0.25, 'fraction', 'The Llama 3 GPU failure rate was measured at full training load; an idle GPU is assumed to fail at a quarter of that rate, rising linearly with load.'),
    driveOverTempDoublingC: est(5, 'C', 'Above its rated max operating temperature, a drive failure rate is assumed to double every 5 C. Below it, Backblaze-type field data shows no clear temperature effect, so none is applied.'),
    cpuAfrPct: est(0.1, '%/yr', 'No CPU field failure data found. Assumed low.'),
    ramAfrPctPerModule: est(0.2, '%/yr', 'No DIMM field failure data found. Assumed.'),
  },

  minecraft: {
    ticksPerSecond: pub(20, 'ticks/s', 'mc-wiki-tick'),
    tickBudgetMs: pub(50, 'ms', 'mc-wiki-tick'),
    // No published data ties MSPT to player count and CPU speed. These are
    // estimates so the model runs; flagged as the weakest part of the sim.
    msptPerPlayerRef: est(1.5, 'ms/player', 'Assumed per-player main-thread cost on the reference CPU (Zen 2 at 3.3 GHz single-thread index 3.3). No source.'),
    msptBaseRef: est(5, 'ms', 'Assumed idle-world tick cost on the reference CPU. No source.'),
    refSingleThreadIndex: est(3.3, 'GHz x IPC', 'Reference CPU for the two numbers above: a Zen 2 core at 3.3 GHz.'),
    ramGBPerPlayer: est(0.3, 'GB', 'Minecraft wiki: 10+ players ~4 GB (Server/Requirements); ~0.3 GB/player on top of a 1 GB base. Rough.', 'mc-wiki-req'),
    ramGBBase: pub(1, 'GB', 'mc-wiki-req', 'minimum for 1-4 players'),
  },
};
