// Power draw: per-part DC draw at the current load, then wall power through the
// PSU efficiency curve.

import { interp, clamp } from './util.js';

// GPU draw while running inference at batch B (fraction of board power), or
// idle if the GPU is not used. Fractions come from constants.power.
export function gpuDrawW(idx, part, activity) {
  const p = idx.constants.power;
  if (!activity || activity.mode === 'idle') return part.idlePowerW;
  let frac;
  if (activity.mode === 'prefill') frac = p.gpuPrefillFraction;
  else {
    const t = clamp((activity.batch - 1) / (p.gpuBatchDecodeRefBatch - 1), 0, 1);
    frac = p.gpuDecodeFraction + (p.gpuBatchDecodeFraction - p.gpuDecodeFraction) * t;
  }
  const scale = activity.powerScale ?? 1; // thermal throttling cuts power
  return Math.max(part.idlePowerW, frac * part.boardPowerW * scale);
}

export function cpuDrawW(idx, part, loadFraction) {
  return part.idlePowerW + (part.tdpW - part.idlePowerW) * clamp(loadFraction, 0, 1);
}

// Fit loss(P) = a + b*P + c*P^2 through the PSU's efficiency points. This is
// the standard way PSU losses split into fixed, proportional and resistive
// parts; it lets the curve extend below the lowest published load point.
export function psuLossModel(psu) {
  const pts = psu.efficiencyCurve.map((p) => {
    const out = (p.loadPct / 100) * psu.ratedW;
    return [out, out / p.eff - out];
  });
  // least squares for a, b, c
  const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const y = [0, 0, 0];
  for (const [P, loss] of pts) {
    const row = [1, P, P * P];
    for (let i = 0; i < 3; i++) {
      y[i] += row[i] * loss;
      for (let j = 0; j < 3; j++) A[i][j] += row[i] * row[j];
    }
  }
  const [a, b, c] = solve3(A, y);
  return { a: Math.max(0, a), b, c };
}

function solve3(A, y) {
  const M = A.map((r, i) => [...r, y[i]]);
  for (let i = 0; i < 3; i++) {
    let p = i;
    for (let k = i + 1; k < 3; k++) if (Math.abs(M[k][i]) > Math.abs(M[p][i])) p = k;
    [M[i], M[p]] = [M[p], M[i]];
    for (let k = i + 1; k < 3; k++) {
      const f = M[k][i] / M[i][i];
      for (let j = i; j < 4; j++) M[k][j] -= f * M[i][j];
    }
  }
  const x = [0, 0, 0];
  for (let i = 2; i >= 0; i--) {
    let s = M[i][3];
    for (let j = i + 1; j < 3; j++) s -= M[i][j] * x[j];
    x[i] = s / M[i][i];
  }
  return x;
}

export function wallPower(psu, dcW) {
  const m = psuLossModel(psu);
  const loss = m.a + m.b * dcW + m.c * dcW * dcW;
  const wall = dcW + loss;
  return { wallW: wall, efficiency: dcW > 0 ? dcW / wall : 0, loadPct: (dcW / psu.ratedW) * 100 };
}

// All DC loads of a build for a given activity snapshot.
//   activity.gpus[i]   : { mode, batch, powerScale } per GPU index
//   activity.cpuLoad   : 0..1
//   activity.fanSpeed  : case fan speed fraction 0..1
export function buildPower(idx, build, activity) {
  const byPart = [];
  const add = (label, w, kind) => byPart.push({ label, watts: w, kind });
  build.gpus.forEach((g, i) => {
    const part = idx.parts.get(g.part);
    add(`GPU ${i} ${part.displayName}`, gpuDrawW(idx, part, activity.gpus?.[i]), 'gpu');
  });
  if (build.cpu) {
    const cpu = idx.parts.get(build.cpu);
    add(`CPU ${cpu.displayName}`, cpuDrawW(idx, cpu, activity.cpuLoad ?? 0), 'cpu');
  }
  for (const r of build.ram ?? []) {
    const part = idx.parts.get(r.part);
    add(`RAM ${part.displayName}`, (r.count ?? 1) * part.moduleCount * part.powerPerModuleW, 'ram');
  }
  for (const s of build.storage ?? []) {
    const part = idx.parts.get(s.part);
    const busy = activity.storageBusy ?? 0;
    const w = part.idlePowerW + (part.activePowerW - part.idlePowerW) * busy;
    add(`Storage ${part.displayName}`, (s.count ?? 1) * w, 'storage');
  }
  for (const f of allFans(idx, build)) {
    const speed = clamp(activity.fanSpeed ?? 1, 0, 1);
    add(`Fan ${f.label}`, f.count * f.part.maxPowerW * f.areaScale * speed ** idx.constants.fanLaws.powerExponent, 'fan');
  }
  for (const n of build.network ?? []) {
    const part = idx.parts.get(n.part);
    add(`Network ${part.displayName}`, part.maxPowerW * idx.constants.power.networkLoadFraction, 'network');
  }
  add('Motherboard and chipset', idx.constants.power.motherboardW, 'board');
  const dcW = byPart.reduce((a, p) => a + p.watts, 0);
  const psu = build.psu ? idx.parts.get(build.psu) : null;
  const wall = psu ? wallPower(psu, dcW) : { wallW: dcW, efficiency: 1, loadPct: 0 };
  return { byPart, dcW, ...wall, psu };
}

// Every fan in the build: the chassis's stock fans plus fans the player added.
// Stock fans use the catalog fan named by the chassis, scaled by blade area.
export function allFans(idx, build) {
  const list = [];
  if (build.chassis) {
    const ch = idx.parts.get(build.chassis);
    if (ch.includedFans > 0) {
      const model = idx.parts.get(ch.includedFanModel);
      const areaScale = (ch.includedFanSizeMm / model.sizeMm) ** 2;
      list.push({ label: `${ch.displayName} stock`, part: model, count: ch.includedFans, areaScale, stock: true });
    }
  }
  for (const f of build.fans ?? []) {
    list.push({ label: idx.parts.get(f.part).displayName, part: idx.parts.get(f.part), count: f.count ?? 1, areaScale: 1, stock: false });
  }
  return list;
}

export { interp };
