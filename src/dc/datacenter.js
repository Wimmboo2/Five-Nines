// Personal datacenter state, purchases and the hourly simulation step.
// State is plain data (ids and numbers) so it saves as is. Randomness comes
// from a seeded generator whose state is part of the save, so a reload
// continues the exact same sequence.

import { hallRoom, nodeProfile, nodeGauges, ROLES, sizeClass, tokenPriceFor } from './model.js';
import { roomStep } from '../sim/thermal.js';
import { buildCost } from '../jobs/cost.js';
import { allFans } from '../sim/power.js';
import { RAID_LEVELS, driveCount, nodeDataTB, rebuildUreRisk, upsRuntimeMin, penaltyFraction, rollPartFailures, restoreHours } from './failures.js';
import { difficulty } from '../game/difficulty.js';

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
// Down: data gone, restoring from offsite, a core part dead, or more dead
// drives than the RAID level tolerates.
// PSU modules: down only when the surviving modules can't carry the node's
// full load (N+1 survives one dead module, N+2 two).
export const psuAlive = (n) => Math.max(1, n.build.psuCount ?? 1) - n.dead.filter((d) => d.key === 'psu').length;
const isDown = (n, nowH = -Infinity) => n.dataLost || (n.restoringUntilH != null && n.restoringUntilH > nowH)
  || n.dead.some((d) => !d.key.startsWith('fan:') && !d.key.startsWith('storage:') && d.key !== 'psu')
  || psuAlive(n) < (n.psuRequired ?? Math.max(1, n.build.psuCount ?? 1))
  || (n.deadDrives ?? 0) > RAID_LEVELS[n.raid ?? 'none'].tolerates;

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
  return { dc: mapNode(dc, nodeId, () => ({ ...next, down: isDown(next, dc.simH) })), costUSD: partPrice(idx, n.build, key) };
}
export function restoreNode(dc, nodeId) {
  return { dc: mapNode(dc, nodeId, (n) => { const x = { ...n, dataLost: n.dead.some((d) => d.key.startsWith('storage:')) }; return { ...x, down: isDown(x, dc.simH) }; }), costUSD: 0 };
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
  for (const n of dc.nodes) { n.dead ??= []; n.raid ??= 'none'; n.snapshots ??= false; n.deadDrives ??= 0; n.dataLost ??= false; n.down ??= false; n.restoringUntilH ??= null; }
  dc.lastOffsiteH ??= null;
  const diff = difficulty(idx, opts.difficulty);
  // Restores that finished bring their node back (if nothing else keeps it down).
  for (const n of dc.nodes) {
    if (n.restoringUntilH != null && n.restoringUntilH <= dc.simH) {
      n.restoringUntilH = null;
      dc.alerts.unshift({ h: dc.simH, level: 'warning', kind: 'backup', node: n.id, text: `${n.id} finished restoring from the offsite copy.` });
    }
    n.down = isDown(n, dc.simH);
  }
  // The offsite copy runs on its interval.
  if (dc.offsite && (dc.lastOffsiteH == null || dc.simH - dc.lastOffsiteH >= k.offsiteIntervalH)) dc.lastOffsiteH = dc.simH;
  let rng = dc.rngState;
  const rand = () => { const [v, s] = rngNext(rng); rng = s; return v; };
  const hall = hallRoom(catalog, idx, dc, dc.hallC);

  // Capacity per node and per workload.
  const profiles = dc.nodes.map((n) => {
    const p = nodeProfile(catalog, idx, n, hall);
    // Modules needed to carry the node at full load (wall watts, conservative).
    const psuPart = n.build.psu ? idx.parts.get(n.build.psu) : null;
    n.psuRequired = psuPart ? Math.max(1, Math.ceil(p.fullW / psuPart.ratedW)) : 1;
    n.down = isDown(n, dc.simH);
    if (!n.down) return p;
    const core = n.dead.find((d) => !d.key.startsWith('fan:') && !d.key.startsWith('storage:'));
    const why = n.dataLost ? 'its data was lost; replace the drives and restore'
      : core ? `${core.label} is dead`
        : n.restoringUntilH != null && n.restoringUntilH > dc.simH ? `restoring from the offsite copy, ${(n.restoringUntilH - dc.simH).toFixed(1)} h left`
          : 'its RAID lost too many drives; replace them';
    return { ...p, ok: false, capacity: 0, error: `Down: ${why}.`, fullW: p.idleW };
  });
  const served = Object.fromEntries(ROLES.map((r) => [r, dc.nodes.some((n, i) => n.role === r && profiles[i].ok)]));

  // Buckets: game servers, VMs, and one inference bucket per model size class
  // (tuning pass 1: customers ask for a size class and pay by it).
  const bucketOfNode = (n) => (n.role === 'inference' ? `inference:${sizeClass(idx, n.model)}` : n.role);
  const bucketOfCust = (c) => (c.role === 'inference' ? `inference:${c.cls ?? 'small'}` : c.role);
  const roleOf = (bk) => bk.split(':')[0];
  const servedBuckets = [...new Set(dc.nodes.map((n, i) => (profiles[i].ok ? bucketOfNode(n) : null)).filter(Boolean))].sort();

  // New customers: growth is linear and capped by a market ceiling, and even
  // at reputation 0 a trickle still arrives (reputationArrivalFloor).
  const growth = Math.min(k.marketCeiling, 1 + (k.growthPerDay * diff.demandMult * dc.simH) / 24);
  const repFactor = Math.max(dc.reputation, k.reputationArrivalFloor) / 50;
  for (const bk of servedBuckets) {
    const role = roleOf(bk);
    const rate = k.arrivalsPerHourAt50Rep * repFactor * growth * dtH;
    if (rand() < Math.min(1, rate)) {
      const [lo, hi] = role === 'inference' ? [k.inferenceSizeMin, k.inferenceSizeMax] : role === 'game' ? [k.gameSizeMin, k.gameSizeMax] : [k.vmSizeMin, k.vmSizeMax];
      dc.customers.push({ id: `c-${dc.nextId++}`, role, ...(role === 'inference' ? { cls: bk.split(':')[1] } : {}), size: Math.round(lo + (hi - lo) * rand()), since: dc.simH, spike: null });
    }
  }
  for (const c of dc.customers) if (c.spike && c.spike.untilH <= dc.simH) c.spike = null;
  if (dc.customers.length && rand() < k.spikeChancePerHour * diff.demandMult * dtH) {
    const c = dc.customers[Math.floor(rand() * dc.customers.length)];
    if (!c.spike) {
      c.spike = { mult: 1 + (k.spikeMultMin + (k.spikeMultMax - k.spikeMultMin) * rand() - 1) * diff.demandMult, untilH: dc.simH + k.spikeHoursMin + (k.spikeHoursMax - k.spikeHoursMin) * rand() };
      dc.alerts.unshift({ h: dc.simH, level: 'warning', text: `A ${c.role === 'game' ? 'game-server' : c.role === 'vm' ? 'VM' : `${c.cls ?? 'small'}-model inference`} customer's demand spiked x${c.spike.mult.toFixed(1)}.` });
    }
  }

  // Demand and capacity per bucket.
  const rh = rhythm(k, dc.simH);
  const allBuckets = [...new Set([...servedBuckets, ...dc.customers.map(bucketOfCust)])].sort();
  const demandB = Object.fromEntries(allBuckets.map((bk) => [bk, dc.customers.filter((c) => bucketOfCust(c) === bk).reduce((x, c) => x + c.size * (c.spike?.mult ?? 1), 0) * rh]));
  const capB = Object.fromEntries(allBuckets.map((bk) => [bk, dc.nodes.reduce((x, n, i) => x + (bucketOfNode(n) === bk && profiles[i].ok ? profiles[i].capacity : 0), 0)]));
  const shareOf = (n, i) => (profiles[i].ok && capB[bucketOfNode(n)] > 0 ? profiles[i].capacity / capB[bucketOfNode(n)] : 0);

  // Site power: if the nodes want more than the utility feed or a rack's PDUs
  // can supply, every node is held back to fit.
  const firstPass = dc.nodes.map((n, i) => {
    const bk = bucketOfNode(n);
    const u = profiles[i].ok && capB[bk] > 0 ? demandB[bk] / capB[bk] : 0;
    return nodeGauges(idx, profiles[i], u, demandB[bk] * shareOf(n, i));
  });
  const wantW = firstPass.reduce((x, g) => x + g.wallW, 0);
  let powerFactor = wantW > dc.utilityW ? dc.utilityW / wantW : 1;
  for (const r of dc.racks) {
    const pduW = r.pdus.reduce((x, id) => x + idx.parts.get(id).capacityW, 0);
    const rackW = dc.nodes.reduce((x, n, i) => x + (n.rackId === r.id ? firstPass[i].wallW : 0), 0);
    if (rackW > pduW) powerFactor = Math.min(powerFactor, pduW / rackW);
  }

  // Utilization per bucket after the power limit; VMs are limited by
  // whichever of vCPU, RAM or IOPS runs out first, and every bucket by its
  // nodes' network links.
  const utilB = {};
  for (const bk of allBuckets) {
    const role = roleOf(bk);
    const cap = capB[bk] * powerFactor;
    let u = cap > 0 ? demandB[bk] / cap : (demandB[bk] > 0 ? NO_CAPACITY : 0);
    const nodesB = dc.nodes.map((n, i) => [n, i]).filter(([n, i]) => bucketOfNode(n) === bk && profiles[i].ok);
    if (role === 'vm' && cap > 0) {
      const ram = nodesB.reduce((x, [, i]) => x + profiles[i].ramCapGB, 0) * powerFactor;
      const iops = nodesB.reduce((x, [, i]) => x + profiles[i].iopsCap, 0) * powerFactor;
      u = Math.max(u, demandB[bk] * k.vmRamGBPerVcpu / Math.max(1e-9, ram), demandB[bk] * k.vmIopsPerVcpu / Math.max(1e-9, iops));
    }
    if (nodesB.length && cap > 0) {
      const netCap = nodesB.reduce((x, [, i]) => x + profiles[i].netGbps * 1e9, 0);
      const perUnit = role === 'inference' ? k.netBitsPerToken : role === 'game' ? k.netKbpsPerPlayer * 1e3 : k.netMbpsPerVcpu * 1e6;
      u = Math.max(u, (demandB[bk] * perUnit) / netCap);
    }
    utilB[bk] = u;
  }
  // Per-workload summaries for the dashboard: the worst bucket of each role.
  const util = Object.fromEntries(ROLES.map((r) => [r, Math.max(0, ...allBuckets.filter((bk) => roleOf(bk) === r).map((bk) => utilB[bk]))]));
  const demand = Object.fromEntries(ROLES.map((r) => [r, allBuckets.filter((bk) => roleOf(bk) === r).reduce((x, bk) => x + demandB[bk], 0)]));
  const capByRole = Object.fromEntries(ROLES.map((r) => [r, allBuckets.filter((bk) => roleOf(bk) === r).reduce((x, bk) => x + capB[bk], 0)]));
  const nodes = dc.nodes.map((n, i) => {
    const p = profiles[i];
    const bk = bucketOfNode(n);
    const g = nodeGauges(idx, p, p.ok ? utilB[bk] : 0, demandB[bk] * shareOf(n, i));
    return { id: n.id, role: n.role, bucket: bk, ok: p.ok, error: p.error, capacity: p.capacity * powerFactor, throttled: p.throttled, fullW: p.fullW, ...g };
  });
  const wallW = nodes.reduce((x, g) => x + g.wallW, 0);

  // Money: customers pay for what they asked for, scaled down when service is
  // slow. Inference pays by model size class (tokenPriceFor).
  const pay = (bk, d) => {
    const role = roleOf(bk);
    if (role === 'inference') return (d * 3600 / 1e6) * tokenPriceFor(k, bk.split(':')[1]);
    return role === 'game' ? d * k.priceUSDPerPlayerHour : d * k.priceUSDPerVcpuHour;
  };
  let income = 0;
  for (const bk of allBuckets) income += pay(bk, demandB[bk]) * (utilB[bk] > k.slowAbove ? 1 / utilB[bk] : 1) * dtH;
  let powerCost = (wallW / 1000) * dtH * k.electricityUSDPerKWh;

  // ---- stage 9b: failures, power cuts, bad changes, site loss ----
  const force = opts.force ?? {};
  let penalty = 0;
  const nicOf = (n) => profiles[dc.nodes.indexOf(n)]?.netGbps ?? k.onboardNicGbps;
  const loseData = (n, cause) => {
    const full = penaltyFraction(idx, opts.difficulty) * Math.max(0, opts.money ?? 0);
    if (dc.offsite && dc.lastOffsiteH != null) {
      // Restore from the offsite copy: down while the data comes back; only
      // what changed since the last copy is lost (share of the copy interval).
      const sinceH = dc.simH - dc.lastOffsiteH;
      const lostShare = Math.min(1, sinceH / k.offsiteIntervalH);
      const hours = restoreHours(idx, n, nicOf(n));
      n.restoringUntilH = Math.max(n.restoringUntilH ?? 0, dc.simH + hours);
      n.down = true;
      const fine = full * lostShare;
      penalty += fine;
      const rep = Math.round(k.dataLossRepLoss * lostShare * 10) / 10;
      dc.reputation = Math.max(0, dc.reputation - rep);
      dc.alerts.unshift({ h: dc.simH, level: 'serious', kind: 'restore', node: n.id, text: `${n.id}: ${cause}. Restoring from the offsite copy (${hours.toFixed(1)} h); the last ${sinceH.toFixed(0)} h of changes are lost: penalty $${Math.round(fine).toLocaleString('en-US')}, reputation -${rep}.` });
      return;
    }
    n.dataLost = true; n.down = true;
    penalty += full;
    dc.reputation = Math.max(0, dc.reputation - k.dataLossRepLoss);
    const victim = dc.customers.filter((c) => c.role === n.role).sort((a, b) => b.size - a.size)[0];
    if (victim) dc.customers = dc.customers.filter((c) => c !== victim);
    dc.alerts.unshift({ h: dc.simH, level: 'critical', kind: 'data-loss', node: n.id, text: `DATA LOST on ${n.id}: ${cause}. Customers lost data; penalty $${Math.round(full).toLocaleString('en-US')}, reputation -${k.dataLossRepLoss}.` });
  };
  for (const ev of rollPartFailures(idx, dc, nodes, dtH, rand, force.part, diff.failureMult)) {
    const n = dc.nodes.find((x) => x.id === ev.nodeId);
    n.dead.push({ key: ev.key, label: ev.label });
    if (ev.key.startsWith('storage:')) {
      n.deadDrives += 1;
      const lvl = RAID_LEVELS[n.raid ?? 'none'];
      if (n.deadDrives === lvl.tolerates + 1) loseData(n, `${ev.label} died with no ${n.raid === 'none' ? 'RAID' : 'redundancy left'}`);
      else if (n.deadDrives === lvl.tolerates && lvl.tolerates === 1 && rand() < (force.ure ?? rebuildUreRisk(idx, n))) loseData(n, `the rebuild after ${ev.label} hit an unrecoverable read error`);
      else dc.alerts.unshift({ h: dc.simH, level: 'serious', kind: 'part', node: n.id, text: `${ev.label} in ${n.id} died. ${n.raid.toUpperCase()} kept the data; replace the drive.` });
    } else if (ev.key === 'psu' && (n.build.psuCount ?? 1) > 1) {
      const alive = psuAlive(n);
      const spare = alive - n.psuRequired;
      dc.alerts.unshift({ h: dc.simH, level: spare >= 0 ? 'serious' : 'critical', kind: 'part', node: n.id,
        text: spare >= 0 ? `A PSU module in ${n.id} died. ${alive} of ${n.build.psuCount} left, ${n.psuRequired} needed: still running (N+${spare}). Replace it to restore redundancy.`
          : `A PSU module in ${n.id} died. ${alive} of ${n.build.psuCount} left can't carry the load (${n.psuRequired} needed): ${n.id} is down until it's replaced.` });
    } else {
      dc.alerts.unshift({ h: dc.simH, level: ev.key.startsWith('fan:') ? 'serious' : 'critical', kind: 'part', node: n.id, text: `${ev.label} in ${n.id} died.${ev.key.startsWith('fan:') ? '' : ` ${n.id} is down until it's replaced.`}` });
    }
    n.down = isDown(n, dc.simH);
  }
  for (const n of dc.nodes) {
    if (n.dataLost || !(force.badChange === n.id || rand() < 1 - Math.exp(-((k.badChangePerNodeYear * diff.failureMult) / 8766) * dtH))) continue;
    if (n.snapshots) dc.alerts.unshift({ h: dc.simH, level: 'warning', kind: 'backup', node: n.id, text: `A bad change wiped data on ${n.id}; rolled back from a snapshot.` });
    else loseData(n, 'a bad change deleted it and there were no snapshots');
  }
  if (force.siteLoss || rand() < 1 - Math.exp(-((k.siteLossPerYear * diff.failureMult) / 8766) * dtH)) {
    for (const n of dc.nodes) if (!n.dataLost) loseData(n, dc.offsite ? 'a fire in the hall destroyed the stored data' : 'a fire destroyed the site\'s data and there was no offsite copy');
  }
  let darkFrac = 0;
  const cutMin = force.powerCutMin ?? (rand() < 1 - Math.exp(-((k.powerCutsPerYear * diff.failureMult) / 8766) * dtH) ? -Math.log(1 - rand()) * k.powerCutMeanMin : 0);
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

  // Overload: customers leave after sustained heavy overload, per bucket;
  // reputation recovers in proportion to the workloads that are not overloaded.
  for (const bk of allBuckets) {
    if (utilB[bk] > k.churnAbove) {
      dc.overH[bk] = (dc.overH[bk] ?? 0) + dtH;
      if (dc.overH[bk] >= k.churnAfterH * diff.patienceMult) {
        dc.overH[bk] = 0;
        const mine = dc.customers.filter((c) => bucketOfCust(c) === bk).sort((x, y) => y.size - x.size);
        if (mine.length) {
          const r = roleOf(bk);
          dc.customers = dc.customers.filter((c) => c.id !== mine[0].id);
          dc.reputation = Math.max(0, dc.reputation - k.reputationLossPerChurn);
          dc.alerts.unshift({ h: dc.simH, level: 'critical', text: `An overloaded ${r === 'vm' ? 'VM' : r === 'game' ? 'game-server' : `${bk.split(':')[1]}-model inference`} customer left (${mine[0].size} ${r === 'inference' ? 'tok/s' : r === 'game' ? 'players' : 'vCPUs'}). Reputation -${k.reputationLossPerChurn}.` });
        }
      }
    } else dc.overH[bk] = 0;
  }
  const active = allBuckets.filter((bk) => demandB[bk] > 0 || servedBuckets.includes(bk));
  if (active.length) {
    const okShare = active.filter((bk) => utilB[bk] <= k.slowAbove).length / active.length;
    dc.reputation = Math.min(100, dc.reputation + k.reputationGainPerHour * okShare * dtH);
  }
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
  dc.last = { upsRuntimeMin: upsRuntimeMin(k, dc.upsUnits, wallW), dataTB, backupCostPerH: backupCost / dtH, darkFrac, util, demand, capacity: Object.fromEntries(ROLES.map((r) => [r, capByRole[r] * powerFactor])), buckets: Object.fromEntries(allBuckets.map((bk) => [bk, { util: utilB[bk], demand: demandB[bk], capacity: capB[bk] * powerFactor }])), wallW, wantW, powerFactor, incomePerH: income / dtH, powerCostPerH: powerCost / dtH, nodes };
  dc.history.push({ h: dc.simH, util: { ...util }, wallW, hallC: dc.hallC, net: (income - powerCost) / dtH });
  if (dc.history.length > k.historyPoints) dc.history.splice(0, dc.history.length - k.historyPoints);
  dc.alerts = dc.alerts.slice(0, 30);
  return { dc, moneyDelta: income - powerCost - backupCost - penalty };
}
