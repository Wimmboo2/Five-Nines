import { useMemo, useState } from 'react';
import { usd, num } from './format.js';
import { ROLES, ROLE_UNITS } from '../dc/model.js';
import { openCost, rackUnitsUsed } from '../dc/datacenter.js';
import { referenceCandidates } from '../jobs/templates.js';
import { GATES } from '../jobs/levels.js';

// Colors: categorical slots 1-3 (dark steps) for the three workloads, and the
// reserved status palette for states (dataviz reference palette).
const SERIES = { inference: '#3987e5', game: '#d95926', vm: '#199e70' };
const ROLE_NAMES = { inference: 'AI inference', game: 'Game servers', vm: 'VMs' };
const STATUS = {
  ok: { color: '#0ca30c', label: 'OK', icon: '●' },
  busy: { color: '#fab219', label: 'Busy', icon: '▲' },
  slow: { color: '#ec835a', label: 'Slow service', icon: '▲' },
  leaving: { color: '#e66767', label: 'Customers leaving', icon: '■' },
};

// Utilization → state. 100% is the line where service gets slow; past the
// churn threshold customers start leaving (constants.datacenter).
export function statusOf(u, k) {
  if (u > k.churnAbove) return 'leaving';
  if (u > k.slowAbove) return 'slow';
  if (u >= 0.8) return 'busy';
  return 'ok';
}

function Gauge({ label, value, max = 1, unit = '%', k, text, testid }) {
  if (value == null) return null;
  const u = value / max;
  const st = STATUS[statusOf(u, k)];
  const pct = Math.min(100, u * 100);
  return (
    <div className={`gauge st-${statusOf(u, k)}`} data-testid={testid}>
      <div className="gauge-head"><span>{label}</span><b>{text ?? `${num(u * 100)}${unit}`}</b></div>
      <div className="gauge-track"><div className="gauge-fill" style={{ width: `${pct}%`, background: st.color }} /></div>
      {u >= 0.8 && <div className="gauge-state" style={{ color: st.color }}>{st.icon} {st.label}</div>}
    </div>
  );
}

function Chart({ title, series, yMax, yLabel, refLine, refLabel, fmt, height = 140, testid }) {
  const [hover, setHover] = useState(null);
  const W = 560; const H = height; const L = 44; const R = 70; const T = 10; const B = 22;
  const n = Math.max(2, ...series.map((s) => s.points.length));
  const x = (i) => L + (i / (n - 1)) * (W - L - R);
  const y = (v) => T + (1 - Math.min(v, yMax) / yMax) * (H - T - B);
  const ticks = [0, 0.5, 1].map((f) => f * yMax);
  return (
    <figure className="chart" data-testid={testid}>
      <figcaption>{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          const i = Math.round(((px - L) / (W - L - R)) * (n - 1));
          setHover(i >= 0 && i < n ? i : null);
        }}>
        {ticks.map((t) => <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="grid" /><text x={L - 6} y={y(t) + 4} className="axis" textAnchor="end">{fmt(t)}</text></g>)}
        {refLine != null && <g><line x1={L} x2={W - R} y1={y(refLine)} y2={y(refLine)} className="refline" /><text x={W - R + 4} y={y(refLine) + 4} className="axis">{refLabel}</text></g>}
        <text x={L} y={H - 4} className="axis">{yLabel}</text>
        {series.map((s) => {
          if (!s.points.length) return null;
          const off = n - s.points.length;
          const d = s.points.map((v, i) => `${i ? 'L' : 'M'}${x(i + off).toFixed(1)},${y(v).toFixed(1)}`).join('');
          const last = s.points[s.points.length - 1];
          return <g key={s.name}><path d={d} fill="none" stroke={s.color} strokeWidth="2" />
            {series.length > 1 && <text x={W - R + 4} y={y(last) + 4} className="label">{s.name}</text>}</g>;
        })}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} className="crosshair" />}
      </svg>
      {hover != null && (
        <div className="tooltip">
          {series.map((s) => { const v = s.points[hover - (n - s.points.length)]; return v == null ? null : <div key={s.name}><span className="swatch" style={{ background: s.color }} />{s.name}: <b>{fmt(v)}</b></div>; })}
        </div>
      )}
      {series.length > 1 && <div className="legend">{series.map((s) => <span key={s.name}><span className="swatch" style={{ background: s.color }} />{s.name}</span>)}</div>}
    </figure>
  );
}

