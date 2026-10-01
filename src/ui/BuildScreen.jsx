import { useMemo } from 'react';
import { evaluateForJob, scoreDelivery, measure } from '../jobs/index.js';
import { simSoftware } from './softwareState.js';
import { installed, removeOne, simBuild } from './buildState.js';
import { usd, num, gb } from './format.js';

function Check({ ok, children }) {
  return <li className={ok == null ? '' : ok ? 'ok' : 'bad'}><span className="dot" />{children}</li>;
}

export function BuildScreen({ catalog, idx, job, build, setBuild, software }) {
  const rows = installed(idx, build);
  const result = useMemo(() => {
    if (!job) return null;
    const b = simBuild(build);
    const sw = simSoftware(software);
    const t0 = performance.now();
    const ev = evaluateForJob(catalog, job, b, sw, { idx });
    const ms = performance.now() - t0;
    const score = ev.power ? scoreDelivery(ev, job) : null;
    return { ev, sw, ms, score, m: ev.power ? measure(ev, job) : null };
  }, [catalog, idx, job, build, software]);

  return (
    <div className="build-layout">
      <section className="card">
        <h2>Build</h2>
        {!rows.length && <p className="muted">Empty. Add parts from the shop.</p>}
        <table className="parts-table" data-testid="build-parts">
          <tbody>
            {rows.map((r) => (
              <tr key={r.key + r.id + (r.index ?? '')}>
                <td>{r.part.displayName}</td>
                <td className="muted">{r.count > 1 ? `×${r.count}` : ''}</td>
                <td>{usd(r.part.priceUSD * r.count)}</td>
                <td><button className="small" onClick={() => setBuild(removeOne(build, r.key, r.id, r.index))}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card results" data-testid="build-results">
        <h2>Live results</h2>
        {job && !software.os && <p className="muted" data-testid="no-software">No software set up yet: open the Software tab.</p>}
        {!job && <p>Take a job from the job board to see results against its targets.</p>}
        {job && result && <Results job={job} idx={idx} {...result} />}
      </section>
    </div>
  );
}

function Results({ job, idx, ev, m, ms, score }) {
  const t = job.targets;
  return (
    <div>
      {ev.failures.length > 0 && (
        <div className="failures" data-testid="failures">
          <h4>Problems</h4>
          <ul>{ev.failures.map((f, i) => <li key={i}><b>{f.code}</b>: {f.message}</li>)}</ul>
        </div>
      )}
      {ev.warnings.length > 0 && <ul className="warnings">{ev.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}
      {ev.memory && (
        <div>
          <h4>Memory fit: {ev.memory.fits ? 'fits' : 'does not fit'}</h4>
          <ul className="kv">
            {ev.memory.devices.map((d) => (
              <li key={d.gpu}><span>GPU {d.gpu} {d.name}</span><b className={d.fits ? '' : 'bad-text'}>{gb(d.needBytes)} of {gb(d.usableBytes)}</b></li>
            ))}
            {ev.memory.cpu && ev.memory.cpu.need > 0 && <li><span>System RAM</span><b>{gb(ev.memory.cpu.need)} of {gb(ev.memory.cpu.capacityBytes)}</b></li>}
          </ul>
        </div>
      )}
      {m && (
        <>
          <h4>Against the job's targets</h4>
          <ul className="checks">
            {t.tokPerSec && <Check ok={m.tokPerSec >= t.tokPerSec.value}>Speed per user: {num(m.tokPerSec, 1)} tok/s at {num(t.tokPerSec.atContext)} ctx (target {t.tokPerSec.value})</Check>}
            {t.tps && <Check ok={m.tps >= t.tps.value}>Game server: {num(m.tps, 1)} TPS (target {t.tps.value})</Check>}
            {t.vmCpu && <Check ok={m.vmCpu >= t.vmCpu.value}>CPU per VM: {num(m.vmCpu, 2)} reference cores (target {t.vmCpu.value})</Check>}
            {t.vmIops && <Check ok={m.vmIops >= t.vmIops.value}>Disk per VM: {num(m.vmIops)} IOPS (target {num(t.vmIops.value)})</Check>}
            <Check ok={m.wallW <= t.powerLimitW}>Wall power: {num(m.wallW)} W (limit {num(t.powerLimitW)})</Check>
            {t.noiseLimitDBA != null && <Check ok={m.dBA <= t.noiseLimitDBA}>Noise at {num(job.room.listenerDistanceM, 1)} m: {num(m.dBA, 1)} dBA (limit {t.noiseLimitDBA})</Check>}
            <Check ok={m.roomC <= t.roomTempLimitC}>Room: {num(m.roomC, 1)} C (limit {num(t.roomTempLimitC, 1)})</Check>
            <Check ok={ev.costUSD <= job.budgetUSD}>Cost: {usd(ev.costUSD)} (budget {usd(job.budgetUSD)})</Check>
          </ul>
          <h4>Temperatures</h4>
          <ul className="kv">
            <li><span>Case inlet</span><b>{num(ev.thermal.caseInletC, 1)} C</b></li>
            {ev.thermal.gpus.map((g, i) => <li key={i}><span>GPU {i}</span><b>{num(g.tempC, 1)} C (max {g.maxC}){g.powerScale < 0.999 ? `, throttled to ${num(g.powerScale * 100)}%` : ''}</b></li>)}
            {ev.thermal.cpu && <li><span>CPU</span><b>{num(ev.thermal.cpu.tempC, 1)} C (max {ev.thermal.cpu.maxC})</b></li>}
          </ul>
          {ev.inference && (
            <>
              <h4>Inference</h4>
              <ul className="kv">
                {ev.inference.decodeCurve.map((d) => <li key={d.depth}><span>At {num(d.depth)} tokens</span><b>{num(d.perSequence, 1)} tok/s per user, {num(d.aggregate, 0)} total</b></li>)}
                <li><span>Time to first token</span><b>{num(ev.inference.ttftS, 2)} s ({num(ev.inference.promptTokens)}-token prompt)</b></li>
              </ul>
            </>
          )}
          <h4>Power and noise</h4>
          <ul className="kv">
            <li><span>DC load / wall</span><b>{num(ev.power.dcW)} W / {num(ev.power.wallW)} W ({num(ev.power.psuEfficiency * 100, 1)}% efficient)</b></li>
            {ev.power.psuModules > 1 && <li><span>Power modules</span><b>{ev.power.psuModules} installed, {ev.power.psuSpareModules} spare</b></li>}
            <li><span>Noise at 1 m</span><b>{num(ev.noise.at1mDBA, 1)} dBA</b></li>
          </ul>
          {score && <p className="muted">Projected score if delivered as is: {num(score.score, 0)} / 100 ({score.satisfaction}). Delivery and payout are not in this build yet.</p>}
          <p className="muted small">Evaluated in {num(ms, 1)} ms.</p>
        </>
      )}
    </div>
  );
}
