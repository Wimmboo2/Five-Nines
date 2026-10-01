// Time played. Counts only while the tab is open; each tick adds at most
// MAX_TICK_S, so a suspended laptop or a throttled background tab never
// catches up on time away (locked decision: no catch-up).
export const MAX_TICK_S = 2;

export function advance(playedS, lastMs, nowMs) {
  const d = Math.max(0, (nowMs - lastMs) / 1000);
  return playedS + Math.min(d, MAX_TICK_S);
}

export function fmtPlayed(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h} h ${m} min` : `${m} min`;
}
