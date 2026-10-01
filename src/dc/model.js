// Personal datacenter (stage 9): what each node can serve, computed by the
// same simulation as client jobs (evaluateBuild), not a second set of formulas.
// Every game-design number lives in constants.datacenter (pending sign-off).

import { evaluateBuild } from '../sim/evaluate.js';
import { minecraftLoad } from '../sim/gameserver.js';
import { systemRam } from '../sim/memory.js';
import { referenceSoftware } from '../jobs/software.js';
import { configKey } from '../game/flow.js';

export const ROLES = ['inference', 'game', 'vm'];
export const ROLE_UNITS = { inference: 'tok/s', game: 'players', vm: 'vCPUs' };

// The hall: the data-hall room archetype at its smallest, plus cooling units.
export function hallRoom(catalog, idx, dc, hallC) {
  const arch = catalog.roomArchetypes.find((r) => r.tier === 'datacenter');
  const k = idx.constants.datacenter;
  const floor = arch.floorAreaM2.min;
  const h = arch.heightM.min;
  return {
    archetype: arch.id, name: arch.displayName, floorAreaM2: floor, heightM: h,
    wallAreaM2: 2 * floor + 4 * Math.sqrt(floor) * h,
    wallUValue: arch.wallUValue.min, ambientC: arch.ambientC.min,
    airChangesPerHour: arch.airChangesPerHour.min + dc.coolingUnits * k.coolingStepAch,
    listenerDistanceM: arch.listenerDistanceM.min, currentC: hallC,
  };
}

// The node's inlet is the hall air: evaluate it in a "room" that is the hall
// at its current temperature with no build-up of its own.
function nodeRoom(idx, hall) {
  return { ...hall, ambientC: hall.currentC, airChangesPerHour: idx.constants.datacenter.nodeInletAch };
}

function maxPlayersPerServer(idx, build) {
  let lo = 0;
  let hi = 2000;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const r = minecraftLoad(idx, build, { type: 'minecraft', players: mid });
    if (r.tps >= idx.constants.minecraft.ticksPerSecond - 1e-9) lo = mid; else hi = mid - 1;
  }
  return lo;
}

function nicGbps(idx, build) {
  let g = 0;
  for (const n of build.network ?? []) {
    const p = idx.parts.get(n.part);
    for (const port of p.ports ?? []) g += (port.speedGbps ?? 0) * (port.count ?? 1) * (n.count ?? 1);
  }
  return g > 0 ? g : idx.constants.datacenter.onboardNicGbps;
}

const cache = new Map();

