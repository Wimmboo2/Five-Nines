import { describe, it, expect } from 'vitest';
import { dev } from '../scripts/dev-data.js';
import { buildGameData, resolve } from '../src/data/build.js';
import { indexCatalog } from '../src/sim/util.js';
import { evaluateBuild, runStressTest } from '../src/sim/index.js';

// The sim needs an OS pick; these tests are about hardware and inference, so Linux.
const evalLinux = (cat, build, sw, room, opts) => evaluateBuild(cat, build, { os: 'linux', ...sw }, room, opts);
import { buildLayout } from '../src/sim/layout.js';
import { planMemory } from '../src/sim/memory.js';
import { makeContext, decodeRate, groupLink } from '../src/sim/inference.js';
import { kvBytesTotal, weightGeometry } from '../src/sim/model.js';
import { wallPower } from '../src/sim/power.js';
import { minecraftLoad } from '../src/sim/gameserver.js';
import { noiseAtListener } from '../src/sim/noise.js';
import { smallClosedRoom, exampleBuild, exampleSoftware } from './fixtures/example-job.js';

const catalog = resolve(buildGameData(dev));
const idx = indexCatalog(catalog);
const model = (id) => idx.models.get(id);

// Build a host around some GPUs.
function host(gpuPart, n = 1, extra = {}) {
  return {
    gpus: Array.from({ length: n }, () => ({ part: gpuPart })),
    cpu: 'cpu-keystone-32-g5', cooler: 'clr-frostline-loop360',
    ram: [{ part: 'ram-rack-64-d5-6400', count: 12 }],
    storage: [{ part: 'sto-strata-vault-3t8', count: 1 }],
    psu: 'psu-voltaic-t1600', chassis: 'chs-hollow-r4',
    fans: [{ part: 'fan-sirocco-12m', count: 7 }],
    ...extra,
  };
}

function decodeTokS(build, inf, depth = 1024) {
  const layout = buildLayout(idx, build, inf);
  expect(layout.errors).toEqual([]);
  const mem = planMemory(idx, build, inf, layout);
  const c = makeContext(idx, build, inf, layout, mem);
  return { tokS: decodeRate(c, inf.concurrency ?? 1, depth).perSequence, mem, layout };
}

describe('KV cache and weight sizes', () => {
  it('matches hand-worked KV cache for Qwen3-32B at 131,072 tokens, f16', () => {
    // 2 (K and V) x 8 KV heads x 128 head dim x 2 bytes x 64 layers x 131072 tokens
    const expected = 2 * 8 * 128 * 2 * 64 * 131072;
    expect(expected).toBe(34359738368);
    expect(kvBytesTotal(model('mdl-quill-3-32b'), 2, 131072, 1)).toBe(expected);
  });

  it('only stores the window for sliding-window layers (gpt-oss-120b)', () => {
    const perTokLayer = 2 * 8 * 64 * 2; // 2048 bytes
    const expected = 18 * perTokLayer * 131072 + 18 * perTokLayer * 128;
    expect(kvBytesTotal(model('mdl-ossia-120b'), 2, 131072, 1)).toBeCloseTo(expected, 0);
  });

  it('uses GGML block sizes for quantized KV (q8_0 = 34 bytes per 32 values)', () => {
    const f16 = kvBytesTotal(model('mdl-quill-3-30b-a3b'), 2, 262144, 1);
    const q8 = kvBytesTotal(model('mdl-quill-3-30b-a3b'), idx.kvCacheTypes.q8_0.bytesPerElement, 262144, 1);
    expect(q8 / f16).toBeCloseTo(34 / 32 / 2, 6);
  });

  it('uses the real file size as the weight size, and the bits per weight are plausible', () => {
    const m = model('mdl-quill-3-32b');
    const geo = weightGeometry(m, 'Q4_K_M');
    expect(geo.total).toBe(19762149696);
    expect((geo.bpp * 8)).toBeGreaterThan(4.5);
    expect((geo.bpp * 8)).toBeLessThan(5.2);
  });
});

