// Save format (stage 8). Pure functions: no localStorage, no DOM.
//
// { version, savedAt, checksum, data }
// - data holds ids, never catalog objects (parts, models and engines are
//   looked up in the current catalog on load).
// - checksum is FNV-1a over JSON.stringify(data). It catches corruption and
//   hand edits; anyone can recompute it, so it is not tamper-proof.

export const SAVE_VERSION = 2;
export const SAVE_KEY = 'five-nines-save';

// version -> function that upgrades data from that version to version + 1.
export const MIGRATIONS = {
  // v1 -> v2 (stage 9): the personal datacenter. Version 1 saves predate it,
  // so the player hasn't opened one yet.
  1: (d) => ({ ...d, datacenter: null }),
};

export function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function serialize(data, now = Date.now()) {
  const json = JSON.stringify(data);
  return JSON.stringify({ version: SAVE_VERSION, savedAt: now, checksum: fnv1a(json), data });
}

// Returns { data, removed, error, unknownVersion }. Never throws.
export function deserialize(raw, idx) {
  let obj;
  try { obj = JSON.parse(raw); } catch { return { error: 'The save is not valid JSON (corrupted or not a Five Nines save).' }; }
  if (!obj || typeof obj !== 'object' || typeof obj.version !== 'number' || !obj.data || typeof obj.data !== 'object') {
    return { error: 'This is not a Five Nines save (missing version or data).' };
  }
  if (fnv1a(JSON.stringify(obj.data)) !== obj.checksum) {
    return { error: 'The save failed its checksum: it was corrupted or edited by hand.' };
  }
  if (obj.version > SAVE_VERSION || obj.version < 1) {
    return { error: `The save is from an unknown version (${obj.version}); this game reads version ${SAVE_VERSION}.`, unknownVersion: obj.version };
  }
  let data = obj.data;
  for (let v = obj.version; v < SAVE_VERSION; v++) {
    if (!MIGRATIONS[v]) return { error: `No migration from save version ${v}.`, unknownVersion: obj.version };
    data = MIGRATIONS[v](data);
  }
  const shapeError = checkShape(data);
  if (shapeError) return { error: `The save is damaged: ${shapeError}.` };
  const { data: pruned, removed } = pruneMissing(data, idx);
  return { data: pruned, removed, savedAt: obj.savedAt };
}

function checkShape(d) {
  const num = (x) => typeof x === 'number' && Number.isFinite(x);
  if (!d.player || !num(d.player.money) || !num(d.player.xp) || !num(d.player.level) || !Array.isArray(d.player.delivered)) return 'player is missing or invalid';
  if (!Array.isArray(d.jobs)) return 'job board is missing';
  if (!d.build || !Array.isArray(d.build.gpus)) return 'build is missing';
  if (!d.software || typeof d.software !== 'object') return 'software is missing';
  if (!num(d.playedS)) return 'time played is missing';
  if (d.datacenter != null && (typeof d.datacenter !== 'object' || !Array.isArray(d.datacenter.nodes) || !num(d.datacenter.simH))) return 'datacenter is invalid';
  return null;
}

const partIdsOf = (b) => [
  b.chassis, b.cpu, b.cooler, b.psu, b.pdu, b.rack,
  ...(b.gpus ?? []).map((g) => g.part),
  ...['ram', 'storage', 'fans', 'network'].flatMap((k) => (b[k] ?? []).map((x) => x.part)),
].filter(Boolean);

// Drop anything whose id is gone from the catalog; report it in plain words.
export function pruneMissing(data, idx) {
  const removed = [];
  const d = structuredClone(data);
  const hasPart = (id) => idx.parts.has(id);

  // Build: remove missing parts slot by slot.
  const b = d.build;
  for (const k of ['chassis', 'cpu', 'cooler', 'psu', 'pdu', 'rack']) {
    if (b[k] && !hasPart(b[k])) { removed.push(`Part ${b[k]} (no longer sold) was removed from your build.`); b[k] = null; }
  }
  b.gpus = b.gpus.filter((g) => hasPart(g.part) || (removed.push(`GPU ${g.part} (no longer sold) was removed from your build.`), false));
  for (const k of ['ram', 'storage', 'fans', 'network']) {
    b[k] = (b[k] ?? []).filter((x) => hasPart(x.part) || (removed.push(`Part ${x.part} (no longer sold) was removed from your build.`), false));
  }

  // Software: an inference server with a missing model or engine is removed.
  const inf = d.software.inference;
  if (inf && (!idx.models.has(inf.model) || !idx.engines.has(inf.engine))) {
    removed.push(`Your inference server used ${!idx.models.has(inf.model) ? `model ${inf.model}` : `engine ${inf.engine}`}, which no longer exists; it was uninstalled.`);
    d.software.inference = null;
  }

  // Jobs: a job is dropped if its model or any reference part is gone.
  const jobOk = (j) => (!j.workload?.inference || idx.models.has(j.workload.inference.model))
    && partIdsOf(j.reference?.build ?? { gpus: [] }).every(hasPart);
  d.jobs = d.jobs.filter((j) => jobOk(j) || (removed.push(`Job for ${j.client?.name ?? 'a client'} was removed: it needs a model or part that no longer exists.`), false));
  if (d.activeJobId && !d.jobs.some((j) => j.id === d.activeJobId)) {
    d.activeJobId = null; d.run = null; d.broken = null;
  }
  // Datacenter: nodes or racks whose parts are gone are removed.
  if (d.datacenter) {
    const dc = d.datacenter;
    dc.racks = dc.racks.filter((r) => (hasPart(r.part) && r.pdus.every(hasPart)) || (removed.push(`Datacenter rack ${r.id} used a part that no longer exists and was removed.`), false));
    dc.nodes = dc.nodes.filter((n) => (dc.racks.some((r) => r.id === n.rackId) && partIdsOf(n.build).every(hasPart) && (!n.model || idx.models.has(n.model)))
      || (removed.push(`Datacenter node ${n.id} used a part or model that no longer exists and was removed.`), false));
  }
  // A stress run on a changed build is re-checked against its key on load.
  return { data: d, removed };
}
