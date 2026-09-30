// Minecraft (Java) server load.
//
// The server ticks 20 times a second, so each tick has a 50 ms budget. The main
// thread is single-threaded, so tick time scales with one core's speed.
//   MSPT = (base + per_player x players) x (reference single-thread / this CPU's)
//   TPS  = min(20, 1000 / MSPT)
// No published data ties MSPT to player count and CPU speed; the base and
// per-player costs are estimates (flagged as the weakest part of the sim).
// Storage latency, view distance and entity counts are not modeled yet: they
// wait on the checkpoint question about game-server settings.

export function singleThreadIndex(cpu) {
  return cpu.boostClockGHz * cpu.ipcFactor;
}

export function minecraftLoad(idx, build, server, cpuShare = 1) {
  const mc = idx.constants.minecraft;
  const cpu = idx.parts.get(build.cpu);
  const sti = singleThreadIndex(cpu) * cpuShare;
  const mspt = (mc.msptBaseRef + mc.msptPerPlayerRef * server.players) * (mc.refSingleThreadIndex / sti);
  const tps = Math.min(mc.ticksPerSecond, 1000 / mspt);
  const ramGB = mc.ramGBBase + mc.ramGBPerPlayer * server.players;
  return {
    players: server.players, mspt, tps, ramGB,
    lagging: mspt > mc.tickBudgetMs,
    // Fraction of one core the main thread keeps busy.
    coreBusy: Math.min(1, mspt / mc.tickBudgetMs),
  };
}
