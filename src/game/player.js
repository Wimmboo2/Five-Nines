// Player progress, in memory only (saving is stage 8).
// Money and xp come from delivered jobs, scaled by the delivery score.

import { levelFor } from '../jobs/levels.js';

// Starting money 0: pending sign-off (docs/decisions.md). Parts are paid from
// the client's budget, so the player's money is only the fees earned.
export function newPlayer() {
  return { money: 0, xp: 0, level: 1, delivered: [] };
}

// Pure: returns the new player state and what changed.
export function applyDelivery(player, job, score) {
  const money = Math.round(job.payoutUSD * score.payoutMultiplier);
  const xp = Math.round(job.xp * score.xpMultiplier);
  const totalXp = player.xp + xp;
  const level = levelFor(totalXp);
  const next = {
    money: player.money + money, xp: totalXp, level,
    delivered: [...player.delivered, { jobId: job.id, client: job.client.name, score: score.score, money, xp }],
  };
  return { player: next, earned: { money, xp }, levelUp: level > player.level ? level : null };
}
