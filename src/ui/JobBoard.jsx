import { usd, num } from './format.js';

const TYPE_LABELS = { inference: 'AI inference', 'game-server': 'Game server', mixed: 'Inference + game server' };
const TIER_LABELS = { homelab: 'Homelab', server: 'Server', datacenter: 'Mini datacenter' };
const AXES = ['performance', 'budget', 'power', 'noise', 'temperature'];

export function JobCard({ job, catalogIdx, active, onTake }) {
  const inf = job.workload.inference;
  const model = inf ? catalogIdx.models.get(inf.model) : null;
  const t = job.targets;
  const r = job.room;
  return (
    <article className={`card job ${active ? 'active' : ''}`} data-testid="job-card">
      <header>
        <div>
          <div className="client">{job.client.name}</div>
          <div className="muted">{TIER_LABELS[job.tier]} · {TYPE_LABELS[job.type]}</div>
        </div>
        <div className="money">
          <div className="big">{usd(job.budgetUSD)}</div>
          <div className="muted">budget</div>
        </div>
      </header>
      <section>
        <h4>Workloads</h4>
        {inf && <div>Serve <b>{model.displayName}</b> at {num(inf.contextLength)} tokens of context, {inf.concurrency} user{inf.concurrency > 1 ? 's' : ''} at once</div>}
        {job.workload.gameServer && <div>Host a block-building game server for <b>{job.workload.gameServer.players}</b> players</div>}
      </section>
      <section>
        <h4>Targets</h4>
        <ul className="kv">
          {t.tokPerSec && <li><span>Speed per user</span><b>{num(t.tokPerSec.value)} tok/s at {num(t.tokPerSec.atContext)} ctx</b></li>}
          {t.tps && <li><span>Game server</span><b>{t.tps.value} TPS with {t.tps.players} players</b></li>}
          <li><span>Power limit</span><b>{num(t.powerLimitW)} W at the wall</b></li>
          {t.noiseLimitDBA != null && <li><span>Noise limit</span><b>{t.noiseLimitDBA} dBA at {num(r.listenerDistanceM, 1)} m</b></li>}
          <li><span>Room temperature limit</span><b>{num(t.roomTempLimitC, 1)} C</b></li>
        </ul>
      </section>
      <section>
        <h4>Room</h4>
        <div>{r.name}: {num(r.floorAreaM2, 1)} m² × {num(r.heightM, 1)} m, {num(r.ambientC, 1)} C ambient, {num(r.airChangesPerHour, 1)} air changes/h</div>
      </section>
      <section>
        <h4>Client priorities</h4>
        <div className="prio">
          {AXES.filter((a) => job.priorities[a] > 0).map((a) => (
            <div key={a} className="prio-row"><span>{a}</span><div className="bar"><div style={{ width: `${job.priorities[a]}%` }} /></div><span>{job.priorities[a]}%</span></div>
          ))}
        </div>
      </section>
      <footer>
        <span>Fee {usd(job.payoutUSD)} · {job.xp} xp</span>
        <button onClick={() => onTake(job)} disabled={active}>{active ? 'Active job' : 'Take job'}</button>
      </footer>
    </article>
  );
}

export function JobBoard({ jobs, idx, activeJob, onTake, onReroll }) {
  return (
    <div>
      <div className="toolbar">
        <h2>Job board</h2>
        <button onClick={onReroll}>New jobs</button>
      </div>
      <div className="grid jobs">
        {jobs.map((j) => <JobCard key={j.id} job={j} catalogIdx={idx} active={activeJob?.id === j.id} onTake={onTake} />)}
      </div>
    </div>
  );
}
