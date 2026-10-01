import { useEffect, useMemo, useRef, useState } from 'react';
import { applyDelivery } from './game/player.js';
import { startStressTest } from './game/flow.js';
import { newGame, rollBoard, toSaveData, restoreRun } from './game/state.js';
import { DeliveryResult } from './ui/DeliveryResult.jsx';
import { xpForLevel, GATES } from './jobs/levels.js';
import { usd } from './ui/format.js';
import { catalog, tagged } from './data/index.js';
import { indexCatalog } from './sim/util.js';
import { buildCost, scoreDelivery } from './jobs/index.js';
import { JobBoard } from './ui/JobBoard.jsx';
import { Shop } from './ui/Shop.jsx';
import { BuildScreen } from './ui/BuildScreen.jsx';
import { BudgetMeter } from './ui/BudgetMeter.jsx';
import { emptyBuild, addPart, installed, simBuild } from './ui/buildState.js';
import { emptySoftware } from './ui/softwareState.js';
import { SoftwareScreen } from './ui/SoftwareScreen.jsx';
import { Browser } from './ui/Browser.jsx';
import { SaveBar, SaveBanners } from './ui/SaveBar.jsx';
import { SAVE_KEY, serialize, deserialize } from './save/save.js';
import { makeStorage } from './save/storage.js';
import { watchOtherTabs } from './save/tabs.js';
import { advance } from './save/clock.js';
import { Datacenter } from './ui/Datacenter.jsx';
import { dcAdvance } from './dc/clock.js';
import * as DC from './dc/datacenter.js';

const idx = indexCatalog(catalog);
const storage = makeStorage();
const TABS = [['jobs', 'Job board'], ['shop', 'Shop'], ['software', 'Software'], ['browser', 'Browser'], ['build', 'Build'], ['datacenter', 'Datacenter']];
const AUTOSAVE_DEBOUNCE_MS = 500;
const PLAYED_SAVE_EVERY_MS = 15000;

// Loads the save once at start-up. Never throws.
function loadInitial() {
  const r = storage.read(SAVE_KEY);
  if (!r.ok) return { game: newGame(catalog), notices: [], storageError: r.error };
  if (r.value == null) return { game: newGame(catalog), notices: [] };
  const d = deserialize(r.value, idx);
  if (d.error) return { game: newGame(catalog), notices: [], loadError: d.error, unreadable: r.value };
  const game = { ...newGame(catalog), ...d.data };
  game.run = restoreRun(catalog, idx, d.data);
  return { game, notices: d.removed };
}

