import { useMemo, useState } from 'react';
import { newPlayer, applyDelivery } from './game/player.js';
import { startStressTest } from './game/flow.js';
import { DeliveryResult } from './ui/DeliveryResult.jsx';
import { xpForLevel, GATES } from './jobs/levels.js';
import { usd } from './ui/format.js';
import { catalog, tagged } from './data/index.js';
import { indexCatalog } from './sim/util.js';
import { generateJobs, buildCost, scoreDelivery } from './jobs/index.js';
import { JobBoard } from './ui/JobBoard.jsx';
import { Shop } from './ui/Shop.jsx';
import { BuildScreen } from './ui/BuildScreen.jsx';
import { BudgetMeter } from './ui/BudgetMeter.jsx';
import { emptyBuild, addPart, installed, simBuild } from './ui/buildState.js';
import { emptySoftware } from './ui/softwareState.js';
import { SoftwareScreen } from './ui/SoftwareScreen.jsx';
import { Browser } from './ui/Browser.jsx';

const idx = indexCatalog(catalog);
const TABS = [['jobs', 'Job board'], ['shop', 'Shop'], ['software', 'Software'], ['browser', 'Browser'], ['build', 'Build']];

export default function App() {
  const [tab, setTab] = useState('jobs');
  const [boardSeed, setBoardSeed] = useState(1);
  const [player, setPlayer] = useState(newPlayer);
  const allJobs = useMemo(() => generateJobs(catalog, { seed: boardSeed, count: 6, level: player.level }), [boardSeed, player.level]);
  const jobs = allJobs.filter((j) => !player.delivered.some((d) => d.jobId === j.id));
  const [run, setRun] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [broken, setBroken] = useState(null);
  const [result, setResult] = useState(null);
  const resetWork = () => { setBuild(emptyBuild()); setSoftware(emptySoftware()); setRun(null); setBroken(null); };
  const runTest = (ev, sw) => {
    const r = startStressTest(ev, activeJob, simBuild(build), sw, attempt + 1);
    setAttempt((a) => a + 1);
    setRun(r);
    if (r.result.failure?.code === 'part-failure') {
      setBroken({ key: r.result.failure.part, label: r.result.failure.message.split(' failed at ')[0] });
    }
  };
  const deliver = (ev) => {
    const score = scoreDelivery(ev, activeJob);
    const out = applyDelivery(player, activeJob, score);
    setPlayer(out.player);
    setResult({ job: activeJob, score, ...out });
    setActiveJob(null);
    resetWork();
  };
  const [activeJob, setActiveJob] = useState(null);
  const [build, setBuild] = useState(emptyBuild);
  const [software, setSoftware] = useState(emptySoftware);
  const nextXp = xpForLevel(player.level + 1);
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
        <div className="player" data-testid="player">{usd(player.money)} · Level <b data-testid="level">{player.level}</b> · {player.xp} / {nextXp} xp</div>
        <div className="active-job">{activeJob ? <>Active: <b>{activeJob.client.name}</b></> : <span className="muted">No active job</span>}</div>
      </nav>
      <BudgetMeter cost={cost} budget={activeJob?.budgetUSD} />
      <main>
        {result && <DeliveryResult result={result} onClose={() => { setResult(null); setTab('jobs'); }} />}
        {tab === 'jobs' && !result && <LockedNote level={player.level} />}
        {tab === 'jobs' && !result && <JobBoard jobs={jobs} idx={idx} activeJob={activeJob} onReroll={() => setBoardSeed((s) => s + 1)}
          onTake={(j) => { if (j.id !== activeJob?.id) resetWork(); setActiveJob(j); setTab('shop'); }} />}
        {tab === 'shop' && <Shop tagged={tagged} build={build} onAdd={(p) => setBuild((b) => addPart(b, idx.parts.get(p.id)))} countOf={(id) => counts.get(id)} />}
        {tab === 'software' && <SoftwareScreen idx={idx} catalog={catalog} software={software} setSoftware={setSoftware} gpuCount={build.gpus.length} />}
        {tab === 'browser' && <Browser />}
        {tab === 'build' && !result && <BuildScreen catalog={catalog} idx={idx} job={activeJob} build={build} setBuild={setBuild} software={software}
          run={run} broken={broken} onRunTest={runTest} onReplace={() => setBroken(null)} onDeliver={deliver} />}
      </main>
    </div>
  );
}

const TIER_NAMES = { server: 'Server jobs', datacenter: 'Mini datacenter jobs' };
const TYPE_NAMES = { mixed: 'Inference + game server jobs', cloud: 'VM hosting jobs' };

function LockedNote({ level }) {
  const locked = [
    ...Object.entries(GATES.tier).filter(([k, l]) => l > level).map(([k, l]) => `${TIER_NAMES[k]} (level ${l})`),
    ...Object.entries(GATES.type).filter(([k, l]) => l > level).map(([k, l]) => `${TYPE_NAMES[k]} (level ${l})`),
  ];
  if (GATES.personalDatacenter > level) locked.push(`Personal datacenter (level ${GATES.personalDatacenter})`);
  return locked.length ? <p className="muted locked" data-testid="locked">Locked: {locked.join(', ')}. Every part is always available.</p> : null;
}
