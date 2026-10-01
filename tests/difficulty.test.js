import { describe, it, expect } from 'vitest';
import { dev } from '../scripts/dev-data.js';
import { buildGameData, resolve } from '../src/data/build.js';
import { indexCatalog } from '../src/sim/util.js';
import { runStressTest } from '../src/sim/stress.js';
import { generateJob, evaluateForJob, scoreDelivery, measure } from '../src/jobs/index.js';
import { referenceCandidates } from '../src/jobs/templates.js';
import { difficulty, DIFFICULTIES } from '../src/game/difficulty.js';
import { applyDelivery, newPlayer } from '../src/game/player.js';
import * as D from '../src/dc/datacenter.js';
import { restoreHours, nodeDataTB, penaltyFraction } from '../src/dc/failures.js';
import { serialize, deserialize, fnv1a } from '../src/save/save.js';
import { newGame, toSaveData } from '../src/game/state.js';

const catalog = resolve(buildGameData(dev));
const idx = indexCatalog(catalog);
const k = idx.constants.datacenter;
const [E, N, H] = DIFFICULTIES.map((d) => difficulty(idx, d));

describe('difficulty table (stage 10)', () => {
  it('normal is the baseline and every lever moves the right way', () => {
    expect(N).toMatchObject({ slack: 1, feeMult: 1, failureMult: 1, demandMult: 1, patienceMult: 1, angryPenalty: 0 });
    // larger = easier
    for (const key of ['slack', 'feeMult', 'patienceMult']) { expect(E[key]).toBeGreaterThan(N[key]); expect(H[key]).toBeLessThan(N[key]); }
    // smaller = easier
    for (const key of ['failureMult', 'demandMult', 'dataLossPenalty']) { expect(E[key]).toBeLessThan(N[key]); expect(H[key]).toBeGreaterThan(N[key]); }
    expect(H.angryPenalty).toBe(0.15);
    expect(E.angryPenalty).toBe(0);
  });
});

describe('difficulty on client jobs (stage 10)', () => {
  const seeds = Array.from({ length: 20 }, (_, i) => i + 1);
  it('same roll: hard has tighter targets, budget and fee than normal, easy looser', () => {
    for (const seed of seeds) {
      const [e, n, h] = DIFFICULTIES.map((d) => generateJob(catalog, { seed, idx, difficulty: d }));
      expect(h.budgetUSD).toBeLessThanOrEqual(n.budgetUSD); expect(e.budgetUSD).toBeGreaterThanOrEqual(n.budgetUSD);
      expect(h.payoutUSD).toBeLessThan(n.payoutUSD); expect(e.payoutUSD).toBeGreaterThan(n.payoutUSD);
      expect(h.targets.powerLimitW).toBeLessThanOrEqual(n.targets.powerLimitW); expect(e.targets.powerLimitW).toBeGreaterThanOrEqual(n.targets.powerLimitW);
      expect(h.targets.roomTempLimitC).toBeLessThanOrEqual(n.targets.roomTempLimitC);
      if (n.targets.tokPerSec) { expect(h.targets.tokPerSec.value).toBeGreaterThanOrEqual(n.targets.tokPerSec.value); expect(e.targets.tokPerSec.value).toBeLessThanOrEqual(n.targets.tokPerSec.value); }
    }
  });
  it('hard jobs stay provably solvable: the reference build scores 100 within budget', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const j = generateJob(catalog, { seed, idx, difficulty: 'hard' });
      const ev = evaluateForJob(catalog, j, j.reference.build, j.reference.software, { idx });
      expect(ev.costUSD).toBeLessThanOrEqual(j.budgetUSD);
      expect(scoreDelivery(ev, j).score).toBe(100);
    }
  });
  it('the same slower build scores lower on a hard job than on the easy one', () => {
    let found = false;
    for (let seed = 1; seed <= 60 && !found; seed++) {
      const e = generateJob(catalog, { seed, idx, difficulty: 'easy', tier: 'homelab', level: 1 });
      if (!e.targets.tokPerSec) continue;
      const h = generateJob(catalog, { seed, idx, difficulty: 'hard', tier: 'homelab', level: 1 });
      const sw0 = e.reference.software;
      const L = idx.models.get(sw0.inference.model).layers;
      for (let g = L - 1; g >= 0 && !found; g--) {
        const sw = { ...sw0, inference: { ...sw0.inference, gpuLayers: g } };
        const evE = evaluateForJob(catalog, e, e.reference.build, sw, { idx });
        if (evE.failures.length) continue;
        const sE = scoreDelivery(evE, e).score;
        const sH = scoreDelivery(evaluateForJob(catalog, h, h.reference.build, sw, { idx }), h).score;
        if (sE > sH) found = true;
      }
    }
    expect(found).toBe(true);
  });
  it('on hard an angry client takes 15% of your money; not on normal', () => {
    const j = generateJob(catalog, { seed: 3, idx });
    const angry = { score: 10, satisfaction: 'angry', payoutMultiplier: 0.1, xpMultiplier: 0.1 };
    const p = { ...newPlayer(), money: 10000 };
    expect(applyDelivery(p, j, angry, H).earned.penalty).toBe(1500);
    expect(applyDelivery(p, j, angry, N).earned.penalty).toBe(0);
  });
  it('stress-test failure rates scale with difficulty (more seeds fail on hard)', () => {
    const j = generateJob(catalog, { seed: 5, idx, tier: 'homelab', level: 1 });
    const ev = evaluateForJob(catalog, j, j.reference.build, j.reference.software, { idx });
    const year = 3600 * 24 * 365;
    const failed = (d) => Array.from({ length: 150 }, (_, s) => runStressTest(ev, j.room, { seed: s + 1, difficulty: d, durationS: 3 * year, dtS: 3600 * 24, sampleEveryS: 3 * year }))
      .filter((r) => !r.completed).length;
    const [e, n, h] = DIFFICULTIES.map(failed);
    expect(h).toBeGreaterThan(n);
    expect(e).toBeLessThan(n);
  }, 60000);
});

