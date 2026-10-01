// Difficulty (stage 10): the one place every difficulty lever is read from.
// Values are the user-approved table in constants.difficulty.

export const DIFFICULTIES = ['easy', 'normal', 'hard'];

export function difficulty(idx, name) {
  const t = idx.constants.difficulty;
  return t[DIFFICULTIES.includes(name) ? name : 'normal'];
}

// Scales the slack of a job range around its reference build (1 = the
// reference itself). Multipliers below 1 move toward 1 from below, above 1
// from above; additive margins (dB, C) scale directly.
export const slackBelow = ([lo, hi], s) => [1 - (1 - lo) * s, 1 - (1 - hi) * s];
export const slackAbove = ([lo, hi], s) => [1 + (lo - 1) * s, 1 + (hi - 1) * s];
export const slackAdd = ([lo, hi], s) => [lo * s, hi * s];
