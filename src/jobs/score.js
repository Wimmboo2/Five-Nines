// Scoring a delivery (user decisions 2026-09-30, docs/decisions.md):
//   weighted average of per-axis scores, weights = the client's priorities;
//   linear partial credit from 100 at the target down to 0 at a floor;
//   small capped bonuses for coming in under budget and under the power limit;
//   hard failures (won't fit, over the PSU/PDU, overheats, bad config) cap the
//   total and pay nothing.
//
// scoreDelivery(evaluation, job) -> { score, axes, bonus, satisfaction,
//   payoutMultiplier, xpMultiplier, hardFail, measured }
// `evaluation` is evaluateForJob()'s result: evaluateBuild output plus costUSD.
// job.difficulty is read but has no effect yet (stage 10).

import { evaluateBuild } from '../sim/evaluate.js';
import { indexCatalog } from '../sim/util.js';
import { measure } from './generate.js';
import { buildCost } from './cost.js';

// Game-design constants.
// Values picked by Claude, pending the user's sign-off: see docs/decisions.md,
// "Game-design values picked by Claude, pending sign-off".
export const SCORING = {
  perfFloor: 0.8, // performance: 0 points at 80% of the target (18 of 20 tok/s = 50)
  overFloor: 1.2, // budget and power: 0 points at 120% of the limit
  noiseFloorDB: 6, // noise: 0 points 6 dB over the limit (6 dB = twice the sound pressure)
  tempFloorC: 5, // room temperature: 0 points 5 C over the limit
  budgetBonusMax: 0.06, // up to +6% payout for coming in under budget ...
  powerBonusMax: 0.04, // ... and up to +4% for coming in under the power limit (+10% combined)
  bonusFullAt: 0.3, // bonus is full at 30% under the limit
  hardFailCap: 25, // a build with a hard failure scores at most this
  bands: [[90, 'delighted'], [75, 'happy'], [50, 'satisfied'], [25, 'disappointed'], [0, 'angry']],
};

const clamp01 = (x) => Math.max(0, Math.min(1, x));

// Higher is better: 100 at or above target, 0 at floor x target.
export function higherIsBetter(achieved, target, floor = SCORING.perfFloor) {
  if (achieved == null || !Number.isFinite(achieved)) return 0;
  return 100 * clamp01((achieved / target - floor) / (1 - floor));
}

// Lower is better: 100 at or under the limit, 0 at over x limit.
export function lowerIsBetter(achieved, limit, over = SCORING.overFloor) {
  return 100 * clamp01((over - achieved / limit) / (over - 1));
}

function overBy(achieved, limit, span) {
  return 100 * clamp01(1 - (achieved - limit) / span);
}

export function evaluateForJob(catalog, job, build, software, opts = {}) {
  const idx = opts.idx ?? indexCatalog(catalog);
  const w = job.workload;
  // The client's overcommit limit is theirs, not a player setting.
  const sw = software.cloud && w.cloud ? { ...software, cloud: { ...software.cloud, maxOvercommit: w.cloud.maxOvercommit } } : software;
  const ev = evaluateBuild(catalog, build, sw, job.room, { idx });
  const failures = [...(ev.failures ?? []), ...requirementFailures(w, software)];
  return { ...ev, failures, costUSD: buildCost(idx, build) };
}

