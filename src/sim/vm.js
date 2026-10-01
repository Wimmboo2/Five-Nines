// Cloud/VM hosting on a KVM hypervisor (Proxmox VE). Pure and deterministic.
//
// The client asks for a fleet: `count` VMs, each with `vcpus`, `ramGB` and
// `diskGB`. The player sets the hypervisor's VM settings that have data:
//   cpuType:    'host' | 'x86-64-v2-AES' (Proxmox default)
//   diskFormat: 'raw' | 'qcow2'
// Results (all VMs busy at once, as in the stress test):
//   cpuPerVm  : reference cores per VM = vcpus x core speed / reference speed
//               x KVM CPU factor x min(1, physical cores / total vCPUs)
//   iopsPerVm : sum of drives' random-read IOPS x KVM IOPS factor x format
//               factor / count
// Hard limits: guest RAM + host reserve must fit installed RAM (no
// overcommit), total vCPUs / host threads must not exceed the client's ratio,
// guest disks must fit the drives.

import { singleThreadIndex } from './gameserver.js';
import { cpuCount } from './util.js';

export const CPU_TYPES = ['host', 'x86-64-v2-AES'];
export const DISK_FORMATS = ['raw', 'qcow2'];

export function vmSettings(cloud) {
  return {
    cpuType: CPU_TYPES.includes(cloud.cpuType) ? cloud.cpuType : 'x86-64-v2-AES',
    diskFormat: DISK_FORMATS.includes(cloud.diskFormat) ? cloud.diskFormat : 'raw',
  };
}

export function vmFleet(idx, build, cloud, installedRamGB) {
  const v = idx.constants.virt;
  const mc = idx.constants.minecraft;
  const cpu = build.cpu ? idx.parts.get(build.cpu) : null;
  const n = cpuCount(build);
  const cores = cpu ? cpu.cores * n : 0;
  const threads = cpu ? cpu.threads * n : 0;
  const s = vmSettings(cloud);
  const count = Math.max(0, Math.round(cloud.count ?? 0));
  const vcpus = Math.max(1, Math.round(cloud.vcpus ?? 1));
  const totalVcpus = count * vcpus;
  const errors = [];

  const ramNeedGB = count * (cloud.ramGB ?? 0) + v.hostReserveGB;
  if (ramNeedGB > installedRamGB) errors.push(`The VMs need ${ramNeedGB.toFixed(0)} GB of RAM (guests plus ${v.hostReserveGB} GB for the hypervisor); ${installedRamGB.toFixed(0)} GB installed. VM memory can't be overcommitted here.`);
  const ratio = threads > 0 ? totalVcpus / threads : Infinity;
  if (cloud.maxOvercommit != null && ratio > cloud.maxOvercommit + 1e-9) errors.push(`${totalVcpus} vCPUs on ${threads} host threads is ${ratio.toFixed(2)}:1, over the client's ${cloud.maxOvercommit}:1 limit.`);
  const diskTB = (build.storage ?? []).reduce((a, st) => a + idx.parts.get(st.part).capacityTB * (st.count ?? 1), 0);
  const diskNeedTB = count * (cloud.diskGB ?? 0) / 1000;
  if (diskNeedTB > diskTB) errors.push(`The VM disks need ${diskNeedTB.toFixed(2)} TB; the drives hold ${diskTB.toFixed(2)} TB.`);

  const speed = cpu ? singleThreadIndex(cpu) / mc.refSingleThreadIndex : 0;
  const kvm = s.cpuType === 'host' ? v.cpuFactorTuned : v.cpuFactorUntuned;
  const share = totalVcpus > 0 ? Math.min(1, (cores * v.vcpuPerCore) / totalVcpus) : 1;
  const cpuPerVm = vcpus * speed * kvm * share;
  const rawIops = (build.storage ?? []).reduce((a, st) => a + (idx.parts.get(st.part).randReadIopsHighQD ?? 0) * (st.count ?? 1), 0);
  const fmt = s.diskFormat === 'qcow2' ? v.qcow2IopsFactor : 1;
  const iopsPerVm = count > 0 ? rawIops * v.iopsFactor * fmt / count : 0;

  return {
    ...s, count, vcpus, ramGB: cloud.ramGB ?? 0, diskGB: cloud.diskGB ?? 0,
    totalVcpus, hostThreads: threads, hostCores: cores, overcommit: ratio,
    ramNeedGB, cpuPerVm, iopsPerVm, errors,
    // Busy host CPU share for power: every vCPU busy, capped at the host.
    cpuLoad: threads > 0 ? Math.min(1, totalVcpus / threads) : 0,
  };
}
