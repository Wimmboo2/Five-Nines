// Reference builds the generator tries when it rolls a job. They are built
// from whatever the catalog holds for each tier, so job sizes follow the
// catalog: add a bigger GPU or node and bigger jobs become solvable.
//
// The generator evaluates these cheapest-first and keeps the first one that
// runs the job's workload; that build proves the job is solvable within its
// budget and sets the targets.

import { buildCost } from './cost.js';

const byTier = (list, ...tiers) => list.filter((p) => tiers.includes(p.tier));

function psuFor(catalog, watts) {
  const atx = catalog.parts.psu.filter((p) => p.formFactor !== 'module').sort((a, b) => a.ratedW - b.ratedW);
  return (atx.find((p) => p.ratedW >= watts) ?? atx[atx.length - 1]).id;
}

function roughDcW(idx, gpus, cpu, cpuCount = 1) {
  return gpus.reduce((a, g) => a + idx.parts.get(g).boardPowerW, 0) + cpuCount * idx.parts.get(cpu).tdpW + 100;
}

function homelab(catalog, idx, needGpu, cloud) {
  const out = [];
  const gpus = byTier(catalog.parts.gpu, 'consumer');
  const gpuSets = needGpu ? gpus.flatMap((g) => [[g.id], [g.id, g.id]]) : [[]];
  const cpus = byTier(catalog.parts.cpu, 'consumer');
  const rams = catalog.parts.ram.filter((r) => r.tier === 'consumer');
  // VM hosts need more RAM than one module: try 2 and 4 modules too.
  const ramCounts = cloud ? [1, 2, 4] : [1];
  for (const gs of gpuSets) for (const cpu of cpus) for (const ram of rams) for (const rc of ramCounts) {
    out.push({
      chassis: 'chs-hollow-quiet-xl', cpu: cpu.id, cooler: 'clr-frostline-d2',
      gpus: gs.map((part) => ({ part })), ram: [{ part: ram.id, count: rc }],
      storage: [{ part: 'sto-strata-nova-2', count: 1 }],
      psu: psuFor(catalog, 1.25 * roughDcW(idx, gs, cpu.id)), fans: [], network: [],
    });
  }
  return out;
}

function server(catalog, idx, needGpu) {
  const out = [];
  const pcie = catalog.parts.gpu.filter((g) => g.formFactor === 'pcie' && (g.tier !== 'consumer' || g.vramGB >= 24));
  const gpuSets = needGpu ? pcie.flatMap((g) => [1, 2, 4].map((n) => Array(n).fill(g.id))) : [[]];
  const cpus = catalog.parts.cpu.filter((c) => c.tier !== 'consumer' && c.memType === 'DDR5');
  for (const gs of gpuSets) for (const cpu of cpus) {
    const ram = catalog.parts.ram.find((r) => r.id === 'ram-rack-32-d5-5600');
    out.push({
      chassis: 'chs-hollow-r4', cpu: cpu.id, cooler: 'clr-frostline-d2',
      gpus: gs.map((part) => ({ part })), ram: [{ part: ram.id, count: cpu.memChannels }],
      storage: [{ part: 'sto-strata-vault-3t8', count: 1 }],
      psu: psuFor(catalog, 1.25 * roughDcW(idx, gs, cpu.id)), fans: [{ part: 'fan-sirocco-12m', count: 7 }], network: [],
    });
  }
  return out;
}

function datacenter(catalog) {
  const out = [];
  const nodes = catalog.parts.chassis.filter((c) => c.formFactor === 'gpu-node');
  for (const node of nodes) {
    const gpus = catalog.parts.gpu.filter((g) => g.formFactor === node.gpuSocket);
    for (const g of gpus) {
      out.push({
        chassis: node.id, cpu: 'cpu-keystone-64-g5', cpuCount: 2,
        gpus: Array.from({ length: node.gpuBays }, () => ({ part: g.id })),
        ram: [{ part: 'ram-rack-32-d5-5600', count: 24 }],
        storage: [{ part: 'sto-strata-vault-3t8', count: 2 }],
        psu: node.acceptsPsu[0], psuCount: node.psuBays, fans: [], network: [], pdu: 'pdu-conduit-22k',
      });
    }
  }
  return out;
}

// Candidate reference builds for a tier, cheapest first.
export function referenceCandidates(catalog, idx, tier, needGpu, cloud = false) {
  const list = tier === 'homelab' ? homelab(catalog, idx, needGpu, cloud)
    : tier === 'server' ? server(catalog, idx, needGpu) : datacenter(catalog);
  return list.map((build) => ({ build, costUSD: buildCost(idx, build) })).sort((a, b) => a.costUSD - b.costUSD);
}
