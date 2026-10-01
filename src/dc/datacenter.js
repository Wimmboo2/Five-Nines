// Personal datacenter state, purchases and the hourly simulation step.
// State is plain data (ids and numbers) so it saves as is. Randomness comes
// from a seeded generator whose state is part of the save, so a reload
// continues the exact same sequence.

import { hallRoom, nodeProfile, nodeGauges, ROLES } from './model.js';
import { roomStep } from '../sim/thermal.js';
import { buildCost } from '../jobs/cost.js';
import { allFans } from '../sim/power.js';
import { RAID_LEVELS, driveCount, nodeDataTB, rebuildUreRisk, upsRuntimeMin, penaltyFraction, rollPartFailures } from './failures.js';

// Utilization shown when there is demand but no working capacity (JSON has no Infinity).
export const NO_CAPACITY = 99;
export const START_RACK = 'rack-hollow-42';
export const START_PDU = 'pdu-conduit-17k';

// mulberry32 with its state kept outside, so it can be saved.
export function rngNext(state) {
  const a = (state + 0x6d2b79f5) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, a];
}

export function openCost(idx) {
  return idx.parts.get(START_RACK).priceUSD + idx.parts.get(START_PDU).priceUSD;
}

export function newDatacenter(catalog, idx, seed = 1) {
  const k = idx.constants.datacenter;
  const dc = {
    seed, rngState: seed >>> 0, simH: 0, utilityW: k.startUtilityW, coolingUnits: 0, reputation: k.reputationStart,
    racks: [{ id: 'rack-1', part: START_RACK, pdus: [START_PDU] }], nodes: [], customers: [], nextId: 1,
    overH: { inference: 0, game: 0, vm: 0 }, history: [], alerts: [], last: null, totals: { earnedUSD: 0, powerUSD: 0, backupUSD: 0, penaltyUSD: 0 },
    offsite: false, upsUnits: 0,
  };
  dc.hallC = hallRoom(catalog, idx, dc, 0).ambientC;
  return dc;
}

// ---- purchases: each returns { dc, costUSD } or { error } ----

export function rackUnitsUsed(catalog, idx, dc, rackId) {
  return dc.nodes.filter((n) => n.rackId === rackId).reduce((a, n) => a + (idx.parts.get(n.build.chassis)?.rackUnits ?? 4), 0);
}

export function buyRack(idx, dc) {
  const id = `rack-${dc.racks.length + 1}`;
  return { dc: { ...dc, racks: [...dc.racks, { id, part: START_RACK, pdus: [START_PDU] }] }, costUSD: openCost(idx) };
}
export function buyPdu(idx, dc, rackId) {
  return { dc: { ...dc, racks: dc.racks.map((r) => (r.id === rackId ? { ...r, pdus: [...r.pdus, START_PDU] } : r)) }, costUSD: idx.parts.get(START_PDU).priceUSD };
}
export function buyCooling(idx, dc) {
  return { dc: { ...dc, coolingUnits: dc.coolingUnits + 1 }, costUSD: idx.constants.datacenter.coolingStepUSD };
}
export function buyUtility(idx, dc) {
  const k = idx.constants.datacenter;
  return { dc: { ...dc, utilityW: dc.utilityW + k.utilityStepW }, costUSD: k.utilityStepUSD };
}
export function buyNode(catalog, idx, dc, { build, role, model, rackId }) {
  if (!ROLES.includes(role)) return { error: 'Pick what the node serves.' };
  if (role === 'inference' && (!build.gpus.length || !idx.models.has(model))) return { error: 'An inference node needs GPUs and a model.' };
  const rack = dc.racks.find((r) => r.id === rackId);
  if (!rack) return { error: 'Pick a rack.' };
  const units = idx.parts.get(build.chassis)?.rackUnits ?? 4;
  const cap = idx.parts.get(rack.part).rackUnits;
  if (rackUnitsUsed(catalog, idx, dc, rackId) + units > cap) return { error: `Not enough room: the node needs ${units}U and the rack has ${cap - rackUnitsUsed(catalog, idx, dc, rackId)}U free.` };
  const node = { id: `node-${dc.nextId}`, rackId, role, model: role === 'inference' ? model : null, build, raid: 'none', snapshots: false, dead: [], deadDrives: 0, dataLost: false, down: false };
  return { dc: { ...dc, nodes: [...dc.nodes, node], nextId: dc.nextId + 1 }, costUSD: buildCost(idx, build) };
}
// Adds a network card from the catalog to a node (the template nodes only
// have an onboard port).
export function buyNic(idx, dc, nodeId, partId) {
  const part = idx.parts.get(partId);
  if (!part || part.category !== 'network' || !(part.ports ?? []).length) return { error: 'Pick a network card.' };
  const nodes = dc.nodes.map((n) => (n.id === nodeId ? { ...n, build: { ...n.build, network: [...(n.build.network ?? []), { part: partId, count: 1 }] } } : n));
  return { dc: { ...dc, nodes }, costUSD: part.priceUSD };
}

