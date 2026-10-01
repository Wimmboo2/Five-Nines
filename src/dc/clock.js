// Datacenter time (stage 9). Runs only while the tab is visible: a hidden tab
// counts as closed (user decision), and nothing is caught up afterwards.
// Real seconds become simulated hours (constants.datacenter.simHoursPerRealSecond);
// the simulation steps in whole hours, the remainder carries over.

import { MAX_TICK_S } from '../save/clock.js';

export function dcAdvance(carryH, lastMs, nowMs, visible, hoursPerSecond) {
  if (!visible) return { steps: 0, carryH };
  const realS = Math.min(Math.max(0, (nowMs - lastMs) / 1000), MAX_TICK_S);
  const total = carryH + realS * hoursPerSecond;
  const steps = Math.floor(total);
  return { steps, carryH: total - steps };
}
