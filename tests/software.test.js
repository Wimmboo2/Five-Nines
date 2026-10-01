import { describe, it, expect } from 'vitest';
import { dev } from '../scripts/dev-data.js';
import { buildGameData, resolve } from '../src/data/build.js';
import { indexCatalog } from '../src/sim/util.js';
import { evaluateBuild } from '../src/sim/index.js';
import { minecraftLoad, SERVER_SOFTWARE } from '../src/sim/gameserver.js';
import { vmFleet, CPU_TYPES, DISK_FORMATS } from '../src/sim/vm.js';
import { OSES } from '../src/sim/evaluate.js';
import { generateJobs, evaluateForJob, xpForLevel, levelFor, GATES } from '../src/jobs/index.js';
import { exampleBuild, exampleSoftware, smallClosedRoom } from './fixtures/example-job.js';

const catalog = resolve(buildGameData(dev));
const idx = indexCatalog(catalog);
const distinct = (xs) => new Set(xs.map((x) => JSON.stringify(x))).size === xs.length;

describe('game server settings (stage 6)', () => {
  const base = { type: 'minecraft', players: 20 };
  it('every view distance value changes RAM', () => {
    const r = [3, 10, 32].map((d) => minecraftLoad(idx, exampleBuild, { ...base, viewDistance: d }).ramGB);
    expect(distinct(r)).toBe(true);
  });
  it('every simulation distance value changes tick time', () => {
    const r = [3, 10, 32].map((d) => minecraftLoad(idx, exampleBuild, { ...base, simulationDistance: d }).mspt);
    expect(distinct(r)).toBe(true);
  });
  it('every server software value changes tick time', () => {
    const r = SERVER_SOFTWARE.map((s) => minecraftLoad(idx, exampleBuild, { ...base, software: s }).mspt);
    expect(distinct(r)).toBe(true);
  });
  it('is deterministic and clamps to the published 3-32 range', () => {
    const a = minecraftLoad(idx, exampleBuild, { ...base, viewDistance: 12, simulationDistance: 6, software: 'optimized' });
    expect(minecraftLoad(idx, exampleBuild, { ...base, viewDistance: 12, simulationDistance: 6, software: 'optimized' })).toEqual(a);
    expect(minecraftLoad(idx, exampleBuild, { ...base, viewDistance: 99 }).viewDistance).toBe(32);
    expect(minecraftLoad(idx, exampleBuild, { ...base, simulationDistance: 1 }).simulationDistance).toBe(3);
  });
});

describe('VM fleet (stage 6)', () => {
  const host = { ...exampleBuild, cpu: 'cpu-vela-16', ram: [{ part: exampleBuild.ram[0].part, count: 4 }] };
  const ramGB = 256;
  const fleet = { count: 4, vcpus: 4, ramGB: 8, diskGB: 50, maxOvercommit: 4 };
  it('every CPU type value changes per-VM CPU', () => {
    const r = CPU_TYPES.map((t) => vmFleet(idx, host, { ...fleet, cpuType: t }, ramGB).cpuPerVm);
    expect(distinct(r)).toBe(true);
  });
  it('every disk format value changes per-VM IOPS', () => {
    const r = DISK_FORMATS.map((f) => vmFleet(idx, host, { ...fleet, diskFormat: f }, ramGB).iopsPerVm);
    expect(distinct(r)).toBe(true);
  });
  it('VM count, vCPUs, RAM and disk each change a result', () => {
    const f = (o) => vmFleet(idx, host, { ...fleet, ...o }, ramGB);
    expect(f({ count: 8 }).iopsPerVm).not.toBe(f({}).iopsPerVm);
    expect(f({ count: 2, vcpus: 8 }).cpuPerVm).not.toBe(f({ count: 2 }).cpuPerVm);
    expect(f({ ramGB: 16 }).ramNeedGB).not.toBe(f({}).ramNeedGB);
    expect(f({ diskGB: 100000 }).errors.length).toBeGreaterThan(0);
  });
  it('RAM cannot be overcommitted and the client overcommit limit holds', () => {
    expect(vmFleet(idx, host, { ...fleet, ramGB: 64 }, ramGB).errors.some((e) => /RAM/.test(e))).toBe(true);
    expect(vmFleet(idx, host, { ...fleet, count: 40, vcpus: 8, ramGB: 1, maxOvercommit: 2 }, 1e6).errors.some((e) => /limit/.test(e))).toBe(true);
  });
  it('overcommitting cores shrinks each VM\'s CPU share', () => {
    const one = vmFleet(idx, host, { ...fleet, count: 2 }, ramGB).cpuPerVm;
    const many = vmFleet(idx, host, { ...fleet, count: 12, ramGB: 1 }, ramGB).cpuPerVm;
    expect(many).toBeLessThan(one);
  });
  it('is deterministic', () => {
    expect(vmFleet(idx, host, fleet, ramGB)).toEqual(vmFleet(idx, host, fleet, ramGB));
  });
});