// ---- stage 9b: repairs and protection ----
const mapNode = (dc, id, f) => ({ ...dc, nodes: dc.nodes.map((n) => (n.id === id ? f(n) : n)) });
const isDown = (n) => n.dataLost || n.dead.some((d) => !d.key.startsWith('fan:') && !d.key.startsWith('storage:'));

export function partPrice(idx, build, key) {
  const [kind, i] = key.split(':');
  if (kind === 'fan') return allFans(idx, build)[+i]?.part?.priceUSD ?? 0;
  const id = kind === 'gpu' ? build.gpus[+i]?.part : kind === 'ram' ? build.ram[+i]?.part : kind === 'storage' ? build.storage[+i]?.part
    : kind === 'cpu' ? build.cpu : kind === 'psu' ? build.psu : null;
  return id ? idx.parts.get(id).priceUSD : 0;
}
// Replacing one dead part: costs that part's price. A replaced drive rebuilds
// into the array; a node whose data was lost comes back empty.
export function replacePart(idx, dc, nodeId, key) {
  const n = dc.nodes.find((x) => x.id === nodeId);
  const d = n?.dead.find((x) => x.key === key);
  if (!d) return { error: 'Nothing to replace.' };
  const dead = n.dead.filter((x) => x !== d);
  const deadDrives = key.startsWith('storage:') ? Math.max(0, n.deadDrives - 1) : n.deadDrives;
  const dataLost = n.dataLost && deadDrives > 0 ? n.dataLost : false;
  const next = { ...n, dead, deadDrives, dataLost: key.startsWith('storage:') ? dataLost : n.dataLost };
  return { dc: mapNode(dc, nodeId, () => ({ ...next, down: isDown(next) })), costUSD: partPrice(idx, n.build, key) };
}
export function restoreNode(dc, nodeId) {
  return { dc: mapNode(dc, nodeId, (n) => { const x = { ...n, dataLost: n.dead.some((d) => d.key.startsWith('storage:')) }; return { ...x, down: isDown(x) }; }), costUSD: 0 };
}
export function addDrive(idx, dc, nodeId, partId) {
  const part = idx.parts.get(partId);
  if (!part || part.category !== 'storage') return { error: 'Pick a drive.' };
  return { dc: mapNode(dc, nodeId, (n) => {
    const st = n.build.storage ?? [];
    const has = st.find((s) => s.part === partId);
    const storage = has ? st.map((s) => (s.part === partId ? { ...s, count: (s.count ?? 1) + 1 } : s)) : [...st, { part: partId, count: 1 }];
    return { ...n, build: { ...n.build, storage } };
  }), costUSD: part.priceUSD };
}
export function setRaid(dc, nodeId, level) {
  const n = dc.nodes.find((x) => x.id === nodeId);
  const lvl = RAID_LEVELS[level];
  if (!n || !lvl) return { error: 'Unknown RAID level.' };
  if (driveCount(n.build) < lvl.minDrives) return { error: `${level.toUpperCase()} needs at least ${lvl.minDrives} drives; this node has ${driveCount(n.build)}.` };
  if (n.deadDrives) return { error: 'Replace the dead drive before changing RAID.' };
  return { dc: mapNode(dc, nodeId, (x) => ({ ...x, raid: level })), costUSD: 0 };
}
export function setSnapshots(dc, nodeId, on) { return { dc: mapNode(dc, nodeId, (x) => ({ ...x, snapshots: !!on })), costUSD: 0 }; }
export function setOffsite(dc, on) { return { dc: { ...dc, offsite: !!on }, costUSD: 0 }; }
export function buyUps(idx, dc) { return { dc: { ...dc, upsUnits: dc.upsUnits + 1 }, costUSD: idx.constants.datacenter.upsUnitUSD }; }