describe('memory fit', () => {
  it('fails a build whose weights + KV cache do not fit, and says why', () => {
    const build = host('gpu-ember-g3-24');
    const r = evalLinux(catalog, build, {
      inference: { engine: 'eng-kettle', model: 'mdl-quill-3-32b', quant: 'Q4_K_M', kvType: 'f16', contextLength: 131072, concurrency: 1, splitMode: 'none' },
    }, smallClosedRoom);
    const mem = r.failures.filter((f) => f.code === 'memory');
    expect(mem).toHaveLength(1);
    expect(mem[0].message).toMatch(/KV cache 34\.4 GB for 131,072 tokens/);
    expect(mem[0].message).toMatch(/GPU 0/);
  });

  it('the same model fits with a shorter context', () => {
    const build = host('gpu-ember-g3-24');
    const r = evalLinux(catalog, build, {
      inference: { engine: 'eng-kettle', model: 'mdl-quill-3-32b', quant: 'Q4_K_M', kvType: 'f16', contextLength: 8192, concurrency: 1, splitMode: 'none' },
    }, smallClosedRoom);
    expect(r.failures.filter((f) => f.code === 'memory')).toEqual([]);
  });
});

describe('tensor parallel vs layer split', () => {
  // Requested by the user: 2 identical GPUs in TP are faster than 1, but not a perfect 2x.
  const cases = [
    ['vLLM TP2, NVLink-bridged 80 GB cards', 'gpu-bastion-h80', { engine: 'eng-sluice', model: 'mdl-quill-3-32b', quant: 'BF16', kvType: 'auto', contextLength: 8192 }, 'tp', true],
    ['vLLM TP2, 48 GB cards over PCIe', 'gpu-bastion-p48', { engine: 'eng-sluice', model: 'mdl-quill-3-32b', quant: 'AWQ', kvType: 'auto', contextLength: 8192 }, 'tp', false],
    ['llama.cpp row split, 2x 24 GB', 'gpu-ember-g3-24', { engine: 'eng-kettle', model: 'mdl-quill-3-32b', quant: 'Q4_K_M', kvType: 'f16', contextLength: 8192 }, 'row', true],
  ];
  for (const [name, gpu, inf, mode, bridges] of cases) {
    it(`${name}: faster than 1 GPU, slower than a perfect 2x`, () => {
      const one = decodeTokS(host(gpu, 1), { ...inf, tp: 1, pp: 1, splitMode: 'none' }).tokS;
      const two = decodeTokS(host(gpu, 2, { nvlinkBridges: bridges }), { ...inf, tp: 2, pp: 1, splitMode: mode }).tokS;
      expect(two).toBeGreaterThan(one);
      expect(two).toBeLessThan(2 * one);
    });
  }

  it('TP time is the slowest shard plus all-reduce, not the sum of shards', () => {
    const inf = { engine: 'eng-sluice', model: 'mdl-quill-3-32b', quant: 'BF16', kvType: 'auto', contextLength: 8192, tp: 2, pp: 1 };
    const { layout, mem } = decodeTokS(host('gpu-bastion-h80', 2, { nvlinkBridges: true }), inf);
    const c = makeContext(idx, host('gpu-bastion-h80', 2, { nvlinkBridges: true }), inf, layout, mem);
    const stage = decodeRate(c, 1, 1024).step.stages[0];
    const shardTimes = stage.devices.map((d) => d.t);
    expect(stage.t).toBeCloseTo(Math.max(...shardTimes) + stage.overhead + stage.comm, 12);
    expect(stage.t).toBeLessThan(shardTimes.reduce((a, b) => a + b, 0) + stage.overhead + stage.comm);
    expect(stage.comm).toBeGreaterThan(0);
  });

  it('layer split over 2 GPUs is no faster than 1 GPU when the model fits on one (times add)', () => {
    const inf = { engine: 'eng-kettle', model: 'mdl-tamarin-31-8b', quant: 'Q4_K_M', kvType: 'f16', contextLength: 8192 };
    const one = decodeTokS(host('gpu-ember-g4-24', 1), { ...inf, splitMode: 'none' }).tokS;
    const two = decodeTokS(host('gpu-ember-g4-24', 2), { ...inf, splitMode: 'layer' }).tokS;
    expect(two).toBeLessThanOrEqual(one);
    expect(two).toBeGreaterThan(0.85 * one);
  });

  it('CPU offload is slower than all-GPU', () => {
    const inf = { engine: 'eng-kettle', model: 'mdl-quill-3-32b', quant: 'Q4_K_M', kvType: 'f16', contextLength: 8192, splitMode: 'none' };
    const gpu = decodeTokS(host('gpu-ember-g4-24', 1), { ...inf, gpuLayers: 'all' }).tokS;
    const off = decodeTokS(host('gpu-ember-g4-24', 1), { ...inf, gpuLayers: 40 }).tokS;
    expect(off).toBeLessThan(gpu);
  });
});

