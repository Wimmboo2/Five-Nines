// Noise at the listener: every fan at the speed the thermal solve chose,
// summed on a log scale, reduced by case damping and distance.
//
//   fan level at speed s  = L_max + noiseSpeedCoeff x log10(s)   (50 log fan law)
//   total                 = 10 log10( sum 10^(L_i / 10) )
//   at distance r         = L_1m - 20 log10(r / 1 m)
// Fan ratings in sone are converted with phon = 40 + 10 log2(sone), treated as dB(A).

import { sumDb } from './util.js';
import { allFans } from './power.js';

export function soneToDba(idx, sone) {
  return idx.constants.acoustics.sonePhonOffset + 10 * Math.log2(sone);
}

function atSpeed(idx, maxDba, s) {
  if (s <= 0 || maxDba <= 0) return -Infinity;
  return maxDba + idx.constants.fanLaws.noiseSpeedCoeffDB * Math.log10(s);
}

export function noiseAtListener(idx, build, room, thermal) {
  const a = idx.constants.acoustics;
  const sources = [];
  const ch = build.chassis ? idx.parts.get(build.chassis) : null;
  const damping = ch?.dampingDB ?? 0;
  const add = (label, dba, inside) => {
    if (!Number.isFinite(dba)) return;
    sources.push({ label, dba1m: inside ? dba - damping : dba });
  };

  for (const f of allFans(idx, build)) {
    // Larger stock fans move the same air slower; their level is taken from
    // the reference fan (flagged estimate), once per fan.
    const one = atSpeed(idx, soneToDba(idx, f.part.maxNoiseSone), thermal.caseFanSpeed);
    add(`${f.count}x ${f.label}`, one + 10 * Math.log10(f.count), true);
  }
  build.gpus.forEach((g, i) => {
    const part = idx.parts.get(g.part);
    const t = thermal.gpuTemps[i];
    if (t.fanSpeed !== null) add(`GPU ${i} cooler`, atSpeed(idx, a.gpuFanMaxDBA[part.cooling], t.fanSpeed), part.cooling !== 'blower');
  });
  if (build.cooler) {
    const c = idx.parts.get(build.cooler);
    add('CPU cooler', thermal.cpu?.fanMode === 'quiet' ? c.noiseAtQuietDBA : c.noiseMaxDBA, true);
  }
  if (build.psu) add('PSU fan', a.psuFanDBA, false);
  for (const n of build.network ?? []) {
    const part = idx.parts.get(n.part);
    if (part.fans > 0) add(`${part.displayName} fans`, part.noiseDBA ?? a.switchFanDBA, false);
  }
  const total1m = sumDb(sources.map((s) => s.dba1m));
  const r = Math.max(room.listenerDistanceM, 0.1);
  const atListener = total1m - 20 * Math.log10(r / a.distanceAttenuationRef);
  return { sources, total1m, atListener };
}