export default function App() {
  const [init] = useState(loadInitial);
  const [game, setGame] = useState(init.game);
  const [notices, setNotices] = useState(init.notices);
  const [storageError, setStorageError] = useState(init.storageError ?? null);
  const [loadError, setLoadError] = useState(init.loadError ?? null);
  // An unreadable save is never overwritten until the player chooses.
  const [unreadable, setUnreadable] = useState(init.unreadable ?? null);
  const [otherTab, setOtherTab] = useState(false);
  const [toast, setToast] = useState(null);
  const tabs = useRef(null);
  const played = useRef(game.playedS);

  const update = (patch) => setGame((g) => ({ ...g, ...(typeof patch === 'function' ? patch(g) : patch) }));
  const { tab, jobs: board, build, software, player, run, attempt, broken, result } = game;
  const activeJob = board.find((j) => j.id === game.activeJobId) ?? null;
  const jobs = board.filter((j) => !player.delivered.some((d) => d.jobId === j.id));

  // ---- saving ----
  const canSave = !otherTab && !unreadable;
  const write = (g) => {
    if (!canSave) return;
    const res = storage.write(SAVE_KEY, serialize(toSaveData({ ...g, playedS: played.current })));
    setStorageError(res.ok ? null : res.error);
  };
  const latest = useRef(game);
  latest.current = game;
  useEffect(() => {
    const h = setTimeout(() => write(game), AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(h);
  }, [game, canSave]);
  useEffect(() => {
    const flush = () => write(latest.current);
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    return () => { window.removeEventListener('pagehide', flush); window.removeEventListener('beforeunload', flush); };
  }, [canSave]);
  // Time played: only while open, no catch-up (src/save/clock.js).
  const [playedS, setPlayedS] = useState(game.playedS);
  useEffect(() => {
    let last = Date.now();
    // A hidden tab counts as closed: the play clock stops too.
    const tick = setInterval(() => { const now = Date.now(); if (document.visibilityState === 'visible') played.current = advance(played.current, last, now); last = now; setPlayedS(played.current); }, 1000);
    const periodic = setInterval(() => write(latest.current), PLAYED_SAVE_EVERY_MS);
    return () => { clearInterval(tick); clearInterval(periodic); };
  }, [canSave]);
  // Datacenter time: only while the tab is visible (a hidden tab counts as
  // closed), whole simulated hours, no catch-up (src/dc/clock.js).
  const [hidden, setHidden] = useState(typeof document !== 'undefined' && document.visibilityState === 'hidden');
  useEffect(() => {
    const onVis = () => setHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onVis);
    let last = Date.now();
    const h = setInterval(() => {
      const now = Date.now();
      const prev = last;
      last = now;
      setGame((g) => {
        if (!g.datacenter) return g;
        const a = dcAdvance(g.dcCarryH ?? 0, prev, now, document.visibilityState === 'visible', idx.constants.datacenter.simHoursPerRealSecond);
        if (!a.steps) return { ...g, dcCarryH: a.carryH };
        let dc = g.datacenter;
        let delta = 0;
        for (let i = 0; i < a.steps; i++) { const r = DC.stepDatacenter(catalog, idx, dc, 1, { difficulty: 'normal' }); dc = r.dc; delta += r.moneyDelta; }
        return { ...g, datacenter: dc, dcCarryH: a.carryH, player: { ...g.player, money: g.player.money + delta } };
      });
    }, 1000);
    return () => { clearInterval(h); document.removeEventListener('visibilitychange', onVis); };
  }, []);
  const buyDc = (kind, args = {}) => update((g) => {
    const dc = g.datacenter;
    const r = kind === 'node' ? DC.buyNode(catalog, idx, dc, args) : kind === 'nic' ? DC.buyNic(idx, dc, args.nodeId, args.partId)
      : kind === 'rack' ? DC.buyRack(idx, dc) : kind === 'pdu' ? DC.buyPdu(idx, dc, args.rackId)
        : kind === 'cooling' ? DC.buyCooling(idx, dc) : DC.buyUtility(idx, dc);
    if (r.error) { setToast(r.error); return {}; }
    if (r.costUSD > g.player.money) { setToast(`Not enough money: that costs ${usd(r.costUSD)}.`); return {}; }
    return { datacenter: r.dc, player: { ...g.player, money: g.player.money - r.costUSD } };
  });
  const openDc = () => update((g) => {
    const cost = DC.openCost(idx);
    if (g.player.money < cost) return {};
    return { datacenter: DC.newDatacenter(catalog, idx, (g.boardSeed * 7919 + g.player.xp) >>> 0), player: { ...g.player, money: g.player.money - cost } };
  });
  useEffect(() => {
    tabs.current = watchOtherTabs(setOtherTab);
    return () => tabs.current?.close();
  }, []);

  // ---- game actions ----
  const resetWork = { build: emptyBuild(), software: emptySoftware(), run: null, broken: null };
  const setBuild = (b) => update((g) => ({ build: typeof b === 'function' ? b(g.build) : b }));
  const runTest = (ev, sw) => {
    const r = startStressTest(ev, activeJob, simBuild(build), sw, attempt + 1);
    const failedPart = r.result.failure?.code === 'part-failure'
      ? { key: r.result.failure.part, label: r.result.failure.message.split(' failed at ')[0] } : null;
    update({ run: { ...r, positionS: 0 }, attempt: attempt + 1, broken: failedPart });
  };
  const deliver = (ev) => {
    const score = scoreDelivery(ev, activeJob);
    const out = applyDelivery(player, activeJob, score);
    update((g) => ({
      ...resetWork, player: out.player, activeJobId: null,
      result: { job: activeJob, score, ...out },
      // New tiers or job types unlock with a level: roll a fresh board.
      ...(out.levelUp ? { boardSeed: g.boardSeed + 1, jobs: rollBoard(catalog, g.boardSeed + 1, out.player.level) } : {}),
    }));
  };
  const loadGame = (raw) => {
    const d = deserialize(raw, idx);
    if (d.error) return d.error;
    const g = { ...newGame(catalog), ...d.data };
    g.run = restoreRun(catalog, idx, d.data);
    played.current = g.playedS; setPlayedS(g.playedS);
    setGame(g); setNotices(d.removed); setUnreadable(null); setLoadError(null);
    return null;
  };
  const startNew = () => {
    const g = newGame(catalog);
    played.current = 0; setPlayedS(0);
    setUnreadable(null); setLoadError(null); setNotices([]);
    setGame(g);
  };

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
        {TABS.map(([k, label]) => <button key={k} className={tab === k ? 'tab on' : 'tab'} onClick={() => update({ tab: k })} data-testid={`tab-${k}`}>{label}</button>)}
        <div className="player" data-testid="player">{usd(player.money)} · Level <b data-testid="level">{player.level}</b> · {player.xp} / {nextXp} xp</div>
        <div className="active-job" data-testid="active-job">{activeJob ? <>Active: <b>{activeJob.client.name}</b></> : <span className="muted">No active job</span>}</div>
      </nav>
      <SaveBar playedS={playedS} exportText={() => serialize(toSaveData({ ...latest.current, playedS: played.current }))}
        onImport={loadGame} onNewGame={startNew} />
      <SaveBanners notices={notices} onDismiss={() => setNotices([])} storageError={storageError} loadError={loadError}
        unreadable={unreadable} otherTab={otherTab} onTakeOver={() => tabs.current?.takeOver()} />
      {toast && <div className="banner warn" data-testid="toast">{toast} <button className="small" onClick={() => setToast(null)}>OK</button></div>}
      <BudgetMeter cost={cost} budget={activeJob?.budgetUSD} />
      <main>
        {result && <DeliveryResult result={result} onClose={() => update({ result: null, tab: 'jobs' })} />}
        {tab === 'jobs' && !result && <LockedNote level={player.level} />}
        {tab === 'jobs' && !result && <JobBoard jobs={jobs} idx={idx} activeJob={activeJob}
          onReroll={() => update((g) => {
            // The active job stays on the board when the rest is rerolled.
            const active = g.jobs.find((j) => j.id === g.activeJobId);
            const fresh = rollBoard(catalog, g.boardSeed + 1, g.player.level);
            return { boardSeed: g.boardSeed + 1, jobs: active && !fresh.some((j) => j.id === active.id) ? [active, ...fresh] : fresh };
          })}
          onTake={(j) => update((g) => ({ ...(j.id !== g.activeJobId ? resetWork : {}), activeJobId: j.id, tab: 'shop' }))} />}
        {tab === 'shop' && <Shop tagged={tagged} build={build} onAdd={(p) => setBuild((b) => addPart(b, idx.parts.get(p.id)))} countOf={(id) => counts.get(id)}
          filters={game.shop} setFilters={(shop) => update({ shop })} />}
        {tab === 'software' && <SoftwareScreen idx={idx} catalog={catalog} software={software} setSoftware={(s) => update({ software: s })} gpuCount={build.gpus.length} />}
        {tab === 'browser' && <Browser />}
        {tab === 'datacenter' && <Datacenter catalog={catalog} idx={idx} dc={game.datacenter} money={player.money} level={player.level}
          paused={hidden} onOpen={openDc} onBuy={buyDc} />}
        {tab === 'build' && !result && <BuildScreen catalog={catalog} idx={idx} job={activeJob} build={build} setBuild={setBuild} software={software}
          run={run} broken={broken} onRunTest={runTest} onReplace={() => update({ broken: null })} onDeliver={deliver}
          onProgress={(t) => update((g) => (g.run ? { run: { ...g.run, positionS: t } } : {}))} />}
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
