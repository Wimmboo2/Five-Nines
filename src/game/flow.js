// Stress test -> delivery rules (locked decision: if anything fails partway, the
// player fixes it and the whole test starts over).

import { runStressTest } from '../sim/stress.js';

// A test result only counts for the exact build + software it ran on.
export function configKey(build, software) {
  return JSON.stringify({ build, software });
}

// Runs one full simulated hour from t = 0. Each attempt uses a new seed, so a
// random part failure is a fresh roll on the redo.
export function startStressTest(evaluation, job, build, software, attempt) {
  const seed = job.seed * 1000 + attempt;
  const result = runStressTest(evaluation, job.room, { seed, difficulty: job.difficulty });
  return { key: configKey(build, software), attempt, seed, result };
}

export function canDeliver(run, build, software) {
  return !!run && run.result.completed && run.key === configKey(build, software);
}
