// Minecraft (Java) server load.
//
// The server ticks 20 times a second, so each tick has a 50 ms budget. The main
// thread is single-threaded, so tick time scales with one core's speed.
//   MSPT = (base + per_player x players) x (reference single-thread / this CPU's)
//   TPS  = min(20, 1000 / MSPT)
// No published data ties MSPT to player count and CPU speed; the base and
// per-player costs are estimates (flagged as the weakest part of the sim).
// Stage 6 settings (server.properties + server software):
//   simulation-distance r_s: per-player tick cost x ((2 r_s + 1) / 21)^2
//   view-distance r_v:       per-player RAM x ((2 r_v + 1) / 21)^2
//   optimized fork:          tick cost x optimizedForkTickFactor
// (21 = 2 x default distance 10 + 1). All three scalings are estimates.

export function singleThreadIndex(cpu) {
  return cpu.boostClockGHz * cpu.ipcFactor;
}

export function minecraftLoad(idx, build, server, cpuShare = 1) {
  const mc = idx.constants.minecraft;
  const cpu = idx.parts.get(build.cpu);
  const sti = singleThreadIndex(cpu) * cpuShare;
  const s = serverSettings(idx, server);
  const area = (r) => ((2 * r + 1) / (2 * mc.defaultDistance + 1)) ** 2;
  const simArea = area(s.simulationDistance) ** mc.tickScalesWithSimArea;
  const viewArea = area(s.viewDistance) ** mc.ramScalesWithViewArea;
  const fork = s.software === 'optimized' ? mc.optimizedForkTickFactor : 1;
  const mspt = (mc.msptBaseRef + mc.msptPerPlayerRef * server.players * simArea) * fork * (mc.refSingleThreadIndex / sti);
  const tps = Math.min(mc.ticksPerSecond, 1000 / mspt);
  const ramGB = mc.ramGBBase + mc.ramGBPerPlayer * server.players * viewArea;
  return {
    players: server.players, ...s, mspt, tps, ramGB,
    lagging: mspt > mc.tickBudgetMs,
    // Fraction of one core the main thread keeps busy.
    coreBusy: Math.min(1, mspt / mc.tickBudgetMs),
  };
}

export const SERVER_SOFTWARE = ['vanilla', 'optimized'];

// Settings with the published defaults filled in and range-checked.
export function serverSettings(idx, server) {
  const mc = idx.constants.minecraft;
  const clamp = (v) => Math.max(mc.minDistance, Math.min(mc.maxDistance, Math.round(v ?? mc.defaultDistance)));
  return {
    viewDistance: clamp(server.viewDistance),
    simulationDistance: clamp(server.simulationDistance),
    software: SERVER_SOFTWARE.includes(server.software) ? server.software : 'vanilla',
  };
}
