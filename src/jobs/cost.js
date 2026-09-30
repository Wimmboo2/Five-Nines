// Price of a build: every part's catalog price times how many are installed.

export function buildCost(idx, build) {
  const p = (id) => (id ? idx.parts.get(id).priceUSD : 0);
  let usd = 0;
  for (const g of build.gpus ?? []) usd += p(g.part);
  usd += p(build.cpu) * (build.cpu ? Math.max(1, build.cpuCount ?? 1) : 0);
  usd += p(build.cooler) * (build.cooler ? Math.max(1, build.cpuCount ?? 1) : 0);
  for (const r of build.ram ?? []) usd += p(r.part) * (r.count ?? 1);
  for (const s of build.storage ?? []) usd += p(s.part) * (s.count ?? 1);
  usd += p(build.psu) * (build.psu ? Math.max(1, build.psuCount ?? 1) : 0);
  usd += p(build.chassis);
  for (const f of build.fans ?? []) usd += p(f.part) * (f.count ?? 1);
  for (const n of build.network ?? []) usd += p(n.part) * (n.count ?? 1);
  usd += p(build.pdu);
  usd += p(build.rack);
  return usd;
}
