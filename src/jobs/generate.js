// Job generator. Pure: the same catalog, seed and options give the same job.
//
// generateJob(catalog, { seed, tier?, difficulty? }) -> job
//
// Every job is proven solvable: the generator rolls a workload, then evaluates
// reference builds from the catalog (cheapest first) with the temporary default
// software until one runs it without a hard failure. The targets, limits and
// budget are then set with slack around that build's results, so the reference
// build meets every target within budget. If no reference build works, the
// workload is re-rolled.
//
// difficulty is stored on the job and passed through to scoring, but it does
// not change anything yet (stage 10).

import { makeRng, indexCatalog } from '../sim/util.js';
import { evaluateBuild } from '../sim/evaluate.js';
import { CLIENTS, TIERS } from './clients.js';
import { referenceCandidates } from './templates.js';
import { defaultSoftware } from './software.js';

// Game-design constants for how much slack jobs get around the reference build.
export const GEN = {
  perfTargetOfRef: [0.75, 0.95], // performance target = reference result x this
  powerLimitOfRef: [1.1, 1.35], // wall power limit = reference draw x this
  noiseLimitOverRefDB: [2, 6], // noise limit = reference level + this
  tempLimitOverRefC: [1, 3], // room temperature limit = reference room temp + this
  budgetOfRefCost: [1.1, 1.4], // budget = reference build cost x this
  feeOfBudget: [0.12, 0.2], // payout = budget x this (the player's fee)
  baseXp: { homelab: 100, server: 300, datacenter: 1000 },
  mcTps: 20, // Minecraft runs 20 ticks per second when not lagging (minecraft.wiki: Tick)
  maxTries: 12,
};

const WORKLOAD = {
  homelab: { maxWeightsGB: 40, contexts: [4096, 8192, 16384, 32768], concurrency: [1, 1, 2], players: [4, 30] },
  server: { maxWeightsGB: 300, contexts: [8192, 32768, 65536], concurrency: [1, 4, 8], players: [20, 120] },
  datacenter: { minNativeGB: 60, contexts: [8192, 32768, 131072], concurrency: [16, 32, 64, 128], players: null },
};

function pick(rng, list) { return list[Math.floor(rng() * list.length)]; }
function between(rng, [lo, hi]) { return lo + (hi - lo) * rng(); }
function roundTo(x, step) { return Math.round(x / step) * step; }

function smallestWeights(model) {
  const pref = ['Q4_K_M', 'Q4_0', 'MXFP4', 'FP8', 'Q8_0', 'BF16', 'F16'];
  const q = pref.find((k) => model.weights[k]);
  return model.weights[q] / 1e9;
}

// Size of the weights a datacenter engine loads (FP8 or MXFP4 if the model
// ships them, else BF16/F16).
function nativeWeights(model) {
  const q = ['FP8', 'MXFP4', 'BF16', 'F16'].find((k) => model.weights[k]);
  return model.weights[q] / 1e9;
}

function rollRoom(rng, catalog, tier) {
  const a = pick(rng, catalog.roomArchetypes.filter((r) => r.tier === tier));
  const r = (f, step) => roundTo(between(rng, [f.min, f.max]), step);
  const floorAreaM2 = r(a.floorAreaM2, 0.5);
  const heightM = r(a.heightM, 0.1);
  return {
    archetype: a.id, name: a.displayName,
    floorAreaM2, heightM,
    wallAreaM2: roundTo(2 * floorAreaM2 + 4 * Math.sqrt(floorAreaM2) * heightM, 0.1),
    wallUValue: r(a.wallUValue, 0.1),
    airChangesPerHour: r(a.airChangesPerHour, 0.1),
    ambientC: r(a.ambientC, 0.5),
    listenerDistanceM: r(a.listenerDistanceM, 0.5),
  };
}

function rollWorkload(rng, catalog, tier, type) {
  const w = WORKLOAD[tier];
  const out = {};
  if (type === 'inference' || type === 'mixed') {
    const models = catalog.models.filter((m) => {
      const gb = smallestWeights(m);
      return (w.maxWeightsGB == null || gb <= w.maxWeightsGB) && (w.minNativeGB == null || nativeWeights(m) >= w.minNativeGB);
    });
    const model = pick(rng, models);
    const contexts = w.contexts.filter((c) => c <= model.maxContextNative);
    out.inference = {
      model: model.id,
      contextLength: contexts.length ? pick(rng, contexts) : model.maxContextNative,
      concurrency: pick(rng, w.concurrency),
    };
  }
  if (type === 'game-server' || type === 'mixed') {
    const [lo, hi] = w.players;
    out.gameServer = { type: 'minecraft', players: Math.round(between(rng, [lo, type === 'mixed' ? (lo + hi) / 2 : hi])) };
  }
  return out;
}

