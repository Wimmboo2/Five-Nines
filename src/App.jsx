import { useMemo, useState } from 'react';
import { catalog, tagged } from './data/index.js';
import { indexCatalog } from './sim/util.js';
import { generateJobs, buildCost } from './jobs/index.js';
import { JobBoard } from './ui/JobBoard.jsx';
import { Shop } from './ui/Shop.jsx';
import { BuildScreen } from './ui/BuildScreen.jsx';
import { BudgetMeter } from './ui/BudgetMeter.jsx';
import { emptyBuild, addPart, installed, simBuild } from './ui/buildState.js';

const idx = indexCatalog(catalog);
const TABS = [['jobs', 'Job board'], ['shop', 'Shop'], ['build', 'Build']];

export default function App() {
  const [tab, setTab] = useState('jobs');
  const [boardSeed, setBoardSeed] = useState(1);
  const jobs = useMemo(() => generateJobs(catalog, { seed: boardSeed, count: 6 }), [boardSeed]);
  const [activeJob, setActiveJob] = useState(null);
  const [build, setBuild] = useState(emptyBuild);
  const cost = buildCost(idx, simBuild(build));
  const counts = useMemo(() => {
    const c = new Map();
    for (const r of installed(idx, build)) c.set(r.id, (c.get(r.id) ?? 0) + r.count);
    return c;
  }, [build]);

  return (
    <div className="app">
      <nav className="topbar">
        <div className="brand">Five Nines</div>
        {TABS.map(([k, label]) => <button key={k} className={tab === k ? 'tab on' : 'tab'} onClick={() => setTab(k)} data-testid={`tab-${k}`}>{label}</button>)}
        <div className="active-job">{activeJob ? <>Active: <b>{activeJob.client.name}</b></> : <span className="muted">No active job</span>}</div>
      </nav>
      <BudgetMeter cost={cost} budget={activeJob?.budgetUSD} />
      <main>
        {tab === 'jobs' && <JobBoard jobs={jobs} idx={idx} activeJob={activeJob} onReroll={() => setBoardSeed((s) => s + 1)}
          onTake={(j) => { setActiveJob(j); setTab('shop'); }} />}
        {tab === 'shop' && <Shop tagged={tagged} build={build} onAdd={(p) => setBuild((b) => addPart(b, idx.parts.get(p.id)))} countOf={(id) => counts.get(id)} />}
        {tab === 'build' && <BuildScreen catalog={catalog} idx={idx} job={activeJob} build={build} setBuild={setBuild} />}
      </main>
    </div>
  );
}
