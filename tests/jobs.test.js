import { describe, it, expect } from 'vitest';
import { dev } from '../scripts/dev-data.js';
import { buildGameData, resolve } from '../src/data/build.js';
import { indexCatalog } from '../src/sim/util.js';
import { generateJob, generateJobs, evaluateForJob, scoreDelivery, SCORING, CLIENTS, buildCost } from '../src/jobs/index.js';
import { emptyBuild, addPart, simBuild } from '../src/ui/buildState.js';

const catalog = resolve(buildGameData(dev));
const idx = indexCatalog(catalog);
const SEEDS = Array.from({ length: 45 }, (_, i) => i + 1);
const jobs = SEEDS.map((seed) => generateJob(catalog, { seed, idx }));

describe('job generator (stage 4)', () => {
  it('rolls all three tiers and all four job types', () => {
    expect(new Set(jobs.map((j) => j.tier))).toEqual(new Set(['homelab', 'server', 'datacenter']));
    expect(new Set(jobs.map((j) => j.type))).toEqual(new Set(['inference', 'game-server', 'mixed', 'cloud']));
  });

  it('every job has client, workloads, targets, budget, room and priorities', () => {
    for (const j of jobs) {
      expect(j.client.name).toBeTruthy();
      expect(j.workload.inference || j.workload.gameServer || j.workload.cloud).toBeTruthy();
      expect(j.targets.powerLimitW).toBeGreaterThan(0);
      expect(j.targets.roomTempLimitC).toBeGreaterThan(j.room.ambientC - 1);
      expect(j.budgetUSD).toBeGreaterThan(0);
      for (const k of ['floorAreaM2', 'heightM', 'wallAreaM2', 'wallUValue', 'airChangesPerHour', 'ambientC', 'listenerDistanceM']) expect(j.room[k]).toBeGreaterThan(0);
      expect(Object.values(j.priorities).reduce((a, b) => a + b, 0)).toBe(100);
      if (j.workload.inference) expect(j.targets.tokPerSec.value).toBeGreaterThan(0);
      if (j.workload.gameServer) expect(j.targets.tps.value).toBe(20);
    }
  });

  it('every rolled job can be evaluated, and its reference build meets every target within budget', () => {
    for (const j of jobs) {
      const ev = evaluateForJob(catalog, j, j.reference.build, j.reference.software, { idx });
      expect(ev.failures).toEqual([]);
      expect(ev.costUSD).toBeLessThanOrEqual(j.budgetUSD);
      const s = scoreDelivery(ev, j);
      expect(s.score).toBeCloseTo(100, 6);
      expect(Number.isFinite(s.payoutMultiplier)).toBe(true);
    }
  });

  it('job sizes follow the catalog: datacenter jobs use several node types, budgets rise by tier', () => {
    const dcNodes = new Set(jobs.filter((j) => j.tier === 'datacenter').map((j) => j.reference.build.chassis));
    expect(dcNodes.size).toBeGreaterThan(1);
    const median = (t) => {
      const b = jobs.filter((j) => j.tier === t).map((j) => j.budgetUSD).sort((a, c) => a - c);
      return b[Math.floor(b.length / 2)];
    };
    expect(median('server')).toBeGreaterThan(median('homelab'));
    expect(median('datacenter')).toBeGreaterThan(median('server'));
  });

  it('is deterministic for a given seed', () => {
    expect(generateJob(catalog, { seed: 7, idx })).toEqual(generateJob(catalog, { seed: 7, idx }));
    expect(generateJobs(catalog, { seed: 3, count: 4 })).toEqual(generateJobs(catalog, { seed: 3, count: 4 }));
    expect(generateJob(catalog, { seed: 7, idx })).not.toEqual(generateJob(catalog, { seed: 8, idx }));
  });

  it('passes difficulty through (not implemented yet: stage 10)', () => {
    const j = generateJob(catalog, { seed: 5, idx, difficulty: 'hard' });
    expect(j.difficulty).toBe('hard');
    const n = generateJob(catalog, { seed: 5, idx });
    expect({ ...j, difficulty: 'normal' }).toEqual(n); // no effect yet
  });
});

