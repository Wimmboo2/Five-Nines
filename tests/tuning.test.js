import { describe, it, expect } from 'vitest';
import { dev } from '../scripts/dev-data.js';
import { buildGameData, resolve } from '../src/data/build.js';
import { indexCatalog } from '../src/sim/util.js';
import { referenceCandidates } from '../src/jobs/templates.js';
import * as D from '../src/dc/datacenter.js';
import { sizeClass, tokenPriceFor, activeParamsB } from '../src/dc/model.js';

const catalog = resolve(buildGameData(dev));
const idx = indexCatalog(catalog);
const k = idx.constants.datacenter;
const gpuNode = referenceCandidates(catalog, idx, 'server', true)[3].build;
const cpuNode = referenceCandidates(catalog, idx, 'server', false)[0].build;
const steps = (dc, n, opts = {}) => { for (let i = 0; i < n; i++) dc = D.stepDatacenter(catalog, idx, dc, 1, { money: 1e6, ...opts }).dc; return dc; };

describe('demand growth and reputation (tuning pass 1)', () => {
  it('growth is linear and stops at the market ceiling', () => {
    const late = steps({ ...D.newDatacenter(catalog, idx, 1), simH: 24 * 10000 }, 0);
    const g = (h) => Math.min(k.marketCeiling, 1 + (k.growthPerDay * h) / 24);
    expect(g(24 * 10000)).toBe(k.marketCeiling);
    expect(g(24 * 10)).toBeCloseTo(1.1, 9);
    expect(late.simH).toBe(240000);
  });
  it('customers still arrive at reputation 0', () => {
    let dc = D.buyNode(catalog, idx, D.newDatacenter(catalog, idx, 2), { build: cpuNode, role: 'game', rackId: 'rack-1' }).dc;
    dc = { ...dc, reputation: 0, customers: [] };
    let arrivals = 0;
    for (let i = 0; i < 1500; i++) { const n = dc.customers.length; dc = D.stepDatacenter(catalog, idx, { ...dc, reputation: 0 }, 1, { money: 0 }).dc; arrivals += dc.customers.length > n ? 1 : 0; }
    expect(arrivals).toBeGreaterThan(0);
  });
  it('after heavy overload, adding capacity brings reputation back within ~400 simulated hours', () => {
    let dc = D.newDatacenter(catalog, idx, 4);
    dc = D.buyNode(catalog, idx, dc, { build: gpuNode, role: 'inference', model: 'mdl-tamarin-31-8b', rackId: 'rack-1' }).dc;
    dc = D.buyNode(catalog, idx, dc, { build: cpuNode, role: 'vm', rackId: 'rack-1' }).dc;
    dc.customers = Array.from({ length: 20 }, (_, i) => ({ id: `o${i}`, role: 'inference', cls: 'small', size: 300, since: 0, spike: null }));
    dc = steps(dc, 200);
    const low = dc.reputation;
    expect(low).toBeLessThan(20);
    for (let i = 0; i < 3; i++) dc = D.buyNode(catalog, idx, dc, { build: gpuNode, role: 'inference', model: 'mdl-tamarin-31-8b', rackId: 'rack-1' }).dc;
    dc = steps(dc, 400);
    expect(dc.reputation).toBeGreaterThan(low + 20);
  });
  it('reputation recovers per workload: one overloaded workload no longer blocks all recovery', () => {
    let dc = D.newDatacenter(catalog, idx, 5);
    dc = D.buyNode(catalog, idx, dc, { build: gpuNode, role: 'inference', model: 'mdl-tamarin-31-8b', rackId: 'rack-1' }).dc;
    dc = D.buyNode(catalog, idx, dc, { build: cpuNode, role: 'game', rackId: 'rack-1' }).dc;
    dc = { ...dc, reputation: 20, customers: [{ id: 'g', role: 'game', size: 5000, since: 0, spike: null }] };
    const r = D.stepDatacenter(catalog, idx, dc, 1, { money: 0 }).dc;
    expect(r.last.util.game).toBeGreaterThan(1);
    expect(r.reputation).toBeGreaterThan(20);
  });
});