// Capacity and full-load / idle readings for one node at the hall's current
// temperature (rounded to 1 C so the cache stays small).
export function nodeProfile(catalog, idx, node, hall) {
  const hallC = Math.round(hall.currentC);
  const key = `${configKey(node.build, { role: node.role, model: node.model })}|${hallC}|${hall.airChangesPerHour}`;
  if (cache.has(key)) return cache.get(key);
  const k = idx.constants.datacenter;
  const room = nodeRoom(idx, { ...hall, currentC: hallC });
  const b = node.build;
  const cpu = idx.parts.get(b.cpu);
  const nCpu = b.cpuCount ?? 1;
  const ramGB = systemRam(idx, b).capacityBytes / idx.constants.memory.bytesPerMarketedGB;
  const idle = evaluateBuild(catalog, b, {}, room, { idx });
  let full = null;
  let capacity = 0;
  let extra = {};
  if (node.role === 'inference') {
    // Largest concurrency up to the set-up value that fits in memory.
    for (let c = k.inferenceConcurrency; c >= 1; c = Math.floor(c / 2)) {
      const sw = referenceSoftware(idx, { inference: { model: node.model, contextLength: Math.min(k.inferenceContext, idx.models.get(node.model).maxContextNative), concurrency: c } }, b);
      const ev = evaluateBuild(catalog, b, sw, room, { idx });
      if (!ev.failures?.length && ev.inference) { full = ev; extra = { concurrency: c }; break; }
      if (c === 1) { full = ev; break; }
    }
    capacity = full?.inference?.decodeAtWork.aggregate ?? 0;
    const devs = full?.memory?.devices ?? [];
    extra.vramFrac = devs.length ? Math.max(...devs.map((d) => d.needBytes / d.usableBytes)) : 0;
  } else if (node.role === 'game') {
    const mc = idx.constants.minecraft;
    // Players are limited by tick time per server (CPU) and by total RAM.
    const cpuServers = Math.max(1, Math.floor((cpu.cores * nCpu) / k.coresPerGameServer));
    const ramFree = ramGB - idx.constants.memory.osReserveGB;
    const servers = Math.max(1, Math.min(cpuServers, Math.floor(ramFree / (mc.ramGBBase + mc.ramGBPerPlayer))));
    const per = Math.min(maxPlayersPerServer(idx, b), Math.floor((ramFree / servers - mc.ramGBBase) / mc.ramGBPerPlayer));
    const sw = { os: 'linux', gameServers: Array.from({ length: servers }, () => ({ type: 'minecraft', players: Math.max(1, per) })) };
    full = evaluateBuild(catalog, b, sw, room, { idx });
    capacity = servers * per;
    extra = { servers, playersPerServer: per, ramPerPlayerGB: idx.constants.minecraft.ramGBPerPlayer };
  } else {
    const vcpus = Math.floor(cpu.threads * nCpu * k.vmOvercommit);
    const ramCap = Math.max(0, ramGB - idx.constants.virt.hostReserveGB);
    const sw = { os: 'proxmox', cloud: { count: 1, vcpus, ramGB: ramCap, diskGB: 1, cpuType: 'host', diskFormat: 'raw' } };
    full = evaluateBuild(catalog, b, sw, room, { idx });
    capacity = vcpus;
    extra = { ramCapGB: ramCap, iopsCap: full.cloud?.iopsPerVm ?? 0 };
  }
  const failures = full?.failures ?? [{ message: 'Could not evaluate this node.' }];
  const gpuMax = (ev) => Math.max(0, ...(ev.thermal?.gpus ?? []).map((g) => g.tempC));
  const p = {
    ok: failures.length === 0 && capacity > 0,
    error: failures[0]?.message ?? (capacity > 0 ? null : 'This node has no capacity for its role.'),
    role: node.role, capacity, ramGB, netGbps: nicGbps(idx, b), ...extra,
    idleW: idle.power?.wallW ?? 0, fullW: full?.power?.wallW ?? 0,
    gpuC: [gpuMax(idle), gpuMax(full ?? idle)], cpuC: [idle.thermal?.cpu?.tempC ?? hallC, full?.thermal?.cpu?.tempC ?? hallC],
    throttled: !!full?.inference?.throttled || (full?.thermal?.gpus ?? []).some((g) => g.powerScale < 0.999),
    cpuLoadFull: full?._work?.cpuLoad ?? 0, cpuLoadIdle: idle?._work?.cpuLoad ?? 0,
    temps: full?.thermal ?? null, rackUnits: idx.parts.get(b.chassis)?.rackUnits ?? 4,
  };
  if (cache.size > 2000) cache.clear();
  cache.set(key, p);
  return p;
}

const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));

// Gauges for one node at utilization u (demand / capacity, can exceed 1).
// Power and temperatures interpolate between the node's idle and full-load
// evaluations (an approximation, pending sign-off).
export function nodeGauges(idx, p, u, demandUnits) {
  const k = idx.constants.datacenter;
  const m = Math.min(1, u);
  const g = { util: u, wallW: lerp(p.idleW, p.fullW, m), gpuC: lerp(p.gpuC[0], p.gpuC[1], m), cpuC: lerp(p.cpuC[0], p.cpuC[1], m) };
  let netBps = 0;
  if (p.role === 'inference') {
    g.gpu = u; g.vram = p.vramFrac; g.cpu = lerp(p.cpuLoadIdle, p.cpuLoadFull, m);
    g.ram = null; g.iops = null;
    netBps = demandUnits * k.netBitsPerToken;
  } else if (p.role === 'game') {
    g.gpu = null; g.vram = null; g.cpu = u;
    g.ram = (demandUnits * p.ramPerPlayerGB) / p.ramGB; g.iops = null;
    netBps = demandUnits * k.netKbpsPerPlayer * 1e3;
  } else {
    g.gpu = null; g.vram = null; g.cpu = u;
    g.ram = p.ramCapGB > 0 ? (demandUnits * k.vmRamGBPerVcpu) / p.ramCapGB : 99;
    g.iops = p.iopsCap > 0 ? (demandUnits * k.vmIopsPerVcpu) / p.iopsCap : 99;
    netBps = demandUnits * k.netMbpsPerVcpu * 1e6;
  }
  g.net = netBps / (p.netGbps * 1e9);
  return g;
}