describe('scoreDelivery (stage 4)', () => {
  const job = jobs.find((j) => j.type === 'inference' && j.tier === 'homelab');
  const base = evaluateForJob(catalog, job, job.reference.build, job.reference.software, { idx });
  const withTok = (ev, tok) => ({ ...ev, inference: { ...ev.inference, decodeCurve: ev.inference.decodeCurve.map((d) => ({ ...d, perSequence: tok })) } });

  it('is deterministic', () => {
    expect(scoreDelivery(base, job)).toEqual(scoreDelivery(base, job));
  });

  it('a near miss scores between a pass and a fail (18 of 20 tok/s = 50 on that axis)', () => {
    const target = job.targets.tokPerSec.value;
    const pass = scoreDelivery(withTok(base, target), job);
    const near = scoreDelivery(withTok(base, 0.9 * target), job);
    const fail = scoreDelivery({ ...withTok(base, 0.9 * target), failures: [{ code: 'memory', message: 'x' }] }, job);
    expect(near.axes.performance).toBeCloseTo(50, 6);
    expect(near.score).toBeLessThan(pass.score);
    expect(near.score).toBeGreaterThan(fail.score);
    expect(fail.score).toBeLessThanOrEqual(SCORING.hardFailCap);
    expect(fail.payoutMultiplier).toBe(0);
    expect(fail.satisfaction).toBe('rejected');
  });

  it('client priorities change the score', () => {
    const slow = withTok(base, 0.9 * job.targets.tokPerSec.value);
    const perfFirst = { ...job, priorities: { performance: 70, budget: 10, noise: 10, power: 5, temperature: 5 } };
    const budgetFirst = { ...job, priorities: { performance: 10, budget: 70, noise: 10, power: 5, temperature: 5 } };
    const a = scoreDelivery(slow, perfFirst).score;
    const b = scoreDelivery(slow, budgetFirst).score;
    expect(a).toBeLessThan(b);
    // and the preset clients really differ
    expect(new Set(CLIENTS.map((c) => JSON.stringify(c.priorities))).size).toBe(CLIENTS.length);
  });

  it('bonuses are capped at +10% and only paid without hard failures', () => {
    const cheap = { ...base, costUSD: 1, power: { ...base.power, wallW: 1 } };
    const s = scoreDelivery(cheap, job);
    expect(s.bonus.total).toBeCloseTo(SCORING.budgetBonusMax + SCORING.powerBonusMax, 9);
    expect(s.bonus.total).toBeLessThanOrEqual(0.1 + 1e-12);
  });

  it('going over the budget, power, noise or temperature limit costs points', () => {
    const over = {
      ...base, costUSD: job.budgetUSD * 1.1,
      power: { ...base.power, wallW: job.targets.powerLimitW * 1.1 },
      noise: { ...base.noise, atListenerDBA: job.targets.noiseLimitDBA + 3 },
      thermal: { ...base.thermal, roomC: job.targets.roomTempLimitC + 2.5 },
    };
    const s = scoreDelivery(over, job);
    expect(s.axes.budget).toBeCloseTo(50, 6);
    expect(s.axes.power).toBeCloseTo(50, 6);
    expect(s.axes.noise).toBeCloseTo(50, 6);
    expect(s.axes.temperature).toBeCloseTo(50, 6);
  });
});

describe('build state and cost (stage 4-5 fixes)', () => {
  const parts = [...idx.parts.values()];
  const atx = parts.find((p) => p.category === 'psu' && p.formFactor === 'atx');
  const mod = parts.find((p) => p.category === 'psu' && p.formFactor === 'module');
  const rack = parts.find((p) => p.category === 'rack');

  it('adding the same ATX PSU twice installs and charges one', () => {
    const b = addPart(addPart(emptyBuild(), atx), atx);
    expect(b.psuCount).toBe(1);
    expect(buildCost(idx, simBuild(b))).toBe(atx.priceUSD);
  });

  it('adding the same PSU module twice installs two', () => {
    const b = addPart(addPart(emptyBuild(), mod), mod);
    expect(b.psuCount).toBe(2);
    expect(buildCost(idx, simBuild(b))).toBe(2 * mod.priceUSD);
  });

  it('a rack counts in buildCost and survives simBuild', () => {
    const b = simBuild(addPart(emptyBuild(), rack));
    expect(b.rack).toBe(rack.id);
    expect(buildCost(idx, b)).toBe(rack.priceUSD);
  });
});