describe('every software setting changes at least one result', () => {
  const baseBuild = host('gpu-bastion-h80', 2, { nvlinkBridges: true });
  const base = { engine: 'eng-sluice', model: 'mdl-tamarin-31-8b', quant: 'BF16', kvType: 'auto', contextLength: 8192, concurrency: 1, tp: 1, pp: 1, gpus: [0] };
  const sig = (inf) => {
    const r = evalLinux(catalog, baseBuild, { inference: inf }, smallClosedRoom);
    return JSON.stringify({
      f: r.failures.map((x) => x.message),
      d: r.inference && r.inference.decodeAtWork.perSequence.toFixed(6),
      t: r.inference && r.inference.ttftS.toFixed(6),
      m: r.memory && r.memory.devices.map((x) => [x.needBytes, x.usableBytes]),
      p: r.power && r.power.dcW.toFixed(3),
    });
  };
  const baseSig = sig(base);
  const variants = [
    ['engine -> llama.cpp-style', { engine: 'eng-kettle', splitMode: 'none', kvType: 'f16' }],
    ['engine -> SGLang-style', { engine: 'eng-loom' }],
    ['quantization -> FP8', { quant: 'FP8' }],
    ['quantization -> AWQ', { quant: 'AWQ' }],
    ['KV cache type -> fp8', { kvType: 'fp8' }],
    ['model -> 32B', { model: 'mdl-quill-3-32b' }],
    ['model -> MoE 30B-A3B', { model: 'mdl-quill-3-30b-a3b' }],
    ['tensor parallel -> 2', { tp: 2, gpus: [0, 1] }],
    ['pipeline parallel -> 2', { pp: 2, gpus: [0, 1] }],
    ['CPU offload -> 4 GB', { cpuOffloadGB: 4 }],
    ['context length -> 32k', { contextLength: 32768 }],
    ['concurrency -> 8', { concurrency: 8 }],
    ['memory fraction -> 0.5', { memFraction: 0.5 }],
  ];
  for (const [name, change] of variants) {
    it(name, () => {
      expect(sig({ ...base, ...change })).not.toBe(baseSig);
    });
  }
  const kettleBase = { engine: 'eng-kettle', model: 'mdl-quill-3-30b-a3b', quant: 'Q4_K_M', kvType: 'f16', contextLength: 8192, concurrency: 1, splitMode: 'none', gpus: [0] };
  const kettleSig = sig(kettleBase);
  for (const [name, change] of [
    ['llama.cpp: GPU layers -> 24', { gpuLayers: 24 }],
    ['llama.cpp: MoE experts on CPU -> 12 layers', { cpuMoeLayers: 12 }],
    ['llama.cpp: split mode -> layer across 2', { splitMode: 'layer', gpus: [0, 1] }],
    ['llama.cpp: split mode -> row across 2', { splitMode: 'row', gpus: [0, 1] }],
    ['llama.cpp: KV -> q4_0', { kvType: 'q4_0' }],
    ['llama.cpp: quant -> Q8_0', { quant: 'Q8_0' }],
  ]) {
    it(name, () => {
      expect(sig({ ...kettleBase, ...change })).not.toBe(kettleSig);
    });
  }

  it('rejects an engine/format combination the engine does not support', () => {
    const r = evalLinux(catalog, baseBuild, { inference: { ...base, quant: 'Q4_K_M' } }, smallClosedRoom);
    expect(r.failures.some((f) => f.code === 'config' && /cannot load Q4_K_M/.test(f.message))).toBe(true);
  });
});