describe('operating system (stage 6)', () => {
  const fails = (sw) => evaluateBuild(catalog, exampleBuild, sw, smallClosedRoom, { idx }).failures.map((f) => f.message);
  it('is required once there is a workload', () => {
    expect(fails({ ...exampleSoftware, os: undefined }).some((m) => /operating system/.test(m))).toBe(true);
  });
  it('every OS value changes the result for some workload', () => {
    const vllm = { os: 'linux', inference: { ...exampleSoftware.inference, engine: 'eng-sluice', quant: 'AWQ', kvType: 'auto' } };
    const out = OSES.map((os) => fails({ ...vllm, os }).filter((m) => /Linux|hypervisor/.test(m)).join('|'));
    expect(out[0]).toBe('');
    expect(out[1]).toMatch(/Linux only/);
    expect(out[2]).toMatch(/hypervisor/);
  });
  it('VMs need the hypervisor OS', () => {
    const cloud = { count: 2, vcpus: 2, ramGB: 4, diskGB: 20 };
    expect(fails({ os: 'linux', cloud }).some((m) => /hypervisor OS/.test(m))).toBe(true);
    expect(fails({ os: 'proxmox', cloud }).some((m) => /hypervisor OS/.test(m))).toBe(false);
  });
});

describe('cloud jobs and level gates', () => {
  it('level 1 boards only have homelab inference / game-server jobs', () => {
    const jobs = generateJobs(catalog, { seed: 7, count: 12, level: 1 });
    for (const j of jobs) {
      expect(j.tier).toBe('homelab');
      expect(['inference', 'game-server']).toContain(j.type);
    }
  });
  it('level 3 opens mixed and cloud jobs but not the datacenter tier', () => {
    const jobs = generateJobs(catalog, { seed: 3, count: 30, level: 3 });
    expect(jobs.some((j) => j.type === 'cloud')).toBe(true);
    expect(jobs.every((j) => j.tier !== 'datacenter')).toBe(true);
  });
  it('a cloud job is solved by its reference setup, and under-sizing the VMs fails', () => {
    const job = generateJobs(catalog, { seed: 3, count: 30, level: 3 }).find((j) => j.type === 'cloud');
    const ok = evaluateForJob(catalog, job, job.reference.build, job.reference.software, { idx });
    expect(ok.failures).toEqual([]);
    const small = { ...job.reference.software, cloud: { ...job.reference.software.cloud, ramGB: job.workload.cloud.ramGB - 1 } };
    expect(evaluateForJob(catalog, job, job.reference.build, small, { idx }).failures.length).toBeGreaterThan(0);
  });
  it('xp curve: 250 x (n-1)^2', () => {
    expect([2, 3, 4, 5].map(xpForLevel)).toEqual([250, 1000, 2250, 4000]);
    expect([0, 249, 250, 999, 1000, 4000].map(levelFor)).toEqual([1, 1, 2, 2, 3, 5]);
    expect(GATES.personalDatacenter).toBe(5);
  });
});
