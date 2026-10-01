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
    tpSyncUsPerLayer: est(10, 'us', 'Per-layer synchronization cost in a tensor-parallel group on top of the all-reduce itself: each layer adds two collective kernels and the ranks wait for the slowest one. Taken as two kernel launches of ~5 us each. NOT fitted: the only published single-stream TP measurement (arXiv 2512.01644) is deliberately not used to set it (user decision). Revisit when more TP data exists.'),
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
    // Stage 6: server.properties distances (radius in chunks, so the square of
    // chunks around each player is (2r+1)^2). The per-player numbers above are
    // taken to hold at the default distance of 10.
    defaultDistance: pub(10, 'chunks', 'mc-wiki-props', 'view-distance and simulation-distance default'),
    minDistance: pub(3, 'chunks', 'mc-wiki-props'),
    maxDistance: pub(32, 'chunks', 'mc-wiki-props'),
    tickScalesWithSimArea: est(1, 'exponent', 'Per-player tick cost is taken as proportional to the ticked chunk area (2r+1)^2 set by simulation-distance, since that is the area whose entities and chunks the server updates (server.properties description). No measurement of MSPT vs distance was found. Pending sign-off.', 'mc-wiki-props'),
    ramScalesWithViewArea: est(1, 'exponent', 'Per-player RAM is taken as proportional to the loaded chunk area (2r+1)^2 set by view-distance (the world data the server keeps and sends). No measurement found. Pending sign-off.', 'mc-wiki-props'),
    optimizedForkTickFactor: est(0.7, 'x', 'Tick-cost multiplier for the optimized server fork vs vanilla. Its docs say it is designed to greatly improve performance but give no number; Meterstick found its ticks often under 50 ms on farm and TNT workloads where vanilla exceeded it, but no clean ratio. Simplest reasonable value, pending sign-off.', 'meterstick'),
  },

  // Stage 6: virtualization (cloud/VM jobs on the hypervisor).
  virt: {
    cpuFactorTuned: meas(0.98, 'x', 'ibm-kvm-2014', 'Linpack under KVM with vCPU pinning and host cache topology exposed: 284.2 vs 290.8 GFLOPS native (-2%)'),
    cpuFactorUntuned: meas(0.83, 'x', 'ibm-kvm-2014', 'Linpack under default KVM: 241.3 vs 290.8 GFLOPS native (-17%)'),
    cpuTypeHostIsTuned: est(1, 'bool', 'CPU type "host" passes the real CPU model to the guest, the closest hypervisor setting to the paper\'s tuned run; the generic default type is mapped to the untuned run. Mapping is an estimate.', 'pve-qemu'),
    iopsFactor: meas(0.5, 'x', 'ibm-kvm-2014', 'random I/O: "KVM delivers only half as many IOPS" as native, with virtio'),
    qcow2IopsFactor: est(1 / 1.1, 'x', 'Proxmox wiki: raw is "up to 10% faster" than qcow2; the upper bound is used, so qcow2 gets 1/1.1 of raw.', 'pve-qemu'),
    hostReserveGB: pub(2, 'GB', 'pve-sysreq', 'recommended minimum memory for the OS and Proxmox VE services, plus memory for guests'),
    vcpuPerCore: est(1, 'x', 'Guest CPU speed counts physical cores only (an SMT sibling thread adds no full core). No measurement of SMT gain under VMs found; simplest assumption, pending sign-off.'),
  },

  // Stage 9: personal datacenter. Every value here is a game-design pick by
  // Claude, approved in outline by the user and pending sign-off
  // (docs/decisions.md, "Stage 9 values ... pending sign-off").
  datacenter: {
    simHoursPerRealSecond: est(1, 'h/s', 'Pending. Datacenter time runs 3600x real time so yearly failure rates (AFR) and daily demand rhythms play out within a session; at 1:1 no part would fail while playing.'),
    startUtilityW: est(20000, 'W', 'Pending. Utility feed of the starter site; about one loaded 8-GPU node.'),
    utilityStepW: est(20000, 'W', 'Pending. Extra feed per utility upgrade.'),
    utilityStepUSD: est(25000, 'USD', 'Pending. Price of one utility feed upgrade.'),
    coolingStepAch: est(20, '1/h', 'Pending. Air changes per hour added by one cooling unit (the room model stands in for CRAC capacity with air changes).'),
    coolingStepUSD: est(15000, 'USD', 'Pending. Price of one cooling unit.'),
    hallMaxC: est(32, 'C', 'Pending. Hall air above this counts as overheating. ASHRAE A1 allowable inlet upper limit is commonly quoted as 32 C (page not opened).'),
    nodeInletAch: est(1e6, '1/h', 'Each node is evaluated with the hall air as its inlet (huge air changes in its own room model), so the hall temperature, not the node alone, sets its inlet.'),
    // Tuning pass 1: prices x4 (was $0.20/Mtok, $0.002/player-h, $0.02/vCPU-h) so a
    // healthy starter datacenter pays back in about an hour of real play instead of
    // ~5 h. Game pricing, above real-world API rates on purpose. Pending.
    priceUSDPerMTokens: est(0.8, 'USD/Mtok', 'Pending (tuning pass 1, was 0.2). Price per million tokens for the small class (8B-class reference).'),
    priceUSDPerPlayerHour: est(0.008, 'USD/player/h', 'Pending (tuning pass 1, was 0.002). Game-server customers per player slot per hour.'),
    priceUSDPerVcpuHour: est(0.08, 'USD/vCPU/h', 'Pending (tuning pass 1, was 0.02). VM customers per vCPU per hour.'),
    tokenPriceExponent: est(0.7, 'exponent', 'Pending (tuning pass 1). Token price grows with the class reference size^0.7: bigger models cost more per token but less than in proportion, the usual shape of per-token API price lists (not researched).'),
    smallRefActiveB: est(8, 'B params', 'Pending. Reference active size of the small class (price base).'),
    mediumRefActiveB: est(32, 'B params', 'Pending. Reference active size of the medium class: 4^0.7 = 2.6x the small price.'),
    largeRefActiveB: est(70, 'B params', 'Pending. Reference active size of the large class: 8.75^0.7 = 4.6x the small price.'),
    smallMaxActiveB: est(12, 'B params', 'Pending. Models using up to 12B parameters per token are small class (MoE counted by active parameters).'),
    mediumMaxActiveB: est(40, 'B params', 'Pending. Up to 40B active is medium; above is large.'),
    electricityUSDPerKWh: est(0.12, 'USD/kWh', 'Pending. Power bill per kWh at the wall.'),
    arrivalsPerHourAt50Rep: est(0.02, '1/h', 'Pending (tuning pass 1, was 0.08). New customers per simulated hour at reputation 50, per served workload bucket: one node fills in roughly 5-10 real minutes instead of under one.'),
    growthPerDay: est(0.01, 'fraction/day', 'Pending (tuning pass 1, was 2% compounding). Arrival rate grows linearly by 1% of the base per simulated day, up to marketCeiling.'),
    marketCeiling: est(3, 'x', 'Pending (tuning pass 1). Arrival rate never grows past 3x the base (market size limit); reached after 200 simulated days = 80 real minutes.'),
    reputationArrivalFloor: est(10, 'points', 'Pending (tuning pass 1). Arrivals are computed as if reputation were at least 10 (a fifth of the base rate), so reputation 0 never locks a datacenter out.'),
    rhythmAmplitude: est(0.3, 'fraction', 'Pending. Demand swings +/-30% over a simulated day.'),
    rhythmPeriodH: est(24, 'h', 'Pending. Daily demand cycle.'),
    spikeChancePerHour: est(0.01, '1/h', 'Pending. Chance per simulated hour that one customer spikes (goes viral / needs far more).'),
    spikeMultMin: est(2, 'x', 'Pending. Spike size, lower bound.'),
    spikeMultMax: est(5, 'x', 'Pending. Spike size, upper bound.'),
    spikeHoursMin: est(6, 'h', 'Pending. Spike length, lower bound.'),
    spikeHoursMax: est(24, 'h', 'Pending. Spike length, upper bound.'),
    inferenceSizeMin: est(20, 'tok/s', 'Pending. Inference customer size, lower bound (aggregate tokens per second).'),
    inferenceSizeMax: est(300, 'tok/s', 'Pending. Inference customer size, upper bound.'),
    gameSizeMin: est(5, 'players', 'Pending. Game-server customer size, lower bound.'),
    gameSizeMax: est(40, 'players', 'Pending. Game-server customer size, upper bound.'),
    vmSizeMin: est(2, 'vCPU', 'Pending. VM customer size, lower bound.'),
    vmSizeMax: est(16, 'vCPU', 'Pending. VM customer size, upper bound.'),
    vmRamGBPerVcpu: est(4, 'GB/vCPU', 'Pending. RAM a VM customer takes per vCPU.'),
    vmIopsPerVcpu: est(500, 'IOPS/vCPU', 'Pending. Disk IOPS a VM customer uses per vCPU.'),
    vmOvercommit: est(2, 'vCPU/thread', 'Pending. vCPUs the site sells per host thread.'),
    coresPerGameServer: pub(3, 'cores', 'mc-wiki-req', '"typically three cores are used at most" per server'),
    netBitsPerToken: est(32, 'bit/token', 'Pending. Network traffic per generated token (text plus framing).'),
    netKbpsPerPlayer: est(100, 'kbit/s', 'Pending. Network traffic per game player.'),
    netMbpsPerVcpu: est(10, 'Mbit/s', 'Pending (tuning pass 1, was 50). Average network traffic per VM vCPU; at 50 a template node\'s onboard 1 GbE capped it at 20 vCPUs of a 128-vCPU host.'),
    onboardNicGbps: est(1, 'Gbit/s', 'Pending. A node with no network card in its build gets one onboard 1 GbE port.'),
    slowAbove: est(1, 'fraction', 'Pending. Utilization above 100%: service is slow and pay drops to 1/utilization.'),
    churnAbove: est(1.25, 'fraction', 'Pending. Utilization above 125% for churnAfterH hours: customers start leaving.'),
    churnAfterH: est(6, 'h', 'Pending. Hours of heavy overload before a customer leaves (then one more every churnAfterH hours).'),
    reputationStart: est(50, 'points', 'Pending. Reputation 0-100; arrivals scale with reputation / 50.'),
    reputationGainPerHour: est(0.1, 'points/h', 'Pending. Reputation gained per hour when every workload is at or under 100%.'),
    reputationLossPerChurn: est(3, 'points', 'Pending. Reputation lost each time an overloaded customer leaves.'),
    historyPoints: est(240, 'points', 'Pending. Hours of history kept for the dashboard graph.'),
    inferenceConcurrency: est(32, 'sequences', 'Pending. Concurrent sequences an inference node is set up for when sizing its capacity.'),
    inferenceContext: est(8192, 'tokens', 'Pending. Context each inference node is set up for.'),

    // Stage 9b: failures, data loss, backups.
    upsRatedW: pub(1000, 'W', 'ups-1500-ipsd', '1000 W / 1440 VA rack UPS class'),
    upsMinAtHalfLoad: pub(25.8, 'min', 'ups-1500-ipsd', 'half load (500 W)'),
    upsMinAtFullLoad: pub(7.2, 'min', 'ups-1500-ipsd', 'full load (1000 W)'),
    upsUnitUSD: est(900, 'USD', 'Pending. No price on the opened listing; assumed for a 1 kW rack UPS.'),
    powerCutsPerYear: pub(1.5, '1/yr', 'eia-outages-2024', 'average US interruptions per customer, 2024'),
    powerCutMeanMin: est(80, 'min', 'EIA: interruptions outside major events average about two hours per year; at 1.5 per year that is about 80 minutes each. Major-event outages (9 h in 2024) are not modeled. Pending.', 'eia-outages-2024'),
    powerCutRepLoss: est(2, 'points', 'Pending. Reputation lost when the site goes dark.'),
    offsiteUSDPerTBMonth: pub(6.95, 'USD/TB/month', 'b2-pricing', 'pay-as-you-go object storage'),
    snapshotUSDPerTBMonth: est(6.95, 'USD/TB/month', 'Pending. Snapshot space priced like the offsite copy (extra disk for changed blocks).'),
    siteLossPerYear: est(0.01, '1/yr', 'Pending. Chance per year of losing the whole site (fire, flood). No data found.'),
    badChangePerNodeYear: est(0.5, '1/yr', 'Pending. Chance per node-year that a bad change (wrong delete, broken upgrade) destroys its data.'),
    dataLossRepLoss: est(10, 'points', 'Pending. Reputation lost per data-loss event.'),
    // Stage 10a: offsite copy (restores after any data loss, minus changes since the last copy).
    offsiteIntervalH: est(24, 'h', 'Pending. One offsite copy per day (nightly backups are the common practice; the Proxmox backup docs set no default schedule, opened 2026-10-01).', 'pve-vzdump'),
    offsiteRestoreGbps: est(1, 'Gbit/s', 'Pending. Internet link the offsite copy is restored over; the restore runs at the slower of this and the node\'s network.'),
  },

  // Stage 10: difficulty (user-approved table, docs/decisions.md 2026-10-01).
  // slack scales the room around each job's reference build (so hard jobs stay
  // provably solvable); the rest multiply rates or are fractions of money.
  difficulty: {
    easy: {
      slack: est(1.15, 'x', 'User-approved: easy = 15% easier. Job slack around the reference build x1.15.'),
      feeMult: est(1.15, 'x', 'User-approved: client fee x1.15 on easy.'),
      failureMult: est(0.85, 'x', 'User-approved: failure rates x0.85 on easy.'),
      dataLossPenalty: est(0.085, 'fraction of money', 'User-approved: data-loss penalty 8.5% of money on easy.'),
      angryPenalty: est(0, 'fraction of money', 'User-approved: no angry-client penalty on easy.'),
      demandMult: est(0.85, 'x', 'User-approved: datacenter demand growth and spike chance/size x0.85 on easy.'),
      patienceMult: est(1.15, 'x', 'User-approved: overload patience x1.15 on easy (6 h -> 6.9 h).'),
    },
    normal: {
      slack: est(1, 'x', 'User-approved: normal is the baseline.'),
      feeMult: est(1, 'x', 'User-approved: normal is the baseline, no change.'), failureMult: est(1, 'x', 'User-approved: normal is the baseline, no change.'),
      dataLossPenalty: est(0.1, 'fraction of money', 'User-approved: data-loss penalty 10% of money on normal.'),
      angryPenalty: est(0, 'fraction of money', 'User-approved: no angry-client penalty on normal.'),
      demandMult: est(1, 'x', 'User-approved: normal is the baseline, no change.'), patienceMult: est(1, 'x', 'User-approved: normal is the baseline, no change.'),
    },
    hard: {
      slack: est(0.7, 'x', 'User-approved: hard = 30% harder. Job slack around the reference build x0.70.'),
      feeMult: est(0.7, 'x', 'User-approved: client fee x0.70 on hard.'),
      failureMult: est(1.3, 'x', 'User-approved: failure rates x1.30 on hard.'),
      dataLossPenalty: est(0.13, 'fraction of money', 'User-approved: data-loss penalty 13% of money on hard.'),
      angryPenalty: est(0.15, 'fraction of money', 'User example from the brief: on hard, an unhappy client takes 15% of the money the player has.'),
      demandMult: est(1.3, 'x', 'User-approved: datacenter demand growth and spike chance/size x1.30 on hard.'),
      patienceMult: est(0.7, 'x', 'User-approved: overload patience x0.70 on hard (6 h -> 4.2 h).'),
    },
  },

  // Stage 6: which software runs on which OS (published install requirements).
  osCompat: {
    vllmLinuxOnly: pub(1, 'bool', 'vllm-install', 'OS: Linux; "vLLM does not support Windows natively"'),
    sglangLinuxOnly: pub(1, 'bool', 'sglang-install', 'install instructions target Linux'),
  },
};