describe('difficulty in the datacenter (stage 10)', () => {
  const cpuNode = referenceCandidates(catalog, idx, 'server', false)[0].build;
  const site = () => { let dc = D.newDatacenter(catalog, idx, 3); dc = D.buyNode(catalog, idx, dc, { build: cpuNode, role: 'vm', rackId: 'rack-1' }).dc; return dc; };
  it('the data-loss penalty uses the real difficulty', () => {
    for (const d of DIFFICULTIES) {
      const dc = site();
      const r = D.stepDatacenter(catalog, idx, dc, 1, { money: 100000, difficulty: d, force: { part: { nodeId: dc.nodes[0].id, key: 'storage:0' } } });
      expect(r.dc.totals.penaltyUSD).toBeCloseTo(penaltyFraction(idx, d) * 100000, 6);
    }
  });
  it('overload patience: customers leave after 4.2 h on hard, 6 h on normal, 6.9 h on easy', () => {
    const leaveAfter = (d) => {
      let dc = { ...site(), reputation: 0 };
      dc.customers = Array.from({ length: 4 }, (_, i) => ({ id: `x${i}`, role: 'vm', size: 200, since: 0, spike: null }));
      for (let h = 1; h <= 10; h++) { dc = D.stepDatacenter(catalog, idx, dc, 1, { money: 0, difficulty: d }).dc; if (dc.customers.length < 4) return h; }
      return Infinity;
    };
    expect(leaveAfter('hard')).toBe(5);
    expect(leaveAfter('normal')).toBe(6);
    expect(leaveAfter('easy')).toBe(7);
  });
  it('the part failure multiplier is applied to every roll', async () => {
    const { rollPartFailures } = await import('../src/dc/failures.js');
    const dc = site();
    const readings = [{ util: 1, gpuC: 70, cpuC: 70, wallW: 300 }];
    // A fixed roll just above the normal chance and below the hard chance.
    const probe = rollPartFailures(idx, dc, readings, 1, () => 0, null, 1).length;
    expect(probe).toBeGreaterThan(0);
    const { failureRates, failProbability } = await import('../src/sim/durability.js');
    const { allFans } = await import('../src/sim/power.js');
    const n = dc.nodes[0];
    const afr = failureRates(idx, n.build, { gpuTemps: [], gpuLoad: [], cpuTempC: 70, driveTempC: dc.hallC + idx.constants.thermal.driveRiseC, roomC: dc.hallC, psuLoadPct: 30, inletC: dc.hallC, fans: allFans(idx, n.build) })[0].afr;
    const u = failProbability(afr * 1.15, 3600);
    const roll = () => u;
    const count = (m) => rollPartFailures(idx, dc, readings, 1, roll, null, m).filter((e) => e.key === 'cpu').length;
    expect(count(N.failureMult)).toBe(0);
    expect(count(H.failureMult)).toBe(1);
    expect(count(E.failureMult)).toBe(0);
  });
  it('over a long seeded run the datacenter sees more failures on hard than on easy', () => {
    const events = (d) => {
      let dc = site();
      for (let i = 0; i < 5; i++) dc = D.buyNode(catalog, idx, dc, { build: cpuNode, role: 'vm', rackId: 'rack-1' }).dc;
      dc = { ...dc, reputation: 0 };
      let count = 0;
      for (let i = 0; i < 3000; i++) {
        const before = dc.simH;
        dc = D.stepDatacenter(catalog, idx, dc, 24, { money: 0, difficulty: d }).dc;
        count += dc.alerts.filter((a) => a.h === before && ['part', 'data-loss', 'restore'].includes(a.kind)).length;
        for (const nd of dc.nodes) {
          for (const x of [...nd.dead]) dc = D.replacePart(idx, dc, nd.id, x.key).dc;
          dc = D.restoreNode(dc, nd.id).dc;
        }
      }
      return count;
    };
    expect(events('hard')).toBeGreaterThan(events('easy'));
  }, 60000);
});

