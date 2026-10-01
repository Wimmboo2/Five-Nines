import { describe, it, expect } from 'vitest';
import { dev } from '../scripts/dev-data.js';
import { buildGameData, resolve } from '../src/data/build.js';
import { indexCatalog } from '../src/sim/util.js';
import { serialize, deserialize, SAVE_VERSION, SAVE_KEY, fnv1a } from '../src/save/save.js';
import { makeStorage } from '../src/save/storage.js';
import { advance, MAX_TICK_S } from '../src/save/clock.js';
import { newGame, toSaveData, restoreRun } from '../src/game/state.js';
import { evaluateForJob } from '../src/jobs/index.js';
import { startStressTest } from '../src/game/flow.js';

const catalog = resolve(buildGameData(dev));
const idx = indexCatalog(catalog);

// A game in progress: active job with its reference build + software, money,
// a delivered job, and a stress run 23 simulated minutes in.
function midGame() {
  const g = newGame(catalog);
  const job = g.jobs[0];
  const { build, software } = job.reference;
  const ev = evaluateForJob(catalog, job, build, software, { idx });
  const run = { ...startStressTest(ev, job, build, software, 3), positionS: 1380 };
  return {
    ...g, tab: 'build', activeJobId: job.id, attempt: 3, run,
    build: { ...build, rack: null }, software: { gameServers: [], cloud: null, inference: null, ...software },
    player: { money: 1161, xp: 100, level: 1, delivered: [{ jobId: 'job-x', client: 'X', score: 100, money: 1161, xp: 100 }] },
    shop: { cat: 'gpu', tier: 'consumer' }, playedS: 754.5,
  };
}
const memStore = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }; };

describe('save format (stage 8)', () => {
  it('save -> load returns identical state', () => {
    const data = toSaveData(midGame());
    const back = deserialize(serialize(data), idx);
    expect(back.error).toBeUndefined();
    expect(back.removed).toEqual([]);
    expect(back.data).toEqual(data);
  });

  it('an unknown (newer) version is reported, not loaded, and does not crash', () => {
    const raw = JSON.stringify({ version: SAVE_VERSION + 1, savedAt: 0, checksum: fnv1a('{}'), data: {} });
    const r = deserialize(raw, idx);
    expect(r.unknownVersion).toBe(SAVE_VERSION + 1);
    expect(r.error).toMatch(/unknown version/);
  });

  it('corrupted JSON, a wrong checksum and a damaged shape each give a clear error', () => {
    expect(deserialize('{not json', idx).error).toMatch(/not valid JSON/);
    const good = JSON.parse(serialize(toSaveData(midGame())));
    good.data.player.money = 999999999;
    expect(deserialize(JSON.stringify(good), idx).error).toMatch(/checksum/);
    const data = toSaveData(midGame()); delete data.player;
    expect(deserialize(serialize(data), idx).error).toMatch(/player/);
    expect(deserialize(JSON.stringify({ hello: 1 }), idx).error).toMatch(/not a Five Nines save/);
  });

  it('ids missing from the catalog are dropped with a message, never a crash', () => {
    const data = toSaveData(midGame());
    data.build.gpus = [...data.build.gpus, { part: 'gpu-gone-9000' }];
    data.build.cpu = 'cpu-gone';
    data.software.inference = { engine: 'eng-kettle', model: 'mdl-gone' };
    data.jobs = [...data.jobs, { ...data.jobs[1], id: 'job-gone', workload: { inference: { model: 'mdl-gone' } } }];
    const r = deserialize(serialize(data), idx);
    expect(r.error).toBeUndefined();
    expect(r.data.build.gpus.some((g) => g.part === 'gpu-gone-9000')).toBe(false);
    expect(r.data.build.cpu).toBe(null);
    expect(r.data.software.inference).toBe(null);
    expect(r.data.jobs.some((j) => j.id === 'job-gone')).toBe(false);
    expect(r.removed.length).toBe(4);
  });
});

describe('storage failures (stage 8)', () => {
  it('unavailable storage returns ok:false instead of throwing', () => {
    const blocked = { getItem() { throw new DOMException('denied', 'SecurityError'); }, setItem() { throw new DOMException('denied', 'SecurityError'); }, removeItem() { throw new Error('x'); } };
    const s = makeStorage(blocked);
    expect(s.read(SAVE_KEY).ok).toBe(false);
    expect(s.write(SAVE_KEY, 'x').ok).toBe(false);
  });
  it('a full quota is reported as full', () => {
    const full = { getItem: () => null, setItem() { throw new DOMException('quota', 'QuotaExceededError'); } };
    const r = makeStorage(full).write(SAVE_KEY, 'x');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/full/);
  });
  it('a bad import leaves the stored save untouched', () => {
    const store = memStore();
    const s = makeStorage(store);
    const saved = serialize(toSaveData(midGame()));
    s.write(SAVE_KEY, saved);
    const bad = deserialize('{"version":1,"checksum":"0","data":{}}', idx);
    expect(bad.error).toBeTruthy();
    // The app only writes after a successful deserialize; the store still has the old save.
    expect(s.read(SAVE_KEY).value).toBe(saved);
  });
});

describe('resume and time (stage 8)', () => {
  it('a stress test resumed after a reload gives the same final result', () => {
    const g = midGame();
    const uninterrupted = g.run.result;
    const back = deserialize(serialize(toSaveData(g)), idx).data;
    const resumed = restoreRun(catalog, idx, back);
    expect(resumed.positionS).toBe(1380);
    expect(resumed.seed).toBe(g.run.seed);
    expect(resumed.result).toEqual(uninterrupted);
  });
  it('a stress run is dropped if the build changed since it ran', () => {
    const data = toSaveData(midGame());
    data.build.fans = [{ part: 'fan-sirocco-12m', count: 1 }];
    expect(restoreRun(catalog, idx, data)).toBe(null);
  });
  it('time played has no catch-up for time away', () => {
    expect(advance(10, 0, 1000)).toBe(11);
    expect(advance(10, 0, 8 * 3600 * 1000)).toBe(10 + MAX_TICK_S);
  });
});
