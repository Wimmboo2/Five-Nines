// Temperatures.
//
// Room: one well-mixed air volume plus the thermal mass of its walls.
//   heat in  = wall power of the build
//   heat out = G x (T_room - T_ambient), where G = U x A_walls + (air changes) x m_air x c_p
//   steady state: T_room = T_ambient + P / G  (the brief's dT = P / (m_dot c_p) is the
//   ventilation-only case of this, with U x A = 0)
//   over time:   C dT/dt = P - G (T - T_ambient)
// Case: air pushed by the fans picks up the heat released inside:
//   T_case = T_room + P_case / (rho x Q x c_p)
// Parts: T_part = T_inlet + P_part x R_part, where R depends on the cooler and
// on fan speed (convective resistance ~ airflow^-0.8).
// If a part would pass its max temperature it throttles: power is cut until it
// fits, and speed drops with it.

import { clamp, interp } from './util.js';
import { allFans } from './power.js';

export function airDensity(idx, tempC) {
  const pts = idx.constants.air.densityByTempC.map((p) => [p.tempC, p.kgPerM3]);
  return interp(pts, tempC);
}

export function roomProps(idx, room) {
  const cp = idx.constants.air.cpJPerKgK;
  const volume = room.floorAreaM2 * room.heightM;
  const rho = airDensity(idx, room.ambientC);
  const massAir = rho * volume;
  const conductance = room.wallUValue * room.wallAreaM2 + (room.airChangesPerHour / 3600) * massAir * cp;
  const capacity = massAir * cp + room.wallAreaM2 * idx.constants.thermal.wallHeatCapacityJPerM2K;
  return { volume, conductance, capacity, cp };
}

export function roomSteadyC(idx, room, wallW) {
  const { conductance } = roomProps(idx, room);
  return room.ambientC + wallW / conductance;
}

// Exact exponential step (stable for any dt).
export function roomStep(idx, room, tempC, wallW, dtS) {
  const { conductance, capacity } = roomProps(idx, room);
  const target = room.ambientC + wallW / conductance;
  const k = conductance / capacity;
  return target + (tempC - target) * Math.exp(-k * dtS);
}

export function roomTimeConstantS(idx, room) {
  const { conductance, capacity } = roomProps(idx, room);
  return capacity / conductance;
}

// Total case airflow (m3/s) at case-fan speed s.
export function caseAirflow(idx, build, s) {
  const t = idx.constants.thermal;
  let cfm = 0;
  for (const f of allFans(idx, build)) cfm += f.count * f.part.maxAirflowCFM * f.areaScale * s;
  const ch = build.chassis ? idx.parts.get(build.chassis) : null;
  const restriction = !ch ? 1 : ch.formFactor === 'rack' ? t.airflowRestriction.rack
    : ch.soundDamping ? t.airflowRestriction.damped : t.airflowRestriction.open;
  cfm = cfm * restriction + t.naturalConvectionCFM;
  return { cfm, m3s: cfm * idx.constants.air.cfmToM3s };
}

// Solve part temperatures for given power draws and fan speeds.
//   loads: { gpuW: [], cpuW, otherInsideW }
//   s: case fan speed fraction; cpuFanMode: 'quiet' | 'max'
export function solveTemps(idx, build, roomC, loads, s, cpuFanMode) {
  const t = idx.constants.thermal;
  const cp = idx.constants.air.cpJPerKgK;
  const flow = caseAirflow(idx, build, s);
  const rho = airDensity(idx, roomC);
  const gpus = build.gpus.map((g) => idx.parts.get(g.part));
  // Blower cards push their heat out the back of the case.
  const insideGpuW = loads.gpuW.reduce((a, w, i) => a + (gpus[i].cooling === 'blower' ? 0 : w), 0);
  const heatInside = insideGpuW + loads.cpuW + loads.otherInsideW;
  const caseRise = build.chassis ? heatInside / (rho * flow.m3s * cp) : 0;
  const inletC = roomC + caseRise;

  const passiveCount = gpus.filter((p) => p.cooling === 'passive').length;
  const gpuTemps = gpus.map((part, i) => {
    let R = t.gpuHeatsinkResistanceCW[part.cooling];
    let fan = 1;
    if (part.cooling === 'passive') {
      const perCard = flow.cfm / Math.max(1, passiveCount);
      R *= (t.passiveMinAirflowCFM / Math.max(1e-3, perCard)) ** t.convectionExponent;
      fan = null;
    } else {
      // The card's own fans speed up only as much as needed to stay under target.
      const target = part.maxTempC - t.targetMarginC;
      fan = t.gpuFanMinFraction;
      while (fan < 1 && inletC + loads.gpuW[i] * R * fan ** -t.convectionExponent > target) fan = Math.min(1, fan + 0.05);
      R *= fan ** -t.convectionExponent;
    }
    return { tempC: inletC + loads.gpuW[i] * R, resistance: R, fanSpeed: fan, maxC: part.maxTempC };
  });

  let cpu = null;
  if (build.cpu && build.cooler) {
    const part = idx.parts.get(build.cpu);
    const cooler = idx.parts.get(build.cooler);
    const R = cpuFanMode === 'quiet' ? cooler.thermalResistanceQuietCW : cooler.thermalResistanceCW;
    cpu = { tempC: inletC + loads.cpuW * R, resistance: R, maxC: part.tjMaxC, fanMode: cpuFanMode };
  }
  return { inletC, caseRiseC: caseRise, airflowCFM: flow.cfm, gpuTemps, cpu };
}

// Speed multiplier for a given power scale. From one measurement: an RTX 3090
// capped from 390 W to 250 W kept 91% of its decode speed (llama.cpp scoreboard
// reply), i.e. speed ~ power^0.207. Estimate; see constants.
export function perfForPower(idx, powerScale) {
  return powerScale ** idx.constants.thermal.throttlePerfExponent;
}
