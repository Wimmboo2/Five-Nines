// The stress test: one simulated hour of sustained load, stepped in time.
// The room heats up (exact exponential step of the lumped room model), fans
// and throttling respond at each step, and every part rolls for failure with
// a seeded RNG. The run stops at the first failure and says why.

import { makeRng } from './util.js';
import { operatingPoint } from './evaluate.js';
import { roomStep } from './thermal.js';
import { failureRates, failProbability } from './durability.js';
import { makeContext, decodeRate } from './inference.js';
import { noiseAtListener } from './noise.js';
import { allFans } from './power.js';

// evaluation: the object returned by evaluateBuild (holds the context it used).
export function runStressTest(evaluation, room, opts = {}) {
  const idx = evaluation._idx;
  const build = evaluation._build;
  const work = evaluation._work;
  const durationS = opts.durationS ?? 3600;
  const dtS = opts.dtS ?? 10;
  const sampleEveryS = opts.sampleEveryS ?? 60;
  const rng = makeRng(opts.seed ?? 1);
  const fans = allFans(idx, build);

  if (evaluation.failures.length) {
    return { completed: false, failedAtS: 0, failure: evaluation.failures[0], samples: [] };
  }

  let roomC = room.ambientC;
  const samples = [];
  for (let t = 0; t <= durationS; t += dtS) {
    const op = operatingPoint(idx, build, room, roomC, work);
    let tokS = null;
    if (evaluation._inference) {
      const inf = evaluation._inference;
      const c = makeContext(idx, build, inf.ctx.inf, inf.layout, evaluation._memory, { perfScale: op.perfScale });
      tokS = decodeRate(c, inf.concurrency, inf.workDepth).perSequence;
    }
    if (t % sampleEveryS === 0) {
      const noise = noiseAtListener(idx, build, room, { caseFanSpeed: op.caseFanSpeed, gpuTemps: op.temps.gpuTemps, cpu: op.temps.cpu });
      samples.push({
        t, roomC, wallW: op.power.wallW, caseInletC: op.temps.inletC,
        gpuC: op.temps.gpuTemps.map((g) => g.tempC), cpuC: op.temps.cpu?.tempC ?? null,
        caseFanSpeed: op.caseFanSpeed, noiseDBA: noise.atListener, tokS,
        throttle: op.gpuPowerScale.slice(),
      });
    }
    if (op.thermalFailure) {
      return { completed: false, failedAtS: t, failure: { code: 'thermal', message: `Thermal shutdown at ${fmtTime(t)}: parts could not stay under their max temperature (room ${roomC.toFixed(1)} C).` }, samples };
    }
    if (op.power.psu && op.power.dcW > op.power.psu.ratedW) {
      return { completed: false, failedAtS: t, failure: { code: 'power', message: `Power supply overloaded at ${fmtTime(t)}.` }, samples };
    }
    // Failure rolls
    const rates = failureRates(idx, build, {
      gpuTemps: op.temps.gpuTemps, gpuLoad: work.gpuActive.map((a) => (a ? 1 : 0)),
      cpuTempC: op.temps.cpu?.tempC ?? roomC, driveTempC: op.temps.inletC + idx.constants.thermal.driveRiseC,
      roomC, psuLoadPct: op.power.loadPct, inletC: op.temps.inletC, fans,
    });
    for (const r of rates) {
      const forced = opts.forceFailure && opts.forceFailure.key === r.key && t >= opts.forceFailure.atS;
      if (forced || rng() < failProbability(r.afr, dtS)) {
        return { completed: false, failedAtS: t, failure: { code: 'part-failure', part: r.key, message: `${r.label} failed at ${fmtTime(t)}. Replace it and run the whole test again.` }, samples };
      }
    }
    roomC = roomStep(idx, room, roomC, op.power.wallW, dtS);
  }
  return { completed: true, failedAtS: null, failure: null, samples };
}

function fmtTime(s) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
