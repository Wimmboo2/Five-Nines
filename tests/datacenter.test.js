import { describe, it, expect } from 'vitest';
import { dev } from '../scripts/dev-data.js';
import { buildGameData, resolve } from '../src/data/build.js';
import { indexCatalog } from '../src/sim/util.js';
import { evaluateBuild } from '../src/sim/evaluate.js';
import { referenceCandidates } from '../src/jobs/templates.js';
import { referenceSoftware } from '../src/jobs/software.js';
import { buildCost } from '../src/jobs/cost.js';
import { GATES } from '../src/jobs/levels.js';
import * as D from '../src/dc/datacenter.js';
import { hallRoom, nodeProfile } from '../src/dc/model.js';
import { dcAdvance } from '../src/dc/clock.js';
import { serialize, deserialize, fnv1a } from '../src/save/save.js';
import { newGame, toSaveData } from '../src/game/state.js';

const catalog = resolve(buildGameData(dev));
const idx = indexCatalog(catalog);
const k = idx.constants.datacenter;
const gpuNode = referenceCandidates(catalog, idx, 'server', true)[3].build;
const cpuNode = referenceCandidates(catalog, idx, 'server', false)[0].build;
const MODEL = 'mdl-tamarin-31-8b';

function withNodes(seed = 7) {
  let dc = D.newDatacenter(catalog, idx, seed);
  for (const [build, role] of [[gpuNode, 'inference'], [cpuNode, 'game'], [cpuNode, 'vm']]) dc = D.buyNode(catalog, idx, dc, { build, role, model: MODEL, rackId: 'rack-1' }).dc;
  return dc;
}
const run = (dc, hours) => { let money = 0; for (let h = 0; h < hours; h++) { const r = D.stepDatacenter(catalog, idx, dc, 1); dc = r.dc; money += r.moneyDelta; } return { dc, money }; };

describe('datacenter hardware (stage 9a)', () => {
  it('unlocks at level 5 and opening costs a rack plus a PDU', () => {
    expect(GATES.personalDatacenter).toBe(5);
    expect(D.openCost(idx)).toBe(idx.parts.get(D.START_RACK).priceUSD + idx.parts.get(D.START_PDU).priceUSD);
  });
  it('a node costs its parts and must fit in the rack', () => {
    const dc = D.newDatacenter(catalog, idx, 1);
    const r = D.buyNode(catalog, idx, dc, { build: cpuNode, role: 'vm', rackId: 'rack-1' });
    expect(r.costUSD).toBe(buildCost(idx, cpuNode));
    let d = dc;
    for (let i = 0; i < 10; i++) d = D.buyNode(catalog, idx, d, { build: cpuNode, role: 'vm', rackId: 'rack-1' }).dc ?? d;
    expect(D.buyNode(catalog, idx, d, { build: cpuNode, role: 'vm', rackId: 'rack-1' }).error).toMatch(/Not enough room/);
  });
  it('inference capacity is the evaluateBuild aggregate for that node', () => {
    const dc = withNodes();
    const hall = hallRoom(catalog, idx, dc, dc.hallC);
    const p = nodeProfile(catalog, idx, dc.nodes[0], hall);
    const sw = referenceSoftware(idx, { inference: { model: MODEL, contextLength: k.inferenceContext, concurrency: p.concurrency } }, gpuNode);
    const ev = evaluateBuild(catalog, gpuNode, sw, { ...hall, ambientC: Math.round(hall.currentC), airChangesPerHour: k.nodeInletAch }, { idx });
    expect(p.capacity).toBeCloseTo(ev.inference.decodeAtWork.aggregate, 6);
  });
});

describe('demand, overload and income (stage 9a)', () => {
  it('is deterministic per seed and differs between seeds', () => {
    expect(run(withNodes(7), 300).dc).toEqual(run(withNodes(7), 300).dc);
    expect(run(withNodes(7), 300).dc.customers).not.toEqual(run(withNodes(8), 300).dc.customers);
  });
  it('customers arrive and pay', () => {
    const r = run(withNodes(), 300);
    expect(r.dc.customers.length).toBeGreaterThan(0);
    expect(r.dc.totals.earnedUSD).toBeGreaterThan(0);
  });
  it('slow service lowers pay; sustained heavy overload drives customers away and costs reputation', () => {
    let dc = withNodes();
    const cap = run(dc, 1).dc.last.capacity.inference;
    // Between 100% and 125%: slow, pay = demand x price / util = capacity x price.
    dc.customers = [{ id: 'a', role: 'inference', size: cap * 1.1, since: 0, spike: null }];
    let r = D.stepDatacenter(catalog, idx, { ...dc, customers: dc.customers }, 1);
    const u = r.dc.last.util.inference;
    expect(u).toBeGreaterThan(1);
    expect(r.dc.last.incomePerH).toBeLessThan(r.dc.last.demand.inference * 3600 / 1e6 * k.priceUSDPerMTokens);
    // Far over: after churnAfterH hours a customer leaves and reputation drops.
    dc.customers = Array.from({ length: 6 }, (_, i) => ({ id: `x${i}`, role: 'inference', size: cap, since: 0, spike: null }));
    const rep0 = dc.reputation;
    r = run(dc, k.churnAfterH);
    expect(r.dc.customers.filter((c) => c.id.startsWith('x')).length).toBeLessThan(6);
    expect(r.dc.reputation).toBeLessThan(rep0);
  });
  it('a site power limit holds every node back', () => {
    const dc = { ...withNodes(), utilityW: 300 };
    const r = D.stepDatacenter(catalog, idx, dc, 1);
    expect(r.dc.last.powerFactor).toBeLessThan(1);
  });
});

describe('time and saves (stage 9a)', () => {
  it('does not advance while the tab is hidden, and never catches up', () => {
    expect(dcAdvance(0, 0, 1000, false, 1)).toEqual({ steps: 0, carryH: 0 });
    expect(dcAdvance(0, 0, 1000, true, 1).steps).toBe(1);
    expect(dcAdvance(0, 0, 3600 * 1000, true, 1).steps).toBe(2);
  });
  it('migrates a version 1 save (no datacenter) to version 2', () => {
    const data = toSaveData(newGame(catalog));
    delete data.datacenter; delete data.dcCarryH;
    const v1 = JSON.stringify({ version: 1, savedAt: 0, checksum: fnv1a(JSON.stringify(data)), data });
    const r = deserialize(v1, idx);
    expect(r.error).toBeUndefined();
    expect(r.data.datacenter).toBe(null);
  });
  it('datacenter state survives save -> load exactly', () => {
    const g = { ...newGame(catalog), datacenter: run(withNodes(), 50).dc };
    const back = deserialize(serialize(toSaveData(g)), idx);
    expect(back.error).toBeUndefined();
    expect(back.data.datacenter).toEqual(g.datacenter);
    // and continues identically
    expect(run(back.data.datacenter, 20).dc).toEqual(run(g.datacenter, 20).dc);
  });
});