describe('room temperature over the stress hour', () => {
  const run = (build, software, room) => {
    const r = evalLinux(catalog, build, software, room);
    expect(r.failures).toEqual([]);
    return runStressTest(r, room, { seed: 3, dtS: 30 });
  };

  it('rises over the hour in a closed room', () => {
    const s = run(exampleBuild, exampleSoftware, smallClosedRoom);
    expect(s.completed).toBe(true);
    const first = s.samples[0].roomC;
    const last = s.samples[s.samples.length - 1].roomC;
    expect(last).toBeGreaterThan(first + 3);
    for (let i = 1; i < s.samples.length; i++) expect(s.samples[i].roomC).toBeGreaterThanOrEqual(s.samples[i - 1].roomC - 1e-9);
  });

  it('rises more with more wall power', () => {
    const light = run(exampleBuild, { gameServers: [{ type: 'minecraft', players: 5 }] }, smallClosedRoom);
    const heavy = run(exampleBuild, exampleSoftware, smallClosedRoom);
    expect(heavy.samples.at(-1).wallW).toBeGreaterThan(light.samples.at(-1).wallW);
    expect(heavy.samples.at(-1).roomC).toBeGreaterThan(light.samples.at(-1).roomC);
  });

  it('rises less with more room airflow', () => {
    const closed = run(exampleBuild, exampleSoftware, smallClosedRoom);
    const vented = run(exampleBuild, exampleSoftware, { ...smallClosedRoom, airChangesPerHour: 20 });
    expect(vented.samples.at(-1).roomC).toBeLessThan(closed.samples.at(-1).roomC);
  });
});

describe('power and noise sanity', () => {
  it('wall power is above DC power, and PSU efficiency sits near its tier curve', () => {
    const psu = idx.parts.get('psu-voltaic-p1000');
    const w = wallPower(psu, 500);
    expect(w.wallW).toBeGreaterThan(500);
    expect(w.efficiency).toBeGreaterThan(0.88);
    expect(w.efficiency).toBeLessThan(0.95);
    // Light load is less efficient than half load (fixed losses dominate)
    expect(wallPower(psu, 50).efficiency).toBeLessThan(w.efficiency);
  });

  it('flags a PSU that is too small', () => {
    const build = { ...host('gpu-ember-g5-32', 2), psu: 'psu-voltaic-g650' };
    const r = evalLinux(catalog, build, {
      inference: { engine: 'eng-kettle', model: 'mdl-quill-3-32b', quant: 'Q4_K_M', kvType: 'f16', contextLength: 8192, concurrency: 16, splitMode: 'row' },
    }, smallClosedRoom);
    expect(r.failures.some((f) => f.code === 'power')).toBe(true);
  });

  it('adding fans at the same speed makes more noise', () => {
    const state = { caseFanSpeed: 0.8, gpuTemps: [{ fanSpeed: 0.5 }], cpu: { fanMode: 'quiet' } };
    const base = noiseAtListener(idx, exampleBuild, smallClosedRoom, state);
    const more = noiseAtListener(idx, { ...exampleBuild, fans: [{ part: 'fan-sirocco-12m', count: 4 }] }, smallClosedRoom, state);
    expect(more.atListener).toBeGreaterThan(base.atListener);
  });

  it('distance lowers the level by 20 log10(r)', () => {
    const near = evalLinux(catalog, exampleBuild, exampleSoftware, smallClosedRoom);
    const far = evalLinux(catalog, exampleBuild, exampleSoftware, { ...smallClosedRoom, listenerDistanceM: 4 });
    expect(far.noise.atListenerDBA).toBeCloseTo(near.noise.atListenerDBA - 20 * Math.log10(2), 6);
  });
});

describe('stress test', () => {
  it('stops at a forced part failure and reports the cause and time', () => {
    const r = evalLinux(catalog, exampleBuild, exampleSoftware, smallClosedRoom);
    const s = runStressTest(r, smallClosedRoom, { seed: 1, forceFailure: { key: 'gpu:0', atS: 600 } });
    expect(s.completed).toBe(false);
    expect(s.failedAtS).toBe(600);
    expect(s.failure.code).toBe('part-failure');
    expect(s.failure.part).toBe('gpu:0');
    expect(s.failure.message).toMatch(/failed at 10:00\. Replace it and run the whole test again\./);
  });

  it('is repeatable for the same seed', () => {
    const r = evalLinux(catalog, exampleBuild, exampleSoftware, smallClosedRoom);
    const a = runStressTest(r, smallClosedRoom, { seed: 42, dtS: 60 });
    const b = runStressTest(r, smallClosedRoom, { seed: 42, dtS: 60 });
    expect(a).toEqual(b);
  });

  it('a build that cannot run does not start the test', () => {
    const build = host('gpu-ember-g3-24');
    const r = evalLinux(catalog, build, {
      inference: { engine: 'eng-kettle', model: 'mdl-quill-3-32b', quant: 'Q4_K_M', kvType: 'f16', contextLength: 131072, splitMode: 'none' },
    }, smallClosedRoom);
    const s = runStressTest(r, smallClosedRoom);
    expect(s.completed).toBe(false);
    expect(s.failure.code).toBe('memory');
  });
});

