// Stage 9b: parts dying in real time, data loss and the four protections.
//
// Each protection covers one failure, as decided:
//   RAID       -> a drive dying (incl. the read-error risk of the rebuild)
//   snapshots  -> a bad change (wrong delete, broken upgrade)
//   offsite    -> losing the whole site
//   UPS        -> a utility power cut, for as long as its runtime lasts
// Rates come from durability.js (the same per-part failure model as client
// builds) and constants.datacenter (sources and pending values tagged there).

import { failureRates, failProbability } from '../sim/durability.js';
import { allFans } from '../sim/power.js';

export const RAID_LEVELS = {
  none: { minDrives: 1, tolerates: 0, usable: (n) => n },
  raid1: { minDrives: 2, tolerates: 1, usable: () => 1 },
  raid5: { minDrives: 3, tolerates: 1, usable: (n) => n - 1 },
  raid6: { minDrives: 4, tolerates: 2, usable: (n) => n - 2 },
  raid10: { minDrives: 4, tolerates: 1, usable: (n) => n / 2 },
};

const HOURS_PER_YEAR = 8766;
const perHour = (perYear, dtH) => 1 - Math.exp(-(perYear / HOURS_PER_YEAR) * dtH);

export function driveCount(build) {
  return (build.storage ?? []).reduce((a, s) => a + (s.count ?? 1), 0);
}
export function nodeDataTB(idx, node) {
  const lvl = RAID_LEVELS[node.raid ?? 'none'];
  const drives = (node.build.storage ?? []).flatMap((s) => Array(s.count ?? 1).fill(idx.parts.get(s.part)));
  if (!drives.length) return 0;
  const per = Math.min(...drives.map((d) => d.capacityTB));
  return lvl.usable(drives.length) * per;
}

// Probability that rebuilding after a drive loss hits an unrecoverable read
// error: every surviving drive is read in full (datasheet URE rate, bits).
export function rebuildUreRisk(idx, node) {
  const drives = (node.build.storage ?? []).flatMap((s) => Array(s.count ?? 1).fill(idx.parts.get(s.part)));
  if (drives.length < 2) return 1;
  const bits = (drives.length - 1) * Math.min(...drives.map((d) => d.capacityTB)) * 8e12;
  const ure = Math.min(...drives.map((d) => d.uberBits ?? 1e14));
  return 1 - Math.exp(bits * Math.log1p(-1 / ure));
}

// UPS runtime at a load, fitted as a power law through the two published
// points (half load, full load): t = t_full x (P_rated / P)^b.
export function upsRuntimeMin(k, units, loadW) {
  if (!units || loadW <= 0) return units ? Infinity : 0;
  const b = Math.log(k.upsMinAtHalfLoad / k.upsMinAtFullLoad) / Math.log(2);
  const perUnitW = loadW / units;
  if (perUnitW > k.upsRatedW) return 0;
  return k.upsMinAtFullLoad * (k.upsRatedW / perUnitW) ** b;
}

export function penaltyFraction(k, difficulty = 'normal') {
  return difficulty === 'easy' ? k.penaltyEasy : difficulty === 'hard' ? k.penaltyHard : k.penaltyNormal;
}

// Rolls part failures for every node for dtH hours. `rand` is the seeded
// generator; `readings` are the node gauges from this step (temps, load).
export function rollPartFailures(idx, dc, readings, dtH, rand, force) {
  const events = [];
  dc.nodes.forEach((n, i) => {
    if (n.down) return;
    const g = readings[i];
    const psu = n.build.psu ? idx.parts.get(n.build.psu) : null;
    const rates = failureRates(idx, n.build, {
      gpuTemps: n.build.gpus.map(() => ({ tempC: g?.gpuC ?? dc.hallC })),
      gpuLoad: n.build.gpus.map(() => Math.min(1, g?.util ?? 0)),
      cpuTempC: g?.cpuC ?? dc.hallC, driveTempC: dc.hallC + idx.constants.thermal.driveRiseC, roomC: dc.hallC,
      psuLoadPct: psu ? Math.min(100, ((g?.wallW ?? 0) / ((psu.ratedW ?? 1000) * (n.build.psuCount ?? 1))) * 100) : 0,
      inletC: dc.hallC, fans: allFans(idx, n.build),
    });
    for (const r of rates) {
      const forced = force?.nodeId === n.id && force.key === r.key;
      if (forced || rand() < failProbability(r.afr, dtH * 3600)) events.push({ nodeId: n.id, key: r.key, label: r.label });
    }
  });
  return events;
}

// What a dead part costs to replace (one unit of it).
export function replacementPrice(idx, build, key) {
  const [kind, i] = key.split(':');
  const id = kind === 'gpu' ? build.gpus[+i]?.part : kind === 'ram' ? build.ram[+i]?.part : kind === 'storage' ? build.storage[+i]?.part
    : kind === 'fan' ? build.fans?.[+i]?.part : kind === 'cpu' ? build.cpu : kind === 'psu' ? build.psu : null;
  const part = id ? idx.parts.get(id) : null;
  return part ? part.priceUSD : 0;
}
