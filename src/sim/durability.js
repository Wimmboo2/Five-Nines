// Failure rates per part, adjusted for temperature, and the chance of failing
// within a time step. The stress test and (later) the datacenter roll against it.
//
//   electronics : Arrhenius, AF = exp[(Ea/k)(1/T_ref - 1/T)], Ea = 0.7 eV
//   fans        : life halves every +10 C above 40 C (fan maker's own model)
//   drives      : field AFR where published, else datasheet MTBF

export function arrhenius(idx, tempC, refC) {
  const r = idx.constants.reliability;
  const T = tempC + 273.15;
  const Tref = refC + 273.15;
  return Math.exp((r.activationEnergyEv / r.boltzmannEvPerK) * (1 / Tref - 1 / T));
}

export function fanAccel(idx, tempC) {
  const r = idx.constants.reliability;
  return 2 ** ((tempC - r.referenceTempC) / r.fanLifeHalvingC);
}

const HOURS_PER_YEAR = 8760;

// Annual failure rate (fraction per year) for each part at its current state.
export function failureRates(idx, build, state) {
  const r = idx.constants.reliability;
  const out = [];
  build.gpus.forEach((g, i) => {
    const part = idx.parts.get(g.part);
    const temp = state.gpuTemps[i].tempC;
    const load = state.gpuLoad[i];
    const loadFactor = r.idleGpuFailureFactor + (1 - r.idleGpuFailureFactor) * load;
    out.push({ key: `gpu:${i}`, label: `GPU ${i} ${part.displayName}`,
      afr: r.gpuFailuresPerGpuYear * loadFactor * arrhenius(idx, temp, r.gpuReferenceTempC) });
  });
  if (build.cpu) {
    const cpu = idx.parts.get(build.cpu);
    out.push({ key: 'cpu', label: `CPU ${cpu.displayName}`, afr: (r.cpuAfrPct / 100) * arrhenius(idx, state.cpuTempC, r.cpuReferenceTempC) });
  }
  (build.ram ?? []).forEach((m, i) => {
    const part = idx.parts.get(m.part);
    const n = (m.count ?? 1) * part.moduleCount;
    out.push({ key: `ram:${i}`, label: `RAM ${part.displayName} x${n}`, afr: n * (r.ramAfrPctPerModule / 100) });
  });
  (build.storage ?? []).forEach((s, i) => {
    const part = idx.parts.get(s.part);
    const n = s.count ?? 1;
    const base = part.afrField ? part.afrField / 100 : HOURS_PER_YEAR / part.mtbfHours;
    // Past its rated max temperature a drive fails far faster; below it, the
    // field data does not show a clear temperature effect (Backblaze reports none).
    const over = Math.max(0, state.driveTempC - part.maxOperatingTempC);
    out.push({ key: `storage:${i}`, label: `${part.displayName} x${n}`, afr: n * base * 2 ** (over / r.driveOverTempDoublingC) });
  });
  if (build.psu) {
    const psu = idx.parts.get(build.psu);
    const internalC = state.roomC + r.psuInternalRiseC + state.psuLoadPct * r.psuRisePerLoadPct;
    out.push({ key: 'psu', label: `PSU ${psu.displayName}`, afr: (r.psuAfrPct / 100) * arrhenius(idx, internalC, r.psuReferenceTempC) });
  }
  const fanTemp = state.inletC;
  for (const [i, f] of state.fans.entries()) {
    const perFan = HOURS_PER_YEAR / f.part.mttfHours40C;
    out.push({ key: `fan:${i}`, label: `${f.count}x ${f.label}`, afr: f.count * perFan * fanAccel(idx, fanTemp) });
  }
  return out;
}

// Probability that a part with annual failure rate afr fails within dtS seconds.
export function failProbability(afr, dtS) {
  const perSecond = afr / (HOURS_PER_YEAR * 3600);
  return 1 - Math.exp(-perSecond * dtS);
}
