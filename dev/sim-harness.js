// Dev-only page: runs the simulation in the browser on the example job fixture
// and times it. Uses the shipped game data (fake names only).
import { catalog } from '../src/data/index.js';
import { evaluateBuild, runStressTest, indexCatalog } from '../src/sim/index.js';
import { exampleJobSpec, smallClosedRoom, exampleBuild, exampleSoftware } from '../tests/fixtures/example-job.js';

const idx = indexCatalog(catalog);
const out = document.getElementById('out');

// Warm up, then time repeated full evaluations (what a settings change costs).
for (let i = 0; i < 5; i++) evaluateBuild(catalog, exampleBuild, exampleSoftware, smallClosedRoom, { idx });
const N = 200;
const t0 = performance.now();
let r;
for (let i = 0; i < N; i++) r = evaluateBuild(catalog, exampleBuild, exampleSoftware, smallClosedRoom, { idx });
const evalMs = (performance.now() - t0) / N;

const s0 = performance.now();
const stress = runStressTest(r, smallClosedRoom, { seed: 7 });
const stressMs = performance.now() - s0;

const t = exampleJobSpec.targets;
const full = r.inference.decodeCurve.find((d) => d.depth === t.contextTokens);
const checks = [
  ['fits in memory', r.failures.every((f) => f.code !== 'memory')],
  [`decode at ${t.contextTokens.toLocaleString()} tokens >= ${t.decodeTokS} tok/s`, full && full.perSequence >= t.decodeTokS],
  [`wall power < ${t.maxWallW} W`, r.power.wallW < t.maxWallW],
  ['no thermal failure', r.failures.every((f) => f.code !== 'thermal')],
  ['stress hour completes', stress.completed],
];

const results = {
  evalMsPerCall: +evalMs.toFixed(3),
  stressHourMs: +stressMs.toFixed(1),
  failures: r.failures,
  warnings: r.warnings,
  decodeCurve: r.inference.decodeCurve.map((d) => ({ depth: d.depth, tokS: +d.perSequence.toFixed(1) })),
  ttftS_4096: +r.inference.ttftS.toFixed(2),
  fullContextPrefillS: +r.inference.fullContextPrefillS.toFixed(1),
  wallW: +r.power.wallW.toFixed(0),
  roomSteadyC: +r.thermal.roomC.toFixed(1),
  gpuC: r.thermal.gpus.map((g) => +g.tempC.toFixed(1)),
  noiseAtListenerDBA: +r.noise.atListenerDBA.toFixed(1),
  minecraft: r.gameServers.map((g) => ({ players: g.players, mspt: +g.mspt.toFixed(1), tps: +g.tps.toFixed(1) })),
  stress: { completed: stress.completed, roomStartC: stress.samples[0].roomC, roomEndC: +stress.samples.at(-1).roomC.toFixed(2) },
  gpuName: idx.parts.get(exampleBuild.gpus[0].part).displayName,
};
window.__harness = { results, checks };
out.innerHTML = '<h2>Checks against the hand-written example job targets</h2>' +
  checks.map(([name, ok]) => `<div class="${ok ? 'ok' : 'bad'}">${ok ? 'PASS' : 'FAIL'}: ${name}</div>`).join('') +
  `<p>Noise target "${t.noise}" and room target "${t.room}" are qualitative; scoring them is stage 4.</p>` +
  `<pre>${JSON.stringify(results, null, 2)}</pre>`;