describe('offsite copy restores (stage 10a)', () => {
  const cpuNode = referenceCandidates(catalog, idx, 'server', false)[0].build;
  const run = (dc, hours, opts = {}) => { for (let h = 0; h < hours; h++) dc = D.stepDatacenter(catalog, idx, dc, 1, { money: 100000, ...opts }).dc; return dc; };
  it('a drive death with an offsite copy and no RAID restores with downtime and partial loss', () => {
    let dc = D.newDatacenter(catalog, idx, 3);
    dc = D.buyNode(catalog, idx, dc, { build: cpuNode, role: 'vm', rackId: 'rack-1' }).dc;
    dc = D.setOffsite(dc, true).dc;
    dc = { ...run(dc, 11), reputation: 50 };
    const r = D.stepDatacenter(catalog, idx, dc, 1, { money: 100000, force: { part: { nodeId: dc.nodes[0].id, key: 'storage:0' } } });
    const n = r.dc.nodes[0];
    expect(n.dataLost).toBe(false);
    expect(n.down).toBe(true);
    const sinceH = dc.simH - r.dc.lastOffsiteH;
    expect(r.dc.totals.penaltyUSD).toBeCloseTo(penaltyFraction(idx, 'normal') * 100000 * Math.min(1, sinceH / k.offsiteIntervalH), 6);
    expect(r.dc.totals.penaltyUSD).toBeGreaterThan(0);
    expect(r.dc.totals.penaltyUSD).toBeLessThan(penaltyFraction(idx, 'normal') * 100000);
    // The restore window matches data size / link speed.
    const hours = restoreHours(idx, n, k.onboardNicGbps);
    expect(hours).toBeCloseTo((nodeDataTB(idx, n) * 8e12) / (Math.min(k.offsiteRestoreGbps, k.onboardNicGbps) * 1e9) / 3600, 9);
    expect(n.restoringUntilH - dc.simH).toBeCloseTo(hours, 6);
    // Replace the drive; once the restore window has passed the node serves again.
    let after = D.replacePart(idx, r.dc, n.id, 'storage:0').dc;
    after = run(after, Math.ceil(hours) + 1);
    expect(after.nodes[0].down).toBe(false);
  });
  it('without an offsite copy the same drive death is a full data loss', () => {
    let dc = D.newDatacenter(catalog, idx, 3);
    dc = D.buyNode(catalog, idx, dc, { build: cpuNode, role: 'vm', rackId: 'rack-1' }).dc;
    const r = D.stepDatacenter(catalog, idx, run(dc, 11), 1, { money: 100000, force: { part: { nodeId: dc.nodes[0].id, key: 'storage:0' } } });
    expect(r.dc.nodes[0].dataLost).toBe(true);
    expect(r.dc.totals.penaltyUSD).toBeCloseTo(penaltyFraction(idx, 'normal') * 100000, 6);
  });
});

describe('save version 3 (stage 10)', () => {
  it('a version 2 save migrates to difficulty normal', () => {
    const data = toSaveData(newGame(catalog)); delete data.difficulty;
    const v2 = JSON.stringify({ version: 2, savedAt: 0, checksum: fnv1a(JSON.stringify(data)), data });
    const r = deserialize(v2, idx);
    expect(r.error).toBeUndefined();
    expect(r.data.difficulty).toBe('normal');
  });
  it('a hard game keeps its difficulty through save and load', () => {
    const g = newGame(catalog, 'hard');
    expect(g.jobs.every((j) => j.difficulty === 'hard')).toBe(true);
    expect(deserialize(serialize(toSaveData(g)), idx).data.difficulty).toBe('hard');
  });
});