export function Datacenter({ catalog, idx, dc, money, level, paused, onOpen, onBuy }) {
  const k = idx.constants.datacenter;
  if (level < GATES.personalDatacenter) {
    return <section className="card" data-testid="dc-locked"><h2>Personal datacenter</h2><p>Unlocks at level {GATES.personalDatacenter}. You are level {level}.</p></section>;
  }
  if (!dc) {
    const cost = openCost(idx);
    return (
      <section className="card" data-testid="dc-open">
        <h2>Personal datacenter</h2>
        <p>Rent a small data hall, put in a 42U rack with a PDU, then buy nodes. Customers for AI inference, game servers and VMs find you on their own; you earn while the tab is open and visible.</p>
        <button disabled={money < cost} onClick={onOpen} data-testid="dc-open-btn">Open the datacenter ({usd(cost)})</button>
        {money < cost && <p className="muted">You have {usd(money)}.</p>}
      </section>
    );
  }
  const last = dc.last;
  const hist = dc.history;
  const day = Math.floor(dc.simH / 24);
  return (
    <div className="dc" data-testid="datacenter">
      <section className="card dc-kpis">
        <div><span className="muted">Simulated time</span><b data-testid="dc-time">Day {day}, {String(Math.floor(dc.simH % 24)).padStart(2, '0')}:00</b>{paused && <span className="paused"> paused (tab hidden)</span>}</div>
        <div><span className="muted">Income</span><b data-testid="dc-income">${num(last?.incomePerH ?? 0, 2)}/h</b></div>
        <div><span className="muted">Power bill</span><b>${num(last?.powerCostPerH ?? 0, 2)}/h</b></div>
        <div><span className="muted">Reputation</span><b data-testid="dc-rep">{num(dc.reputation, 1)} / 100</b></div>
        <div><span className="muted">Customers</span><b data-testid="dc-customers">{dc.customers.length}</b></div>
        <div><span className="muted">Earned so far</span><b>{usd(dc.totals.earnedUSD - dc.totals.powerUSD)}</b></div>
      </section>

      <section className="card">
        <h2>Whole datacenter</h2>
        <div className="gauges-grid" data-testid="dc-site-gauges">
          {ROLES.filter((r) => dc.nodes.some((n) => n.role === r)).map((r) => (
            <Gauge key={r} k={k} label={`${ROLE_NAMES[r]} load`} value={last?.util[r] ?? 0} testid={`gauge-site-${r}`}
              text={`${num((last?.util[r] ?? 0) * 100)}% · ${num(last?.demand[r] ?? 0)} / ${num(last?.capacity[r] ?? 0)} ${ROLE_UNITS[r]}`} />
          ))}
          <Gauge k={k} label="Site power" value={last?.wantW ?? 0} max={dc.utilityW} text={`${num((last?.wantW ?? 0) / 1000, 1)} / ${num(dc.utilityW / 1000, 1)} kW`} testid="gauge-site-power" />
          <Gauge k={k} label="Hall air" value={dc.hallC} max={k.hallMaxC} text={`${num(dc.hallC, 1)} C (max ${k.hallMaxC})`} testid="gauge-site-hall" />
        </div>
        <div className="charts">
          <Chart title="Load by workload (last 240 simulated hours)" yMax={1.5} yLabel="% of capacity" refLine={1} refLabel="capacity"
            fmt={(v) => `${Math.round(v * 100)}%`} testid="chart-util"
            series={ROLES.filter((r) => dc.nodes.some((n) => n.role === r)).map((r) => ({ name: ROLE_NAMES[r], color: SERIES[r], points: hist.map((h) => h.util[r] ?? 0) }))} />
          <Chart title="Power draw" yMax={Math.max(dc.utilityW, ...hist.map((h) => h.wallW)) / 1000 * 1.1} yLabel="kW" refLine={dc.utilityW / 1000} refLabel="feed"
            fmt={(v) => `${v.toFixed(1)}`} series={[{ name: 'Power', color: SERIES.inference, points: hist.map((h) => h.wallW / 1000) }]} testid="chart-power" />
          <Chart title="Hall air temperature" yMax={Math.max(40, ...hist.map((h) => h.hallC))} yLabel="C" refLine={k.hallMaxC} refLabel="max"
            fmt={(v) => `${v.toFixed(0)}`} series={[{ name: 'Hall', color: SERIES.game, points: hist.map((h) => h.hallC) }]} testid="chart-hall" />
        </div>
      </section>

      <section className="card">
        <h2>Nodes</h2>
        {!dc.nodes.length && <p className="muted">No nodes yet. Buy one below.</p>}
        <div className="nodes-grid">
          {dc.nodes.map((n) => {
            const g = last?.nodes.find((x) => x.id === n.id);
            const st = g ? statusOf(g.util, k) : 'ok';
            return (
              <article key={n.id} className={`card node st-${st}`} data-testid="dc-node">
                <h4>{n.id} · {ROLE_NAMES[n.role]}{n.model ? ` · ${idx.models.get(n.model).displayName}` : ''}</h4>
                <div className="muted">{idx.parts.get(n.build.chassis)?.displayName} in {n.rackId}{n.build.gpus.length ? ` · ${n.build.gpus.length}x ${idx.parts.get(n.build.gpus[0].part).displayName}` : ''}</div>
                {g && !g.ok && <p className="bad-text">Not serving: {g.error}</p>}
                {g && g.ok && (
                  <div className="gauges-grid small">
                    <Gauge k={k} label="GPU compute" value={g.gpu} testid="gauge-gpu" />
                    <Gauge k={k} label="VRAM" value={g.vram} />
                    <Gauge k={k} label="CPU" value={g.cpu} />
                    <Gauge k={k} label="RAM" value={g.ram} />
                    <Gauge k={k} label="Disk IOPS" value={g.iops} />
                    <Gauge k={k} label="Network" value={g.net} />
                    <Gauge k={k} label="Power (of full load)" value={g.wallW} max={Math.max(1, g.fullW)} text={`${num(g.wallW)} / ${num(g.fullW)} W`} />
                    {g.gpu != null && <Gauge k={k} label="Hottest GPU" value={g.gpuC} max={90} text={`${num(g.gpuC, 0)} C${g.throttled ? ' (throttling)' : ''}`} />}
                    <Gauge k={k} label="CPU temp" value={g.cpuC} max={95} text={`${num(g.cpuC, 0)} C`} />
                  </div>
                )}
                <NicBuy idx={idx} money={money} onBuy={(part) => onBuy('nic', { nodeId: n.id, partId: part })} />
              </article>
            );
          })}
        </div>
      </section>

      <div className="dc-two">
        <section className="card">
          <h2>Customers</h2>
          <table className="parts-table" data-testid="dc-customer-table"><tbody>
            {dc.customers.slice(0, 40).map((c) => {
              const st = statusOf(last?.util[c.role] ?? 0, k);
              return <tr key={c.id}><td>{ROLE_NAMES[c.role]}</td><td>{num(c.size * (c.spike?.mult ?? 1))} {ROLE_UNITS[c.role]}{c.spike ? ' (spiking)' : ''}</td>
                <td style={{ color: STATUS[st].color }}>{STATUS[st].icon} {st === 'ok' || st === 'busy' ? 'Served' : STATUS[st].label}</td></tr>;
            })}
          </tbody></table>
          {dc.customers.length > 40 && <p className="muted">and {dc.customers.length - 40} more</p>}
        </section>
        <section className="card">
          <h2>Alerts</h2>
          <ul className="alerts" data-testid="dc-alerts">
            {dc.alerts.map((a, i) => <li key={i} className={`al-${a.level}`}><span className="muted">Day {Math.floor(a.h / 24)} {String(Math.floor(a.h % 24)).padStart(2, '0')}:00</span> {a.text}</li>)}
            {!dc.alerts.length && <li className="muted">Nothing yet.</li>}
          </ul>
        </section>
      </div>

      <DcShop catalog={catalog} idx={idx} dc={dc} money={money} onBuy={onBuy} />
    </div>
  );
}