describe('game server', () => {
  it('more players cost more tick time; a faster core costs less', () => {
    const b = { cpu: 'cpu-keystone-32-g2' };
    const few = minecraftLoad(idx, b, { players: 5 });
    const many = minecraftLoad(idx, b, { players: 40 });
    const fast = minecraftLoad(idx, { cpu: 'cpu-vela-16' }, { players: 40 });
    expect(many.mspt).toBeGreaterThan(few.mspt);
    expect(fast.mspt).toBeLessThan(many.mspt);
  });
});

describe('datacenter nodes and 2026 model geometry (Part 0)', () => {
  const node = (gpu, extra = {}) => ({
    chassis: 'node-forge-h8', cpu: 'cpu-keystone-64-g5', cpuCount: 2,
    gpus: Array.from({ length: 8 }, () => ({ part: gpu })), ram: [{ part: 'ram-rack-32-d5-5600', count: 24 }],
    storage: [], psu: 'psu-voltaic-m3300', psuCount: 6, fans: [], network: [], ...extra,
  });
  const room = { floorAreaM2: 80, heightM: 3.5, wallAreaM2: 250, wallUValue: 0.5, airChangesPerHour: 40, ambientC: 20, listenerDistanceM: 1 };
  const sw = { inference: { engine: 'eng-sluice', model: 'mdl-tamarin-33-70b', quant: 'BF16', kvType: 'auto', contextLength: 8192, concurrency: 8, tp: 8, pp: 1 } };

  it('a socketed module needs a matching node', () => {
    const inTower = { ...exampleBuild, gpus: [{ part: 'gpu-bastion-x141' }] };
    expect(evalLinux(catalog, inTower, {}, smallClosedRoom).failures.some((f) => /socketed module/.test(f.message))).toBe(true);
    const wrongGen = evalLinux(catalog, node('gpu-citadel-c180'), sw, room);
    expect(wrongGen.failures.some((f) => /does not fit/.test(f.message))).toBe(true);
    const ok = evalLinux(catalog, node('gpu-bastion-x141'), sw, room);
    expect(ok.failures).toEqual([]);
  });

  it('node TP runs over the switch fabric, not PCIe', () => {
    const ok = evalLinux(catalog, node('gpu-bastion-x141'), sw, room);
    expect(groupLink(idx, ok._build, [0, 1, 2, 3, 4, 5, 6, 7]).type).toBe('nvswitch');
    const mi = evalLinux(catalog, { ...node('gpu-tessera-t192'), chassis: 'node-loom-t8', psu: 'psu-voltaic-m3000t' }, sw, room);
    expect(mi.failures).toEqual([]);
    expect(groupLink(idx, mi._build, [0, 1, 2, 3, 4, 5, 6, 7]).type).toBe('mesh');
  });

  it('PSU modules share the load and report redundancy; too few modules fail', () => {
    const ok = evalLinux(catalog, node('gpu-bastion-x141'), sw, room);
    expect(ok.power.psuModules).toBe(6);
    expect(ok.power.psuSpareModules).toBeGreaterThan(0);
    const one = evalLinux(catalog, node('gpu-bastion-x141', { psuCount: 1 }), sw, room);
    expect(one.failures.some((f) => f.code === 'power')).toBe(true);
  });

  it('a PDU caps wall power', () => {
    const r = evalLinux(catalog, node('gpu-bastion-x141', { pdu: 'pdu-conduit-17k' }), sw, room);
    expect(r.power.pduCapacityW).toBe(17200);
    expect(r.failures.filter((f) => f.code === 'power')).toEqual([]);
  });

  it('MLA models cache one latent per token per layer, not K and V per head', () => {
    const m = idx.models.get('mdl-deep-v32');
    expect(kvBytesTotal(m, 2, 1000, 1)).toBe(61 * 576 * 2 * 1000);
  });

  it('linear-attention layers keep a fixed state: KV grows only with the full layers', () => {
    const m = idx.models.get('mdl-quill-38-27b');
    const a = kvBytesTotal(m, 2, 10000, 1);
    const b = kvBytesTotal(m, 2, 20000, 1);
    expect(b - a).toBe(16 * 2 * 4 * 256 * 2 * 10000);
  });
});
