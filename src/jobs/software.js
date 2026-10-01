// Reference software setup the job generator uses to prove a job is solvable.
// Generator-only: the player configures their own software in the config apps.
// llama.cpp with Q4_K_M-class weights on PCIe builds, vLLM with tensor parallel
// across a node's GPUs, game servers at the client's requested distances,
// VMs with CPU type host and raw disks.

import { nodeOf } from '../sim/util.js';

const GGUF_PREF = ['Q4_K_M', 'Q4_0', 'Q5_K_M', 'Q6_K', 'Q8_0', 'MXFP4', 'BF16', 'F16'];
const HF_PREF = ['FP8', 'MXFP4', 'BF16', 'AWQ'];

function largestTp(n, kvHeads) {
  for (let tp = n; tp >= 1; tp--) if (n % tp === 0 && (kvHeads % tp === 0 || tp % kvHeads === 0)) return tp;
  return 1;
}

export function referenceSoftware(idx, workload, build) {
  const sw = { os: workload.cloud ? 'proxmox' : 'linux' };
  if (workload.inference && build.gpus.length > 0) {
    const w = workload.inference;
    const model = idx.models.get(w.model);
    const n = build.gpus.length;
    if (nodeOf(idx, build)) {
      const quant = HF_PREF.find((q) => model.weights[q]) ?? 'BF16';
      const tp = largestTp(n, model.kvHeads);
      sw.inference = { engine: 'eng-sluice', model: w.model, quant, kvType: 'auto', contextLength: w.contextLength,
        concurrency: w.concurrency, tp, pp: n / tp };
    } else {
      const quant = GGUF_PREF.find((q) => model.weights[q]);
      sw.inference = { engine: 'eng-kettle', model: w.model, quant, kvType: 'q8_0', contextLength: w.contextLength,
        concurrency: w.concurrency, splitMode: n > 1 ? 'layer' : 'none', gpuLayers: 'all' };
    }
  }
  if (workload.gameServer) {
    const g = workload.gameServer;
    sw.gameServers = [{ type: 'minecraft', players: g.players, viewDistance: g.viewDistance, simulationDistance: g.simulationDistance, software: 'vanilla' }];
  }
  if (workload.cloud) sw.cloud = { ...workload.cloud, cpuType: 'host', diskFormat: 'raw' };
  return sw;
}
