// The player's build as the simulator reads it, plus helpers the shop and the
// build screen use to add and remove parts.

export function emptyBuild() {
  return { chassis: null, cpu: null, cpuCount: 1, cooler: null, gpus: [], ram: [], storage: [], psu: null, psuCount: 1, fans: [], network: [], pdu: null, rack: null };
}

const SINGLE = { chassis: 'chassis', cpu: 'cpu', cooler: 'cooler', psu: 'psu', pdu: 'pdu', rack: 'rack' };
const COUNTED = { ram: 'ram', storage: 'storage', fan: 'fans', network: 'network' };

export function addPart(build, part) {
  const b = { ...build };
  const cat = part.category;
  if (cat === 'gpu') b.gpus = [...b.gpus, { part: part.id }];
  else if (COUNTED[cat]) {
    const key = COUNTED[cat];
    const has = b[key].find((x) => x.part === part.id);
    b[key] = has ? b[key].map((x) => (x.part === part.id ? { ...x, count: (x.count ?? 1) + 1 } : x)) : [...b[key], { part: part.id, count: 1 }];
  } else if (SINGLE[cat]) {
    const key = SINGLE[cat];
    if (b[key] === part.id && key === 'cpu') b.cpuCount += 1;
    else if (b[key] === part.id && key === 'psu') b.psuCount += 1;
    else {
      b[key] = part.id;
      if (key === 'cpu') b.cpuCount = 1;
      if (key === 'psu') b.psuCount = 1;
    }
  }
  return b;
}

// Remove one unit of a part (by slot key and part id).
export function removeOne(build, key, id, index) {
  const b = { ...build };
  if (key === 'gpus') b.gpus = b.gpus.filter((_, i) => i !== index);
  else if (Array.isArray(b[key])) b[key] = b[key].map((x) => (x.part === id ? { ...x, count: (x.count ?? 1) - 1 } : x)).filter((x) => x.count > 0);
  else if (key === 'cpu' && b.cpuCount > 1) b.cpuCount -= 1;
  else if (key === 'psu' && b.psuCount > 1) b.psuCount -= 1;
  else b[key] = null;
  return b;
}

// Every installed part with its quantity, for lists and the budget meter.
export function installed(idx, build) {
  const rows = [];
  const add = (key, id, count, index) => rows.push({ key, id, count, index, part: idx.parts.get(id) });
  for (const k of ['chassis', 'cpu', 'cooler', 'psu', 'pdu', 'rack']) {
    if (!build[k]) continue;
    add(k, build[k], k === 'cpu' ? build.cpuCount : k === 'psu' ? build.psuCount : k === 'cooler' ? build.cpuCount : 1);
  }
  build.gpus.forEach((g, i) => add('gpus', g.part, 1, i));
  for (const k of ['ram', 'storage', 'fans', 'network']) for (const x of build[k]) add(k, x.part, x.count ?? 1);
  return rows;
}

// The build without empty slots, as evaluateBuild expects it.
export function simBuild(build) {
  const b = { ...build };
  for (const k of ['chassis', 'cooler', 'pdu']) if (!b[k]) delete b[k];
  delete b.rack;
  return b;
}