// What the client asked for that the player's config must meet.
function requirementFailures(w, sw) {
  const out = [];
  if (w.inference && !sw.inference) out.push({ code: 'config', message: 'The client needs an inference server: set one up in the inference app.' });
  if (w.inference && sw.inference) {
    if (sw.inference.model !== w.inference.model) out.push({ code: 'config', message: 'The inference server runs a different model than the client asked for.' });
    if ((sw.inference.contextLength ?? 0) < w.inference.contextLength) out.push({ code: 'config', message: `The client needs a ${w.inference.contextLength.toLocaleString('en-US')}-token context.` });
    if ((sw.inference.concurrency ?? 1) < w.inference.concurrency) out.push({ code: 'config', message: `The client needs ${w.inference.concurrency} concurrent users.` });
  }
  if (w.gameServer) {
    const g = sw.gameServers?.[0];
    if (!g) out.push({ code: 'config', message: 'The client needs a game server: set one up in the game server app.' });
    else {
      if (g.players < w.gameServer.players) out.push({ code: 'config', message: `The client needs room for ${w.gameServer.players} players.` });
      if ((g.viewDistance ?? 10) < w.gameServer.viewDistance) out.push({ code: 'config', message: `The client asked for a view distance of at least ${w.gameServer.viewDistance}.` });
      if ((g.simulationDistance ?? 10) < w.gameServer.simulationDistance) out.push({ code: 'config', message: `The client asked for a simulation distance of at least ${w.gameServer.simulationDistance}.` });
    }
  }
  if (w.cloud) {
    const c = sw.cloud;
    if (!c) out.push({ code: 'config', message: 'The client needs VMs: set them up in the VM app.' });
    else for (const k of ['count', 'vcpus', 'ramGB', 'diskGB']) {
      if ((c[k] ?? 0) < w.cloud[k]) out.push({ code: 'config', message: `The client asked for ${w.cloud.count} VMs with ${w.cloud.vcpus} vCPUs, ${w.cloud.ramGB} GB RAM and ${w.cloud.diskGB} GB disk each.` });
    }
  }
  return [...new Map(out.map((f) => [f.message, f])).values()];
}

export function scoreDelivery(evaluation, job) {
  if (evaluation.costUSD == null) throw new Error('scoreDelivery needs evaluation.costUSD (use evaluateForJob).');
  const t = job.targets;
  const m = measure(evaluation, job);
  const axes = {};
  if (t.tokPerSec || t.tps || t.vmCpu || t.vmIops) {
    const parts = [];
    if (t.tokPerSec) parts.push(higherIsBetter(m.tokPerSec, t.tokPerSec.value));
    if (t.tps) parts.push(higherIsBetter(m.tps, t.tps.value));
    if (t.vmCpu) parts.push(higherIsBetter(m.vmCpu, t.vmCpu.value));
    if (t.vmIops) parts.push(higherIsBetter(m.vmIops, t.vmIops.value));
    axes.performance = Math.min(...parts);
  }
  axes.budget = lowerIsBetter(evaluation.costUSD, job.budgetUSD);
  axes.power = m.wallW == null ? 0 : lowerIsBetter(m.wallW, t.powerLimitW);
  if (t.noiseLimitDBA != null) axes.noise = m.dBA == null ? 0 : overBy(m.dBA, t.noiseLimitDBA, SCORING.noiseFloorDB);
  axes.temperature = m.roomC == null ? 0 : overBy(m.roomC, t.roomTempLimitC, SCORING.tempFloorC);

  let wSum = 0;
  let total = 0;
  for (const [axis, s] of Object.entries(axes)) {
    const w = job.priorities[axis] ?? 0;
    wSum += w;
    total += w * s;
  }
  let score = wSum > 0 ? total / wSum : 0;
  const hardFail = (evaluation.failures ?? []).length > 0;
  if (hardFail) score = Math.min(score, SCORING.hardFailCap);

  const under = (x, lim) => clamp01((1 - x / lim) / SCORING.bonusFullAt);
  const bonus = hardFail ? { budget: 0, power: 0 } : {
    budget: SCORING.budgetBonusMax * under(evaluation.costUSD, job.budgetUSD),
    power: m.wallW == null ? 0 : SCORING.powerBonusMax * under(m.wallW, t.powerLimitW),
  };
  const bonusTotal = bonus.budget + bonus.power;
  const satisfaction = hardFail ? 'rejected' : SCORING.bands.find(([min]) => score >= min)[1];
  return {
    score, axes, weights: { ...job.priorities }, bonus: { ...bonus, total: bonusTotal },
    satisfaction, hardFail, failures: evaluation.failures ?? [],
    payoutMultiplier: hardFail ? 0 : (score / 100) * (1 + bonusTotal),
    xpMultiplier: score / 100,
    measured: m, difficulty: job.difficulty,
  };
}
