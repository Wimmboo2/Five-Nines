import { Tagged } from './Tagged.jsx';
import { CATEGORY_LABELS, TIER_LABELS, SPEC_KEYS, SPEC_LABELS, portsSummary } from './format.js';

export function Shop({ tagged, build, onAdd, countOf, filters, setFilters }) {
  const { cat, tier } = filters;
  const setCat = (c) => setFilters({ ...filters, cat: c });
  const setTier = (t) => setFilters({ ...filters, tier: t });
  const cats = Object.keys(tagged.parts);
  const parts = cats.flatMap((c) => tagged.parts[c].map((p) => ({ ...p, _cat: c })))
    .filter((p) => (cat === 'all' || p._cat === cat) && (tier === 'all' || p.tier === tier));
  return (
    <div>
      <div className="toolbar">
        <h2>Shop</h2>
        <label>Category <select value={cat} onChange={(e) => setCat(e.target.value)} data-testid="filter-category">
          <option value="all">All</option>
          {cats.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>)}
        </select></label>
        <label>Tier <select value={tier} onChange={(e) => setTier(e.target.value)} data-testid="filter-tier">
          <option value="all">All</option>
          {Object.entries(TIER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select></label>
        <span className="muted">{parts.length} parts · every part is available</span>
      </div>
      <div className="grid parts">
        {parts.map((p) => (
          <article key={p.id} className="card part" data-testid="shop-part">
            <header>
              <div>
                <div className="client">{p.displayName}</div>
                <div className="muted">{CATEGORY_LABELS[p._cat] ?? p._cat} · {TIER_LABELS[p.tier] ?? p.tier}</div>
              </div>
              <div className="money"><Tagged v={p.priceUSD} digits={0} /></div>
            </header>
            <ul className="kv specs">
              {(SPEC_KEYS[p._cat] ?? []).filter((k) => p[k] != null).map((k) => (
                <li key={k}><span>{SPEC_LABELS[k] ?? k}</span><Tagged v={p[k]} /></li>
              ))}
              {p.ports && <li><span>Ports</span><span>{portsSummary(p.ports)}</span></li>}
            </ul>
            <footer>
              <span className="muted">{countOf(p.id) ? `${countOf(p.id)} in build` : ''}</span>
              <button onClick={() => onAdd(p)}>Add to build</button>
            </footer>
          </article>
        ))}
      </div>
    </div>
  );
}
