// The whole saveable game state, and how a stress run is stored and rebuilt.
// Saved form keeps ids and plain numbers only (src/save/save.js).

import { generateJobs, evaluateForJob } from '../jobs/index.js';
import { newPlayer } from './player.js';
import { emptyBuild, simBuild } from '../ui/buildState.js';
import { emptySoftware, simSoftware } from '../ui/softwareState.js';
import { startStressTest } from './flow.js';

export function rollBoard(catalog, seed, level) {
  return generateJobs(catalog, { seed, count: 6, level });
}

export function newGame(catalog) {
  return {
    tab: 'jobs', boardSeed: 1, jobs: rollBoard(catalog, 1, 1), activeJobId: null,
    build: emptyBuild(), software: emptySoftware(), player: newPlayer(),
    shop: { cat: 'all', tier: 'all' },
    run: null, attempt: 0, broken: null, result: null, playedS: 0,
    datacenter: null, dcCarryH: 0,
  };
}

// In memory a run holds the full result; the save keeps only what rebuilds it.
export function toSaveData(game) {
  const { run, ...rest } = game;
  return { ...rest, run: run ? { seed: run.seed, attempt: run.attempt, key: run.key, positionS: run.positionS ?? 0 } : null };
}

// Rebuilds a saved stress run. The sim is deterministic per seed, so this
// gives exactly the run that was interrupted; it is dropped if the build or
// software no longer match what was tested.
export function restoreRun(catalog, idx, game) {
  const saved = game.run;
  const job = game.jobs.find((j) => j.id === game.activeJobId);
  if (!saved || !job) return null;
  const b = simBuild(game.build);
  const sw = simSoftware(game.software);
  const ev = evaluateForJob(catalog, job, b, sw, { idx });
  const run = startStressTest(ev, job, b, sw, saved.attempt);
  if (run.seed !== saved.seed || run.key !== saved.key) return null;
  return { ...run, positionS: saved.positionS };
}
