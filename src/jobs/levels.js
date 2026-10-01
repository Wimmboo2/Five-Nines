// Levels and feature gates (user decision 2026-09-30, stage 6-7 round).
// XP to reach level n = 250 x (n - 1)^2. No part is ever gated.

export const LEVEL_XP_STEP = 250;
export const xpForLevel = (n) => LEVEL_XP_STEP * (n - 1) ** 2;
export function levelFor(xp) {
  let n = 1;
  while (xpForLevel(n + 1) <= xp) n++;
  return n;
}

// Level at which each job tier / job type unlocks. The personal datacenter
// (stage 9) unlocks at 5.
export const GATES = {
  tier: { homelab: 1, server: 2, datacenter: 4 },
  type: { inference: 1, 'game-server': 1, mixed: 3, cloud: 3 },
  personalDatacenter: 5,
};

export const tierOpen = (tier, level) => level >= GATES.tier[tier];
export const typeOpen = (type, level) => level >= GATES.type[type];