function NicBuy({ idx, money, onBuy }) {
  const nics = useMemo(() => [...idx.parts.values()].filter((p) => p.category === 'network' && p.kind !== 'switch' && (p.ports ?? []).length), [idx]);
  const [pick, setPick] = useState('');
  return (
    <div className="nic-buy">
      <select value={pick} onChange={(e) => setPick(e.target.value)}>
        <option value="">Add a network card...</option>
        {nics.map((p) => <option key={p.id} value={p.id}>{p.displayName} ({usd(p.priceUSD)})</option>)}
      </select>
      <button className="small" disabled={!pick || money < (idx.parts.get(pick)?.priceUSD ?? Infinity)} onClick={() => onBuy(pick)}>Buy</button>
    </div>
  );
}

function DcShop({ catalog, idx, dc, money, onBuy }) {
  const k = idx.constants.datacenter;
  const [role, setRole] = useState('inference');
  const [model, setModel] = useState(catalog.models[0].id);
  const [tpl, setTpl] = useState(0);
  const [rackId, setRackId] = useState(dc.racks[0].id);
  const templates = useMemo(() => {
    const list = role === 'inference'
      ? [...referenceCandidates(catalog, idx, 'server', true), ...referenceCandidates(catalog, idx, 'datacenter', true)]
      : referenceCandidates(catalog, idx, 'server', false);
    const seen = new Set();
    return list.filter((c) => { const key = JSON.stringify(c.build); if (seen.has(key)) return false; seen.add(key); return true; }).sort((a, b) => a.costUSD - b.costUSD).slice(0, 30);
  }, [catalog, idx, role]);
  const t = templates[Math.min(tpl, templates.length - 1)];
  const describe = (b) => `${idx.parts.get(b.chassis).displayName}, ${b.cpuCount ?? 1}x ${idx.parts.get(b.cpu).displayName}${b.gpus.length ? `, ${b.gpus.length}x ${idx.parts.get(b.gpus[0].part).displayName}` : ''}`;
  const pdu = idx.parts.get('pdu-conduit-17k');
  return (
    <section className="card" data-testid="dc-shop">
      <h2>Buy hardware</h2>
      <div className="dc-shop-grid">
        <div>
          <h4>Node</h4>
          <div className="fields">
            <label className="field"><span>Serves</span><select value={role} onChange={(e) => { setRole(e.target.value); setTpl(0); }} data-testid="dc-role">{ROLES.map((r) => <option key={r} value={r}>{ROLE_NAMES[r]}</option>)}</select></label>
            {role === 'inference' && <label className="field"><span>Model</span><select value={model} onChange={(e) => setModel(e.target.value)} data-testid="dc-model">{catalog.models.map((m) => <option key={m.id} value={m.id}>{m.displayName}</option>)}</select></label>}
            <label className="field"><span>Hardware</span><select value={tpl} onChange={(e) => setTpl(Number(e.target.value))} data-testid="dc-template">{templates.map((c, i) => <option key={i} value={i}>{usd(c.costUSD)} · {describe(c.build)}</option>)}</select></label>
            <label className="field"><span>Rack</span><select value={rackId} onChange={(e) => setRackId(e.target.value)}>{dc.racks.map((r) => <option key={r.id} value={r.id}>{r.id} ({42 - rackUnitsUsed(catalog, idx, dc, r.id)}U free)</option>)}</select></label>
          </div>
          <button disabled={!t || money < t.costUSD} onClick={() => onBuy('node', { build: t.build, role, model, rackId })} data-testid="dc-buy-node">Buy node ({t ? usd(t.costUSD) : '-'})</button>
        </div>
        <div>
          <h4>Site</h4>
          <p><button disabled={money < k.utilityStepUSD} onClick={() => onBuy('utility')} data-testid="dc-buy-utility">+{num(k.utilityStepW / 1000)} kW utility feed ({usd(k.utilityStepUSD)})</button></p>
          <p><button disabled={money < k.coolingStepUSD} onClick={() => onBuy('cooling')} data-testid="dc-buy-cooling">Cooling unit, +{k.coolingStepAch} air changes/h ({usd(k.coolingStepUSD)})</button></p>
          <p><button disabled={money < openCost(idx)} onClick={() => onBuy('rack')}>Another rack + PDU ({usd(openCost(idx))})</button></p>
          <p><button disabled={money < pdu.priceUSD} onClick={() => onBuy('pdu', { rackId })}>Extra PDU for {rackId} ({usd(pdu.priceUSD)}, {num(pdu.capacityW / 1000, 1)} kW)</button></p>
          <p className="muted">Feed {num(dc.utilityW / 1000)} kW · {dc.coolingUnits} cooling unit(s) · {dc.racks.length} rack(s)</p>
        </div>
      </div>
    </section>
  );
}
