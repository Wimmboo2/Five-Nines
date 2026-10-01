// Prints every estimate-tagged value in data-dev as a markdown table (for sign-off).
import { dev } from './dev-data.js';
import { isTaggedLike } from '../src/data/validate.js';

const rows = [];
const walk = (node, path) => {
  if (node === null || typeof node !== 'object') return;
  if (isTaggedLike(node)) {
    if (node.tag === 'estimate' && !/Fitted by|No vLLM data|No SGLang benchmark/.test(node.reasoning)) {
      rows.push([path, JSON.stringify(node.value).slice(0, 40) + (node.unit ? ' ' + node.unit : ''), node.reasoning.replace(/\|/g, '/')]);
    }
    return;
  }
  if (Array.isArray(node)) return node.forEach((x, i) => walk(x, `${path}[${node[i]?.id ?? i}]`));
  for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k);
};
const trees = { gpus: dev.gpus, cpus: dev.cpus, rams: dev.rams, storages: dev.storages, psus: dev.psus, fans: dev.fans, coolers: dev.coolers,
  networks: dev.networks, chassis: dev.chassis, models: dev.models, engines: dev.engines, constants: dev.constants };
for (const [n, t] of Object.entries(trees)) walk(t, n);
const fitted = [];
for (const [eng, p] of Object.entries(dev.engines.reduce((a, e) => ({ ...a, [e.id]: e.perf }), {}))) {
  for (const [k, v] of Object.entries(p)) fitted.push(`${eng}.${k} = ${v.value}`);
}
console.log(`| Where | Value | Reasoning |\n| --- | --- | --- |`);
for (const r of rows) console.log(`| ${r[0]} | ${r[1]} | ${r[2]} |`);
console.log(`\n${rows.length} hand estimates. Plus ${fitted.length} fitted engine constants (see data-dev/fitted-perf.js and docs/calibration.md).`);
