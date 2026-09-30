// evaluateBuild: one call computes every result for a build, its software and
// the room it sits in. Nothing is authored per job.
//
//   evaluateBuild(catalog, build, software, room) -> {
//     failures:  [{ code, message }]   hard problems (won't fit, won't power, overheats, bad config)
//     warnings:  [string]
//     memory, inference, gameServers, power, thermal, noise, reliability
//   }
//
// build:    { gpus: [{part}], cpu, cooler, ram: [{part,count}], storage: [{part,count}],
//             psu, chassis, fans: [{part,count}], network: [{part}], nvlinkBridges }
// software: { inference?: {...engine settings...}, gameServers?: [{ type: 'minecraft', players }] }
// room:     see data-dev/rooms.js roomSchema

import { indexCatalog, cpuCount, nodeOf } from './util.js';
import { buildLayout } from './layout.js';
import { planMemory, systemRam } from './memory.js';
import { makeContext, decodeRate, decodeStep, prefillSeconds } from './inference.js';
import { buildPower, allFans } from './power.js';
import { solveTemps, roomSteadyC, perfForPower } from './thermal.js';
import { noiseAtListener } from './noise.js';
import { failureRates } from './durability.js';
import { minecraftLoad } from './gameserver.js';

export function checkHardware(idx, build) {
  const errors = [];
  const warnings = [];
  const cpu = build.cpu ? idx.parts.get(build.cpu) : null;
  if (!cpu) errors.push('No CPU installed.');
  if (!build.psu) errors.push('No power supply installed.');
  if (!(build.ram ?? []).length) errors.push('No system memory installed.');
  if (cpu) {
    const ram = systemRam(idx, build);
    for (const r of build.ram ?? []) {
      const part = idx.parts.get(r.part);
      if (part.type !== cpu.memType) errors.push(`${part.displayName} is ${part.type}, but ${cpu.displayName} takes ${cpu.memType}.`);
      if (cpu.eccSupport === false && part.registered) errors.push(`${part.displayName} is registered (RDIMM) server memory; ${cpu.displayName} needs unbuffered DIMMs.`);
      if (cpu.eccSupport === true && cpu.tier !== 'consumer' && !part.registered) errors.push(`${cpu.displayName} needs registered ECC DIMMs; ${part.displayName} is unbuffered.`);
    }
    const nCpu = cpuCount(build);
    const channels = cpu.memChannels * nCpu;
    if (ram.modules > channels * 2) errors.push(`${ram.modules} memory modules, but ${nCpu > 1 ? nCpu + 'x ' : ''}${cpu.displayName} has ${channels} channels (at most ${channels * 2} modules).`);
    if (ram.modules > 0 && ram.modules < channels) warnings.push(`Only ${ram.modules} of ${channels} memory channels are populated; CPU memory bandwidth is cut to match.`);
    const sockets = nodeOf(idx, build)?.cpuSockets ?? 1;
    if (nCpu > sockets) errors.push(`${nCpu} CPUs, but the board has ${sockets} socket${sockets > 1 ? 's' : ''}.`);
    if (nCpu > (cpu.maxSockets ?? 1)) errors.push(`${cpu.displayName} runs in single-socket systems only.`);
  }
  const ch = build.chassis ? idx.parts.get(build.chassis) : null;
  const node = nodeOf(idx, build);
  const socketed = build.gpus.filter((g) => idx.parts.get(g.part).formFactor !== 'pcie');
  if (node) {
    for (const g of build.gpus) {
      const p = idx.parts.get(g.part);
      if (p.formFactor !== node.gpuSocket) errors.push(`${p.displayName} does not fit ${node.displayName}: the node takes its own generation of GPU modules only.`);
    }
    if (build.gpus.length > node.gpuBays) errors.push(`${build.gpus.length} GPUs, but ${node.displayName} has ${node.gpuBays} GPU positions.`);
    const psu = build.psu ? idx.parts.get(build.psu) : null;
    if (psu && !node.acceptsPsu.includes(psu.id)) errors.push(`${psu.displayName} does not fit the power bays of ${node.displayName}.`);
    if (psu && (build.psuCount ?? 1) > node.psuBays) errors.push(`${build.psuCount} power modules, but ${node.displayName} has ${node.psuBays} bays.`);
  } else if (socketed.length) {
    errors.push(`${idx.parts.get(socketed[0].part).displayName} is a socketed module: it needs a matching 8-GPU node, not a PCIe slot.`);
  }
  if (!node && build.psu && idx.parts.get(build.psu).formFactor === 'module') errors.push('Server power modules only fit a node\'s power bays.');
  if (ch && !node) {
    const slots = build.gpus.reduce((a, g) => a + idx.parts.get(g.part).slots, 0);
    if (slots > ch.expansionSlots) errors.push(`The GPUs need ${slots} expansion slots; ${ch.displayName} has ${ch.expansionSlots}.`);
    const fanCount = (build.fans ?? []).reduce((a, f) => a + (f.count ?? 1), 0) + ch.includedFans;
    if (fanCount > ch.fanMounts) errors.push(`${fanCount} fans, but ${ch.displayName} has ${ch.fanMounts} fan mounts.`);
  } else if (!ch) {
    warnings.push('No case: parts sit in open room air.');
  }
  if (build.nvlinkBridges) {
    const bad = build.gpus.filter((g) => idx.parts.get(g.part).linkType !== 'nvlink');
    if (bad.length) warnings.push('NVLink bridges only connect cards that support NVLink; the others talk over PCIe.');
  }
  return { errors, warnings };
}

