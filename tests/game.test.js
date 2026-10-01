import { describe, it, expect } from 'vitest';
import { dev } from '../scripts/dev-data.js';
import { buildGameData, resolve } from '../src/data/build.js';
import { indexCatalog } from '../src/sim/util.js';
import { runStressTest } from '../src/sim/stress.js';
import { generateJob, evaluateForJob, scoreDelivery, levelFor } from '../src/jobs/index.js';
import { newPlayer, applyDelivery } from '../src/game/player.js';
import { startStressTest, canDeliver, configKey } from '../src/game/flow.js';
import { emptyBuild, addPart } from '../src/ui/buildState.js';

const catalog = resolve(buildGameData(dev));
const idx = indexCatalog(catalog);
const job = generateJob(catalog, { seed: 5, idx, tier: 'homelab', level: 1 });
const { build, software } = job.reference;
const ev = evaluateForJob(catalog, job, build, software, { idx });

describe('stress test and delivery (stage 7)', () => {
  it('a passing test on the same build and software allows delivery', () => {
    const run = startStressTest(ev, job, build, software, 1);
    expect(run.result.completed).toBe(true);
    expect(run.result.samples[0].t).toBe(0);
    expect(run.result.samples.at(-1).t).toBe(3600);
    expect(canDeliver(run, build, software)).toBe(true);
  });

  it('a part failure stops the test, blocks delivery, and the redo starts over at t = 0', () => {
    const failed = runStressTest(ev, job.room, { seed: 1, forceFailure: { key: 'psu', atS: 1200 } });
    expect(failed.completed).toBe(false);
    expect(failed.failedAtS).toBe(1200);
    expect(failed.failure.part).toBe('psu');
    expect(failed.failure.message).toMatch(/failed at 20:00/);
    const run = { key: configKey(build, software), attempt: 1, seed: 1, result: failed };
    expect(canDeliver(run, build, software)).toBe(false);
    const redo = startStressTest(ev, job, build, software, 2);
    expect(redo.seed).not.toBe(run.seed);
    expect(redo.result.samples[0].t).toBe(0);
  });

  it('changing the build or software after a pass needs a new test', () => {
    const run = startStressTest(ev, job, build, software, 1);
    expect(canDeliver(run, { ...build, fans: [{ part: 'fan-sirocco-12m', count: 1 }] }, software)).toBe(false);
    expect(canDeliver(run, build, { ...software, os: 'windows' })).toBe(false);
  });

  it('a build with a hard failure fails the test at t = 0', () => {
    const bad = evaluateForJob(catalog, job, build, { ...software, os: undefined }, { idx });
    const run = startStressTest(bad, job, build, { ...software, os: undefined }, 1);
    expect(run.result.completed).toBe(false);
    expect(run.result.failedAtS).toBe(0);
  });
});

describe('payout, xp and levels (stage 7)', () => {
  it('payout and xp follow the score', () => {
    const score = scoreDelivery(ev, job);
    const out = applyDelivery(newPlayer(), job, score);
    expect(out.earned.money).toBe(Math.round(job.payoutUSD * score.payoutMultiplier));
    expect(out.earned.xp).toBe(Math.round(job.xp * score.xpMultiplier));
    const half = applyDelivery(newPlayer(), job, { ...score, score: 50, payoutMultiplier: 0.5, xpMultiplier: 0.5 });
    expect(half.earned.money).toBeLessThan(out.earned.money);
    expect(half.earned.xp).toBeLessThan(out.earned.xp);
    const rejected = applyDelivery(newPlayer(), job, { ...score, payoutMultiplier: 0, xpMultiplier: 0.25 });
    expect(rejected.earned.money).toBe(0);
  });

  it('levels up exactly at 250, 1000, 2250 and 4000 xp', () => {
    let p = newPlayer();
    const fake = { ...job, xp: 1 };
    const give = (n) => { const o = applyDelivery(p, { ...fake, xp: n }, { score: 100, payoutMultiplier: 1, xpMultiplier: 1 }); p = o.player; return o.levelUp; };
    expect(give(249)).toBe(null);
    expect(give(1)).toBe(2);
    expect(give(749)).toBe(null);
    expect(give(1)).toBe(3);
    expect(levelFor(2250)).toBe(4);
    expect(levelFor(4000)).toBe(5);
  });

  it('every part can be added at level 1 (parts are never gated)', () => {
    let b = emptyBuild();
    for (const list of Object.values(catalog.parts)) for (const part of list) b = addPart(b, idx.parts.get(part.id));
    expect(b.gpus.length).toBe(catalog.parts.gpu.length);
  });
});