export function sellNode(idx, dc, nodeId) {
  return { dc: { ...dc, nodes: dc.nodes.filter((n) => n.id !== nodeId) }, costUSD: 0 };
}

// ---- the simulation step ----

const HOURS_PER_MONTH = 8766 / 12;
const rhythm = (k, h) => 1 + k.rhythmAmplitude * Math.sin((2 * Math.PI * h) / k.rhythmPeriodH);

// Advances the datacenter by dtH simulated hours (called in 1 h steps).
// Returns the new state, the money change and the per-node readings.
export function stepDatacenter(catalog, idx, dc0, dtH = 1, opts = {}) {
  const k = idx.constants.datacenter;
  const dc = structuredClone(dc0);
  // Fields added in stage 9b default for datacenters opened before it.
  dc.offsite ??= false; dc.upsUnits ??= 0;
  dc.totals.backupUSD ??= 0; dc.totals.penaltyUSD ??= 0;
  for (const n of dc.nodes) { n.dead ??= []; n.raid ??= 'none'; n.snapshots ??= false; n.deadDrives ??= 0; n.dataLost ??= false; n.down ??= false; }
  let rng = dc.rngState;
  const rand = () => { const [v, s] = rngNext(rng); rng = s; return v; };
  const hall = hallRoom(catalog, idx, dc, dc.hallC);

  // Capacity per node and per workload.
  const profiles = dc.nodes.map((n) => {
    const p = nodeProfile(catalog, idx, n, hall);
    if (!n.down) return p;
    const why = n.dataLost ? 'its data was lost; replace the drives and restore' : `${n.dead.find((d) => !d.key.startsWith('fan:'))?.label ?? 'a part'} is dead`;
    return { ...p, ok: false, capacity: 0, error: `Down: ${why}.`, fullW: p.idleW };
  });
  const served = Object.fromEntries(ROLES.map((r) => [r, dc.nodes.some((n, i) => n.role === r && profiles[i].ok)]));

  // New customers, spikes, spike expiry.
  for (const role of ROLES) {
    if (!served[role]) continue;
    const rate = k.arrivalsPerHourAt50Rep * (dc.reputation / 50) * (1 + k.growthPerDay) ** (dc.simH / 24) * dtH;
    if (rand() < Math.min(1, rate)) {
      const [lo, hi] = role === 'inference' ? [k.inferenceSizeMin, k.inferenceSizeMax] : role === 'game' ? [k.gameSizeMin, k.gameSizeMax] : [k.vmSizeMin, k.vmSizeMax];
      dc.customers.push({ id: `c-${dc.nextId++}`, role, size: Math.round(lo + (hi - lo) * rand()), since: dc.simH, spike: null });
    }
  }
  for (const c of dc.customers) if (c.spike && c.spike.untilH <= dc.simH) c.spike = null;
  if (dc.customers.length && rand() < k.spikeChancePerHour * dtH) {
    const c = dc.customers[Math.floor(rand() * dc.customers.length)];
    if (!c.spike) {
      c.spike = { mult: k.spikeMultMin + (k.spikeMultMax - k.spikeMultMin) * rand(), untilH: dc.simH + k.spikeHoursMin + (k.spikeHoursMax - k.spikeHoursMin) * rand() };
      dc.alerts.unshift({ h: dc.simH, level: 'warning', text: `A ${c.role === 'game' ? 'game-server' : c.role === 'vm' ? 'VM' : 'inference'} customer's demand spiked x${c.spike.mult.toFixed(1)}.` });
    }
  }

  // Site power: if the nodes want more than the utility feed or a rack's PDUs
  // can supply, every node is held back to fit.
  const rh = rhythm(k, dc.simH);
  const demand = Object.fromEntries(ROLES.map((r) => [r, dc.customers.filter((c) => c.role === r).reduce((a, c) => a + c.size * (c.spike?.mult ?? 1), 0) * rh]));
  const capByRole = Object.fromEntries(ROLES.map((r) => [r, dc.nodes.reduce((a, n, i) => a + (n.role === r && profiles[i].ok ? profiles[i].capacity : 0), 0)]));
  const firstPass = dc.nodes.map((n, i) => {
    const p = profiles[i];
    const u = p.ok && capByRole[n.role] > 0 ? demand[n.role] / capByRole[n.role] : 0;
    return nodeGauges(idx, p, u, p.ok ? demand[n.role] * (p.capacity / Math.max(1e-9, capByRole[n.role])) : 0);
  });
  const wantW = firstPass.reduce((a, g) => a + g.wallW, 0);
  let powerFactor = wantW > dc.utilityW ? dc.utilityW / wantW : 1;
  for (const r of dc.racks) {
    const pduW = r.pdus.reduce((a, id) => a + idx.parts.get(id).capacityW, 0);
    const rackW = dc.nodes.reduce((a, n, i) => a + (n.rackId === r.id ? firstPass[i].wallW : 0), 0);
    if (rackW > pduW) powerFactor = Math.min(powerFactor, pduW / rackW);
  }

  // Utilization per workload after the power limit; VMs are limited by
  // whichever of vCPU, RAM or IOPS runs out first.
  const util = {};
  for (const r of ROLES) {
    const cap = capByRole[r] * powerFactor;
    let u = cap > 0 ? demand[r] / cap : (demand[r] > 0 ? NO_CAPACITY : 0);
    if (r === 'vm' && cap > 0) {
      const ram = dc.nodes.reduce((a, n, i) => a + (n.role === 'vm' && profiles[i].ok ? profiles[i].ramCapGB : 0), 0) * powerFactor;
      const iops = dc.nodes.reduce((a, n, i) => a + (n.role === 'vm' && profiles[i].ok ? profiles[i].iopsCap : 0), 0) * powerFactor;
      u = Math.max(u, demand.vm * k.vmRamGBPerVcpu / Math.max(1e-9, ram), demand.vm * k.vmIopsPerVcpu / Math.max(1e-9, iops));
    }
    // Network: a workload is also overloaded when its nodes' links are full.
    const nodesR = dc.nodes.map((n, i) => [n, i]).filter(([n, i]) => n.role === r && profiles[i].ok);
    if (nodesR.length && cap > 0) {
      const netCap = nodesR.reduce((a, [, i]) => a + profiles[i].netGbps * 1e9, 0);
      const perUnit = r === 'inference' ? k.netBitsPerToken : r === 'game' ? k.netKbpsPerPlayer * 1e3 : k.netMbpsPerVcpu * 1e6;
      u = Math.max(u, (demand[r] * perUnit) / netCap);
    }
    util[r] = u;
  }
  const nodes = dc.nodes.map((n, i) => {
    const p = profiles[i];
    const share = p.ok && capByRole[n.role] > 0 ? p.capacity / capByRole[n.role] : 0;
    const g = nodeGauges(idx, p, p.ok ? util[n.role] : 0, demand[n.role] * share);
    return { id: n.id, role: n.role, ok: p.ok, error: p.error, capacity: p.capacity * powerFactor, throttled: p.throttled, fullW: p.fullW, ...g };
  });
  const wallW = nodes.reduce((a, g) => a + g.wallW, 0);

  // Money: customers pay for what they asked for, scaled down when service is slow.
  const pay = { inference: (d) => (d * 3600 / 1e6) * k.priceUSDPerMTokens, game: (d) => d * k.priceUSDPerPlayerHour, vm: (d) => d * k.priceUSDPerVcpuHour };
  let income = 0;
  for (const r of ROLES) income += pay[r](demand[r]) * (util[r] > k.slowAbove ? 1 / util[r] : 1) * dtH;
  let powerCost = (wallW / 1000) * dtH * k.electricityUSDPerKWh;

  // ---- stage 9b: failures, power cuts, bad changes, site loss ----
  const force = opts.force ?? {};
  let penalty = 0;
  const loseData = (n, cause) => {
    n.dataLost = true; n.down = true;
    const fine = penaltyFraction(k, opts.difficulty) * Math.max(0, opts.money ?? 0);
    penalty += fine;
    dc.reputation = Math.max(0, dc.reputation - k.dataLossRepLoss);
    const victim = dc.customers.filter((c) => c.role === n.role).sort((a, b) => b.size - a.size)[0];
    if (victim) dc.customers = dc.customers.filter((c) => c !== victim);
    dc.alerts.unshift({ h: dc.simH, level: 'critical', kind: 'data-loss', node: n.id, text: `DATA LOST on ${n.id}: ${cause}. Customers lost data; penalty $${Math.round(fine).toLocaleString('en-US')}, reputation -${k.dataLossRepLoss}.` });
  };
  for (const ev of rollPartFailures(idx, dc, nodes, dtH, rand, force.part)) {
    const n = dc.nodes.find((x) => x.id === ev.nodeId);
    n.dead.push({ key: ev.key, label: ev.label });
    if (ev.key.startsWith('storage:')) {
      n.deadDrives += 1;
      const lvl = RAID_LEVELS[n.raid ?? 'none'];
      if (n.deadDrives > lvl.tolerates) loseData(n, `${ev.label} died with no ${n.raid === 'none' ? 'RAID' : 'redundancy left'}`);
      else if (n.deadDrives === lvl.tolerates && lvl.tolerates === 1 && rand() < (force.ure ?? rebuildUreRisk(idx, n))) loseData(n, `the rebuild after ${ev.label} hit an unrecoverable read error`);
      else dc.alerts.unshift({ h: dc.simH, level: 'serious', kind: 'part', node: n.id, text: `${ev.label} in ${n.id} died. ${n.raid.toUpperCase()} kept the data; replace the drive.` });
    } else {
      dc.alerts.unshift({ h: dc.simH, level: ev.key.startsWith('fan:') ? 'serious' : 'critical', kind: 'part', node: n.id, text: `${ev.label} in ${n.id} died.${ev.key.startsWith('fan:') ? '' : ` ${n.id} is down until it's replaced.`}` });
    }
    n.down = n.dataLost || n.dead.some((d) => !d.key.startsWith('fan:') && !d.key.startsWith('storage:'));
  }
  for (const n of dc.nodes) {
    if (n.dataLost || !(force.badChange === n.id || rand() < 1 - Math.exp(-(k.badChangePerNodeYear / 8766) * dtH))) continue;
    if (n.snapshots) dc.alerts.unshift({ h: dc.simH, level: 'warning', kind: 'backup', node: n.id, text: `A bad change wiped data on ${n.id}; rolled back from a snapshot.` });
    else loseData(n, 'a bad change deleted it and there were no snapshots');
  }
  if (force.siteLoss || rand() < 1 - Math.exp(-(k.siteLossPerYear / 8766) * dtH)) {
    if (dc.offsite) dc.alerts.unshift({ h: dc.simH, level: 'serious', kind: 'backup', text: 'A fire in the hall destroyed the stored data; everything was restored from the offsite copy.' });
    else for (const n of dc.nodes) if (!n.dataLost) loseData(n, 'a fire destroyed the site\'s data and there was no offsite copy');
  }
  let darkFrac = 0;
  const cutMin = force.powerCutMin ?? (rand() < 1 - Math.exp(-(k.powerCutsPerYear / 8766) * dtH) ? -Math.log(1 - rand()) * k.powerCutMeanMin : 0);
  if (cutMin > 0) {
    const runtime = upsRuntimeMin(k, dc.upsUnits, wallW);
    if (runtime >= cutMin) dc.alerts.unshift({ h: dc.simH, level: 'warning', kind: 'power', text: `Utility power cut for ${Math.round(cutMin)} min; the UPS carried the site (runtime ${Math.round(Math.min(runtime, 9999))} min at this load).` });
    else {
      darkFrac = Math.min(1, (cutMin - runtime) / (60 * dtH));
      dc.reputation = Math.max(0, dc.reputation - k.powerCutRepLoss);
      dc.alerts.unshift({ h: dc.simH, level: 'critical', kind: 'power', text: `Utility power cut for ${Math.round(cutMin)} min; ${dc.upsUnits ? `the UPS lasted ${Math.round(runtime)} min and ` : ''}the site went dark. Reputation -${k.powerCutRepLoss}.` });
    }
  }
  income *= 1 - darkFrac;
  powerCost *= 1 - darkFrac;
  const dataTB = dc.nodes.reduce((a, n) => a + nodeDataTB(idx, n), 0);
  const backupCost = ((dc.offsite ? dataTB * k.offsiteUSDPerTBMonth : 0)
    + dc.nodes.reduce((a, n) => a + (n.snapshots ? nodeDataTB(idx, n) * k.snapshotUSDPerTBMonth : 0), 0)) / (HOURS_PER_MONTH) * dtH;

  // Overload: customers leave after sustained heavy overload; reputation follows.
  for (const r of ROLES) {
    if (util[r] > k.churnAbove) {
      dc.overH[r] += dtH;
      if (dc.overH[r] >= k.churnAfterH) {
        dc.overH[r] = 0;
        const mine = dc.customers.filter((c) => c.role === r).sort((a, b) => b.size - a.size);
        if (mine.length) {
          dc.customers = dc.customers.filter((c) => c.id !== mine[0].id);
          dc.reputation = Math.max(0, dc.reputation - k.reputationLossPerChurn);
          dc.alerts.unshift({ h: dc.simH, level: 'critical', text: `An overloaded ${r === 'vm' ? 'VM' : r === 'game' ? 'game-server' : 'inference'} customer left (${mine[0].size} ${r === 'inference' ? 'tok/s' : r === 'game' ? 'players' : 'vCPUs'}). Reputation -${k.reputationLossPerChurn}.` });
        }
      }
    } else dc.overH[r] = 0;
  }
  if (ROLES.every((r) => util[r] <= k.slowAbove)) dc.reputation = Math.min(100, dc.reputation + k.reputationGainPerHour * dtH);
  if (powerFactor < 1) dc.alerts.unshift({ h: dc.simH, level: 'serious', text: `Power limit: the nodes want ${(wantW / 1000).toFixed(1)} kW, the site supplies ${(Math.min(dc.utilityW, wantW * powerFactor) / 1000).toFixed(1)} kW. Everything is running slower.` });

  // Hall air temperature from total heat and cooling (lumped room model).
  dc.hallC = roomStep(idx, hall, dc.hallC, wallW, dtH * 3600);
  if (dc.hallC > k.hallMaxC) dc.alerts.unshift({ h: dc.simH, level: 'critical', text: `The hall is at ${dc.hallC.toFixed(1)} C, over ${k.hallMaxC} C: add cooling or shed load.` });

  dc.simH += dtH;
  dc.rngState = rng;
  dc.totals.earnedUSD += income;
  dc.totals.powerUSD += powerCost;
  dc.totals.backupUSD += backupCost;
  dc.totals.penaltyUSD += penalty;
  dc.last = { upsRuntimeMin: upsRuntimeMin(k, dc.upsUnits, wallW), dataTB, backupCostPerH: backupCost / dtH, darkFrac, util, demand, capacity: Object.fromEntries(ROLES.map((r) => [r, capByRole[r] * powerFactor])), wallW, wantW, powerFactor, incomePerH: income / dtH, powerCostPerH: powerCost / dtH, nodes };
  dc.history.push({ h: dc.simH, util: { ...util }, wallW, hallC: dc.hallC, net: (income - powerCost) / dtH });
  if (dc.history.length > k.historyPoints) dc.history.splice(0, dc.history.length - k.historyPoints);
  dc.alerts = dc.alerts.slice(0, 30);
  return { dc, moneyDelta: income - powerCost - backupCost - penalty };
}