// Results of an evaluation that the targets are judged on.
export function measure(evaluation, job) {
  const inf = evaluation.inference;
  const ctx = job.workload.inference?.contextLength;
  const atCtx = inf?.decodeCurve?.find((d) => d.depth === ctx) ?? inf?.decodeCurve?.[inf.decodeCurve.length - 1];
  return {
    tokPerSec: atCtx?.perSequence ?? null,
    tps: evaluation.gameServers?.[0]?.tps ?? null,
    wallW: evaluation.power?.wallW ?? null,
    dBA: evaluation.noise?.atListenerDBA ?? null,
    roomC: evaluation.thermal?.roomC ?? null,
  };
}

// Every candidate that runs the workload, cheapest first. The job's reference
// is drawn from these, weighted toward the cheap end (index = n x u^2), so most
// jobs fit a modest build but some are sized for the bigger hardware.
function findReference(rng, catalog, idx, tier, workload, room) {
  const ok = [];
  for (const cand of referenceCandidates(catalog, idx, tier, !!workload.inference)) {
    const sw = defaultSoftware(idx, workload, cand.build);
    const ev = evaluateBuild(catalog, cand.build, sw, room, { idx });
    if (ev.failures.length) continue;
    if (workload.gameServer && !(ev.gameServers[0]?.tps >= GEN.mcTps - 1e-9)) continue;
    ok.push({ ...cand, software: sw, evaluation: ev });
  }
  if (!ok.length) return null;
  return ok[Math.floor(ok.length * rng() ** 2)];
}

export function generateJob(catalog, opts = {}) {
  const seed = opts.seed ?? 1;
  const difficulty = opts.difficulty ?? 'normal';
  const idx = opts.idx ?? indexCatalog(catalog);
  const rng = makeRng(seed);
  const tier = opts.tier ?? pick(rng, TIERS);
  for (let attempt = 0; attempt < GEN.maxTries; attempt++) {
    const client = pick(rng, CLIENTS.filter((c) => c.tier === tier));
    const type = pick(rng, client.jobTypes);
    const workload = rollWorkload(rng, catalog, tier, type);
    const room = rollRoom(rng, catalog, tier);
    const ref = findReference(rng, catalog, idx, tier, workload, room);
    if (!ref) continue;
    const m = measure(ref.evaluation, { workload });
    const targets = {};
    if (workload.inference) {
      targets.tokPerSec = { value: Math.max(1, roundTo(m.tokPerSec * between(rng, GEN.perfTargetOfRef), m.tokPerSec > 50 ? 5 : 1)),
        atContext: workload.inference.contextLength, concurrency: workload.inference.concurrency };
    }
    if (workload.gameServer) targets.tps = { value: GEN.mcTps, players: workload.gameServer.players };
    targets.powerLimitW = Math.ceil(m.wallW * between(rng, GEN.powerLimitOfRef) / 50) * 50;
    if (client.priorities.noise > 0) targets.noiseLimitDBA = Math.ceil(m.dBA + between(rng, GEN.noiseLimitOverRefDB));
    targets.roomTempLimitC = Math.ceil((m.roomC + between(rng, GEN.tempLimitOverRefC)) * 2) / 2;
    const budgetStep = tier === 'homelab' ? 100 : tier === 'server' ? 1000 : 10000;
    const budgetUSD = Math.ceil(ref.costUSD * between(rng, GEN.budgetOfRefCost) / budgetStep) * budgetStep;
    return {
      id: `job-${seed}`, seed, difficulty, tier, type,
      client: { id: client.id, name: client.name },
      priorities: { ...client.priorities },
      workload, targets, budgetUSD, room,
      payoutUSD: roundTo(budgetUSD * between(rng, GEN.feeOfBudget), 10),
      xp: GEN.baseXp[tier],
      // Proof of solvability. Kept for tests and debugging; the UI does not show it.
      reference: { build: ref.build, costUSD: ref.costUSD, software: ref.software },
    };
  }
  throw new Error(`No solvable ${tier} job found for seed ${seed} after ${GEN.maxTries} tries.`);
}

export function generateJobs(catalog, { seed = 1, count = 6, difficulty } = {}) {
  const idx = indexCatalog(catalog);
  return Array.from({ length: count }, (_, i) => generateJob(catalog, { seed: seed * 1000 + i + 1, difficulty, idx }));
}
