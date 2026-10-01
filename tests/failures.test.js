import { describe, it, expect } from 'vitest';
import { dev } from '../scripts/dev-data.js';
import { buildGameData, resolve } from '../src/data/build.js';
import { indexCatalog } from '../src/sim/util.js';
import { referenceCandidates } from '../src/jobs/templates.js';
import * as D from '../src/dc/datacenter.js';
import { upsRuntimeMin, rebuildUreRisk, penaltyFraction } from '../src/dc/failures.js';

const catalog = resolve(buildGameData(dev));
const idx = indexCatalog(catalog);
const k = idx.constants.datacenter;
const cpuNode = referenceCandidates(catalog, idx, 'server', false)[0].build;
const DRIVE = cpuNode.storage[0].part;
const MONEY = 100000;

function site({ drives = 1, raid = 'none', snapshots = false, offsite = false, ups = 0 } = {}) {
  let dc = D.newDatacenter(catalog, idx, 3);
  dc = D.buyNode(catalog, idx, dc, { build: cpuNode, role: 'vm', rackId: 'rack-1' }).dc;
  const id = dc.nodes[0].id;
  for (let i = 1; i < drives; i++) dc = D.addDrive(idx, dc, id, DRIVE).dc;
  if (raid !== 'none') dc = D.setRaid(dc, id, raid).dc;
  dc = D.setSnapshots(dc, id, snapshots).dc;
  dc = D.setOffsite(dc, offsite).dc;
  for (let i = 0; i < ups; i++) dc = D.buyUps(idx, dc).dc;
  return { dc, id };
}
const step = (dc, force) => D.stepDatacenter(catalog, idx, dc, 1, { money: MONEY, difficulty: 'normal', force });
const lost = (r) => r.dc.nodes[0].dataLost;

describe('part failures (stage 9b)', () => {
  it('seeded failures are deterministic', () => {
    const run = () => { let { dc } = site(); for (let h = 0; h < 3000; h++) dc = step(dc).dc; return dc; };
    expect(run()).toEqual(run());
  });
  it('a dead non-drive part takes the node down until replaced, and replacing costs the part', () => {
    const { dc, id } = site();
    const r = step(dc, { part: { nodeId: id, key: 'cpu' } });
    expect(r.dc.nodes[0].down).toBe(true);
    expect(r.dc.alerts[0].text).toMatch(/died/);
    expect(step(r.dc).dc.last.nodes[0].ok).toBe(false);
    const fix = D.replacePart(idx, r.dc, id, 'cpu');
    expect(fix.costUSD).toBe(idx.parts.get(cpuNode.cpu).priceUSD);
    expect(fix.dc.nodes[0].down).toBe(false);
  });
});

describe('data loss and protection (stage 9b)', () => {
  it('an unprotected drive death loses data and costs a difficulty-scaled penalty', () => {
    const { dc, id } = site();
    const r = step(dc, { part: { nodeId: id, key: 'storage:0' } });
    expect(lost(r)).toBe(true);
    expect(r.dc.totals.penaltyUSD).toBeCloseTo(penaltyFraction(idx, 'normal') * MONEY, 6);
    expect(r.dc.alerts.some((a) => a.kind === 'data-loss')).toBe(true);
    expect(penaltyFraction(idx, 'hard')).toBe(0.13);
    expect(penaltyFraction(idx, 'easy')).toBe(0.085);
  });
  it('RAID protects against a drive dying, unless the rebuild hits a read error', () => {
    const { dc, id } = site({ drives: 2, raid: 'raid1' });
    expect(lost(step(dc, { part: { nodeId: id, key: 'storage:0' }, ure: 0 }))).toBe(false);
    expect(lost(step(dc, { part: { nodeId: id, key: 'storage:0' }, ure: 1 }))).toBe(true);
    const r6 = site({ drives: 4, raid: 'raid6' });
    expect(lost(step(r6.dc, { part: { nodeId: r6.id, key: 'storage:0' } }))).toBe(false);
  });
  it('rebuild read-error risk grows with array size and NAS-class drives', () => {
    const a = site({ drives: 3, raid: 'raid5' }).dc.nodes[0];
    const b = site({ drives: 6, raid: 'raid5' }).dc.nodes[0];
    expect(rebuildUreRisk(idx, b)).toBeGreaterThan(rebuildUreRisk(idx, a));
  });
  it('snapshots protect against a bad change and nothing else', () => {
    const s = site({ snapshots: true });
    expect(lost(step(s.dc, { badChange: s.id }))).toBe(false);
    expect(lost(step(s.dc, { part: { nodeId: s.id, key: 'storage:0' } }))).toBe(true);
    expect(lost(step(s.dc, { siteLoss: true }))).toBe(true);
    const raid = site({ drives: 2, raid: 'raid1' });
    expect(lost(step(raid.dc, { badChange: raid.id }))).toBe(true);
  });
  it('without an offsite copy, losing the site loses everything even with RAID and snapshots', () => {
    const raid = site({ drives: 2, raid: 'raid1', snapshots: true });
    expect(lost(step(raid.dc, { siteLoss: true }))).toBe(true);
  });
  it('a UPS covers a power cut shorter than its runtime, not a longer one, and protects no data', () => {
    const u = site({ ups: 2 });
    const load = step(u.dc).dc.last.wallW;
    const runtime = upsRuntimeMin(k, 2, load);
    expect(runtime).toBeGreaterThan(0);
    expect(step(u.dc, { powerCutMin: runtime * 0.9 }).dc.last.darkFrac).toBe(0);
    expect(step(u.dc, { powerCutMin: runtime + 30 }).dc.last.darkFrac).toBeGreaterThan(0);
    expect(step(site().dc, { powerCutMin: 20 }).dc.last.darkFrac).toBeGreaterThan(0);
    expect(lost(step(u.dc, { part: { nodeId: u.id, key: 'storage:0' } }))).toBe(true);
  });
  it('UPS runtime matches the published points', () => {
    expect(upsRuntimeMin(k, 1, 1000)).toBeCloseTo(7.2, 6);
    expect(upsRuntimeMin(k, 1, 500)).toBeCloseTo(25.8, 6);
    expect(upsRuntimeMin(k, 2, 1000)).toBeCloseTo(25.8, 6);
    expect(upsRuntimeMin(k, 1, 1200)).toBe(0);
  });
});