// Split the CPU's PCIe lanes between GPUs the way boards bifurcate: x16 each if
// they fit, else x8, else x4.
export function assignLanes(idx, build) {
  const cpu = build.cpu ? idx.parts.get(build.cpu) : null;
  const n = build.gpus.length;
  if (!cpu || n === 0) return build.gpus.map((g) => ({ ...g }));
  // Node baseboards give every module its own x16 link through PCIe switches.
  if (nodeOf(idx, build)) return build.gpus.map((g) => ({ ...g, lanes: 16 }));
  let per = 16;
  while (per > 4 && per * n > cpu.pcieLanes) per /= 2;
  return build.gpus.map((g) => ({ ...g, lanes: per }));
}

// One steady operating point at a given room temperature: fan control picks
// the slowest fans that keep every part under target; parts that still run
// too hot throttle (power cut, speed cut).
export function operatingPoint(idx, build, room, roomC, work) {
  const t = idx.constants.thermal;
  const gpuParts = build.gpus.map((g) => idx.parts.get(g.part));
  let powerScale = gpuParts.map(() => 1);
  let cpuScale = 1;
  let chosen = null;
  for (let iter = 0; iter < 3; iter++) {
    const activity = {
      gpus: gpuParts.map((_, i) => work.gpuActive[i] ? { mode: 'decode', batch: work.batch, powerScale: powerScale[i] } : { mode: 'idle' }),
      cpuLoad: work.cpuLoad * cpuScale,
      storageBusy: work.storageBusy,
      fanSpeed: 1,
    };
    const loadsFor = (pw) => ({
      gpuW: pw.byPart.filter((p) => p.kind === 'gpu').map((p) => p.watts),
      cpuW: pw.byPart.find((p) => p.kind === 'cpu')?.watts ?? 0,
      otherInsideW: pw.byPart.filter((p) => !['gpu', 'cpu', 'network'].includes(p.kind)).reduce((a, p) => a + p.watts, 0),
    });
    // Fan control: slowest case fan speed + quietest CPU cooler mode that holds targets.
    chosen = null;
    for (let s = t.gpuFanMinFraction; s <= 1.0001 && !chosen; s += 0.05) {
      for (const mode of ['quiet', 'max']) {
        const pw = buildPower(idx, build, { ...activity, fanSpeed: s });
        const temps = solveTemps(idx, build, roomC, loadsFor(pw), s, mode);
        const ok = temps.gpuTemps.every((g) => g.tempC <= g.maxC - t.targetMarginC)
          && (!temps.cpu || temps.cpu.tempC <= temps.cpu.maxC - t.targetMarginC);
        if (ok) { chosen = { s: Math.min(1, s), mode, pw, temps }; break; }
      }
    }
    if (!chosen) {
      const pw = buildPower(idx, build, { ...activity, fanSpeed: 1 });
      chosen = { s: 1, mode: 'max', pw, temps: solveTemps(idx, build, roomC, loadsFor(pw), 1, 'max') };
    }
    // Throttle anything still over its max temperature.
    let changed = false;
    const gpuW = loadsFor(chosen.pw).gpuW;
    chosen.temps.gpuTemps.forEach((g, i) => {
      if (g.tempC > g.maxC && work.gpuActive[i]) {
        const allowedW = (g.maxC - chosen.temps.inletC) / g.resistance;
        const next = Math.max(0, Math.min(1, powerScale[i] * allowedW / gpuW[i]));
        if (next < powerScale[i] - 1e-3) { powerScale[i] = next; changed = true; }
      }
    });
    if (chosen.temps.cpu && chosen.temps.cpu.tempC > chosen.temps.cpu.maxC) {
      const cpuW = loadsFor(chosen.pw).cpuW;
      const allowedW = (chosen.temps.cpu.maxC - chosen.temps.inletC) / chosen.temps.cpu.resistance;
      const next = Math.max(0, Math.min(1, cpuScale * allowedW / cpuW));
      if (next < cpuScale - 1e-3) { cpuScale = next; changed = true; }
    }
    if (!changed) break;
  }
  const perfScale = {};
  powerScale.forEach((p, i) => { perfScale[i] = perfForPower(idx, p); });
  return {
    caseFanSpeed: chosen.s, cpuFanMode: chosen.mode, power: chosen.pw, temps: chosen.temps,
    gpuPowerScale: powerScale, cpuPowerScale: cpuScale, perfScale,
    thermalFailure: powerScale.some((p, i) => work.gpuActive[i] && p < t.throttleFloorFraction) || cpuScale < t.throttleFloorFraction,
  };
}