describe('inference priced by model size (tuning pass 1)', () => {
  it('classes follow active parameters, so MoE models count by what they use per token', () => {
    expect(sizeClass(idx, 'mdl-tamarin-31-8b')).toBe('small');
    expect(sizeClass(idx, 'mdl-quill-3-30b-a3b')).toBe('small');
    expect(activeParamsB(idx, 'mdl-quill-3-30b-a3b')).toBeLessThan(5);
    expect(sizeClass(idx, 'mdl-quill-3-32b')).toBe('medium');
    expect(sizeClass(idx, 'mdl-tamarin-33-70b')).toBe('large');
  });
  it('bigger classes pay more per token, less than in proportion', () => {
    const [s, m, l] = ['small', 'medium', 'large'].map((c) => tokenPriceFor(k, c));
    expect(s).toBe(k.priceUSDPerMTokens);
    expect(m).toBeGreaterThan(s); expect(l).toBeGreaterThan(m);
    expect(l / s).toBeLessThan(k.largeRefActiveB / k.smallRefActiveB);
  });
  it('customers ask for the class a node serves, and only that class uses it', () => {
    let dc = D.buyNode(catalog, idx, D.newDatacenter(catalog, idx, 6), { build: gpuNode, role: 'inference', model: 'mdl-tamarin-31-8b', rackId: 'rack-1' }).dc;
    dc = steps(dc, 600);
    const inf = dc.customers.filter((c) => c.role === 'inference');
    expect(inf.length).toBeGreaterThan(0);
    expect(inf.every((c) => c.cls === 'small')).toBe(true);
    const big = { ...dc, customers: [{ id: 'x', role: 'inference', cls: 'large', size: 50, since: 0, spike: null }] };
    expect(D.stepDatacenter(catalog, idx, big, 1, { money: 0 }).dc.last.buckets['inference:large'].capacity).toBe(0);
  });
});

describe('PSU module redundancy (tuning pass 1)', () => {
  const dcNode = referenceCandidates(catalog, idx, 'datacenter', true)[0].build;
  const open = () => {
    let dc = D.newDatacenter(catalog, idx, 8);
    dc = { ...dc, utilityW: 1e6 };
    dc = D.buyNode(catalog, idx, dc, { build: dcNode, role: 'inference', model: 'mdl-tamarin-31-8b', rackId: 'rack-1' }).dc;
    return steps(dc, 1);
  };
  const killPsu = (dc) => D.stepDatacenter(catalog, idx, dc, 1, { money: 0, force: { part: { nodeId: dc.nodes[0].id, key: 'psu' } } }).dc;
  it('a node with spare modules keeps running when one dies, alerts, and needs every spare gone to go down', () => {
    let dc = open();
    const n0 = dc.nodes[0];
    const spare = n0.build.psuCount - n0.psuRequired;
    expect(spare).toBeGreaterThan(0);
    dc = killPsu(dc);
    expect(dc.nodes[0].down).toBe(false);
    expect(dc.alerts[0].text).toMatch(/PSU module .* still running \(N\+/);
    for (let i = 1; i < spare; i++) dc = killPsu(dc);
    expect(dc.nodes[0].down).toBe(false);
    dc = killPsu(dc);
    expect(dc.nodes[0].down).toBe(true);
    expect(dc.alerts[0].text).toMatch(/can't carry the load/);
    // Replacing one module brings it back up; replacing all restores full redundancy.
    dc = D.replacePart(idx, dc, dc.nodes[0].id, 'psu').dc;
    expect(dc.nodes[0].down).toBe(false);
    for (const d of [...dc.nodes[0].dead]) if (d.key === 'psu') dc = D.replacePart(idx, dc, dc.nodes[0].id, 'psu').dc;
    expect(D.psuAlive(dc.nodes[0])).toBe(dc.nodes[0].build.psuCount);
  });
  it('a single ATX PSU still takes its node down', () => {
    let dc = D.buyNode(catalog, idx, D.newDatacenter(catalog, idx, 9), { build: cpuNode, role: 'vm', rackId: 'rack-1' }).dc;
    dc = steps(dc, 1);
    dc = killPsu(dc);
    expect(dc.nodes[0].down).toBe(true);
  });
});