// Workload description the thermal/power model needs.
function workFrom(idx, build, infResult, mcResults) {
  const active = build.gpus.map(() => false);
  let cpuLoad = 0;
  let batch = 1;
  if (infResult?.layout) {
    for (const s of infResult.layout.stages) if (s.kind === 'gpu') for (const d of s.devices) active[d] = true;
    batch = infResult.concurrency;
    cpuLoad += idx.constants.power.cpuInferenceLoadFraction;
    const step = infResult.stepAtWork;
    if (step) {
      const cpuShare = step.stages.filter((s) => s.kind !== 'gpu').reduce((a, s) => a + s.t, 0) / step.seconds;
      cpuLoad += (1 - cpuLoad) * cpuShare;
    }
  }
  const cpu = build.cpu ? idx.parts.get(build.cpu) : null;
  for (const mc of mcResults) if (cpu) cpuLoad += mc.coreBusy / cpu.cores;
  const anyWork = active.some(Boolean) || mcResults.length > 0;
  return { gpuActive: active, batch, cpuLoad: Math.min(1, cpuLoad), storageBusy: anyWork ? idx.constants.power.storageBusyFraction : 0 };
}

export function evaluateBuild(catalog, build0, software, room, opts = {}) {
  const idx = opts.idx ?? indexCatalog(catalog);
  const failures = [];
  const warnings = [];
  const hw = checkHardware(idx, build0);
  hw.errors.forEach((m) => failures.push({ code: 'hardware', message: m }));
  warnings.push(...hw.warnings);
  if (hw.errors.some((e) => e.startsWith('No CPU') || e.startsWith('No power'))) {
    return { failures, warnings };
  }
  const build = { ...build0, gpus: assignLanes(idx, build0) };

  // Game servers
  const mcResults = (software.gameServers ?? []).filter((g) => g.type === 'minecraft').map((g) => minecraftLoad(idx, build, g));
  const mcRamBytes = mcResults.reduce((a, m) => a + m.ramGB, 0) * idx.constants.memory.bytesPerMarketedGB;
  mcResults.forEach((m) => { if (m.lagging) warnings.push(`Minecraft server with ${m.players} players needs ${m.mspt.toFixed(1)} ms per tick (budget 50 ms): it runs at ${m.tps.toFixed(1)} TPS.`); });

  // Inference
  let inference = null;
  let memory = null;
  if (software.inference) {
    const inf = { ...software.inference, extraRamBytes: mcRamBytes };
    const layout = buildLayout(idx, build, inf);
    layout.errors.forEach((m) => failures.push({ code: 'config', message: m }));
    warnings.push(...layout.warnings);
    if (!layout.errors.length) {
      memory = planMemory(idx, build, inf, layout);
      memory.errors.forEach((m) => failures.push({ code: 'memory', message: m }));
      warnings.push(...memory.warnings);
      const c = makeContext(idx, build, inf, layout, memory);
      const B = inf.concurrency ?? 1;
      const workDepth = inf.workDepth ?? Math.min(inf.contextLength, idx.constants.inference.reportDepthTokens);
      inference = { layout, ctx: c, concurrency: B, workDepth, stepAtWork: decodeStep(c, B, workDepth) };
    }
  } else if (mcRamBytes > 0) {
    const ram = systemRam(idx, build);
    const need = mcRamBytes + idx.constants.memory.osReserveGB * idx.constants.memory.bytesPerMarketedGB;
    if (need > ram.capacityBytes) failures.push({ code: 'memory', message: `Game servers need ${(need / 1e9).toFixed(1)} GB of RAM including the OS; ${(ram.capacityBytes / 1e9).toFixed(1)} GB installed.` });
  }

  // Power, temperature, noise at the room's steady state
  const work = workFrom(idx, build, inference, mcResults);
  let roomC = room.ambientC;
  let op = null;
  for (let i = 0; i < 4; i++) {
    op = operatingPoint(idx, build, room, roomC, work);
    roomC = roomSteadyC(idx, room, op.power.wallW);
  }
  op = operatingPoint(idx, build, room, roomC, work);

  const psuE = op.power.psu;
  if (psuE && op.power.dcW > psuE.ratedW) {
    failures.push({ code: 'power', message: `The build draws ${op.power.dcW.toFixed(0)} W DC, more than the ${psuE.ratedW} W power supply can deliver.` });
  }
  let psuSpare = null;
  if (psuE && psuE.modules > 1) {
    psuSpare = psuE.modules - Math.ceil(op.power.dcW / psuE.moduleW);
    if (psuSpare <= 0 && op.power.dcW <= psuE.ratedW) warnings.push(`No power redundancy: the ${psuE.modules} power modules are all needed for ${op.power.dcW.toFixed(0)} W, so one module failure takes the node down.`);
  }
  const pdu = build.pdu ? idx.parts.get(build.pdu) : null;
  if (pdu && op.power.wallW > pdu.capacityW) {
    failures.push({ code: 'power', message: `The build pulls ${op.power.wallW.toFixed(0)} W from the wall, more than the ${pdu.capacityW} W the PDU can supply.` });
  }
  if (op.thermalFailure) {
    failures.push({ code: 'thermal', message: `Parts overheat: to stay under their max temperature they would have to drop below ${Math.round(idx.constants.thermal.throttleFloorFraction * 100)}% power (room reaches ${roomC.toFixed(1)} C).` });
  }
  op.gpuPowerScale.forEach((p, i) => {
    if (p < 0.999 && work.gpuActive[i]) warnings.push(`GPU ${i} is thermally throttled to ${(p * 100).toFixed(0)}% power.`);
  });

  let infOut = null;
  if (inference) {
    const c = makeContext(idx, build, inference.ctx.inf, inference.layout, memory, { perfScale: op.perfScale });
    const ctxLen = inference.ctx.inf.contextLength;
    const rd = idx.constants.inference.reportDepthTokens;
    const depths = [...new Set([rd, Math.round(ctxLen / 4), Math.round(ctxLen / 2), ctxLen].filter((d) => d > 0 && d <= ctxLen))].sort((a, b) => a - b);
    const curve = depths.map((d) => ({ depth: d, ...pick(decodeRate(c, inference.concurrency, d)) }));
    const prompt = inference.ctx.inf.promptTokens ?? Math.min(ctxLen, idx.constants.inference.defaultPromptTokens);
    infOut = {
      concurrency: inference.concurrency,
      decodeAtWork: pick(decodeRate(c, inference.concurrency, inference.workDepth)),
      decodeCurve: curve,
      fullContextPrefillS: prefillSeconds(c, ctxLen),
      promptTokens: prompt,
      ttftS: prefillSeconds(c, prompt),
      stages: decodeStep(c, inference.concurrency, inference.workDepth).stages,
      throttled: Object.values(op.perfScale).some((p) => p < 0.999),
    };
  }

  const noise = noiseAtListener(idx, build, room, { caseFanSpeed: op.caseFanSpeed, gpuTemps: op.temps.gpuTemps, cpu: op.temps.cpu });
  const fans = allFans(idx, build);
  const reliability = failureRates(idx, build, {
    gpuTemps: op.temps.gpuTemps, gpuLoad: work.gpuActive.map((a) => (a ? 1 : 0)),
    cpuTempC: op.temps.cpu?.tempC ?? roomC, driveTempC: op.temps.inletC + idx.constants.thermal.driveRiseC,
    roomC, psuLoadPct: op.power.loadPct, inletC: op.temps.inletC, fans,
  });

  return {
    failures, warnings,
    memory: memory && summarizeMemory(memory),
    inference: infOut,
    gameServers: mcResults,
    power: { dcW: op.power.dcW, wallW: op.power.wallW, psuEfficiency: op.power.efficiency, psuLoadPct: op.power.loadPct, byPart: op.power.byPart, psuModules: psuE?.modules ?? (psuE ? 1 : 0), psuSpareModules: psuSpare, pduCapacityW: pdu?.capacityW ?? null },
    thermal: {
      roomC, ambientC: room.ambientC, caseInletC: op.temps.inletC, caseAirflowCFM: op.temps.airflowCFM,
      caseFanSpeed: op.caseFanSpeed, cpuFanMode: op.cpuFanMode,
      gpus: op.temps.gpuTemps.map((g, i) => ({ tempC: g.tempC, maxC: g.maxC, fanSpeed: g.fanSpeed, powerScale: op.gpuPowerScale[i] })),
      cpu: op.temps.cpu ? { tempC: op.temps.cpu.tempC, maxC: op.temps.cpu.maxC } : null,
    },
    noise: { atListenerDBA: noise.atListener, at1mDBA: noise.total1m, sources: noise.sources },
    reliability,
    _op: op, _work: work, _build: build, _idx: idx, _inference: inference, _memory: memory,
  };
}

function pick(r) {
  return { perSequence: r.perSequence, aggregate: r.aggregate };
}

function summarizeMemory(m) {
  return {
    fits: m.fits,
    kvBytesTotal: m.kvBytesTotal,
    devices: m.devices.filter((d) => d.used).map((d) => ({
      gpu: d.index, name: d.name, needBytes: d.need, usableBytes: d.usableBytes,
      weightsBytes: d.weights, kvBytes: d.kv, overheadBytes: d.overhead, offloadedBytes: d.offloaded, fits: d.fits,
    })),
    cpu: m.cpu,
  };
}
