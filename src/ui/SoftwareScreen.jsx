import { newInference } from './softwareState.js';
import { OSES } from '../sim/evaluate.js';
import { SERVER_SOFTWARE } from '../sim/gameserver.js';
import { CPU_TYPES, DISK_FORMATS } from '../sim/vm.js';

const OS_NAMES = { linux: 'Linux', windows: 'Windows', proxmox: 'Proxmox VE (hypervisor)' };
const FORK_NAMES = { vanilla: 'Vanilla server', optimized: 'Optimized fork' };
const CPU_TYPE_NAMES = { host: 'host (real CPU passed through)', 'x86-64-v2-AES': 'x86-64-v2-AES (default, generic)' };

function Field({ label, children }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}
const Num = ({ value, onChange, min = 0, max, step = 1, testid }) => (
  <input type="number" value={value} min={min} max={max} step={step} data-testid={testid}
    onChange={(e) => onChange(e.target.value === '' ? min : Number(e.target.value))} />
);
function Select({ value, options, onChange, names = {}, testid }) {
  return (
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} data-testid={testid}>
      {value == null && <option value="">Choose...</option>}
      {options.map((o) => <option key={o} value={o}>{names[o] ?? o}</option>)}
    </select>
  );
}

export function SoftwareScreen({ idx, catalog, software, setSoftware, gpuCount }) {
  const set = (patch) => setSoftware({ ...software, ...patch });
  return (
    <div className="apps">
      <section className="card app" data-testid="app-os">
        <h2>Operating system</h2>
        <p className="muted">Decides what software can run (see the browser page on operating systems). It does not change speed.</p>
        <Field label="Installed OS"><Select value={software.os} options={OSES} names={OS_NAMES} onChange={(os) => set({ os })} testid="os-select" /></Field>
      </section>
      <InferenceApp idx={idx} catalog={catalog} inf={software.inference} gpuCount={gpuCount} onChange={(inference) => set({ inference })} />
      <GameServerApp gs={software.gameServers[0]} onChange={(g) => set({ gameServers: g ? [g] : [] })} />
      <CloudApp cloud={software.cloud} onChange={(cloud) => set({ cloud })} />
    </div>
  );
}

function InferenceApp({ idx, catalog, inf, gpuCount, onChange }) {
  if (!inf) {
    return (
      <section className="card app" data-testid="app-inference">
        <h2>Inference server</h2>
        <p className="muted">Not installed.</p>
        <button onClick={() => onChange(newInference(idx, 'eng-kettle', catalog.models[0].id))} data-testid="inference-install">Set up an inference server</button>
      </section>
    );
  }
  const e = idx.engines.get(inf.engine);
  const model = idx.models.get(inf.model);
  const set = (patch) => onChange({ ...inf, ...patch });
  const lcpp = e.splitModes.includes('layer');
  const quants = e.weightFormats.filter((q) => model.weights[q]);
  return (
    <section className="card app" data-testid="app-inference">
      <h2>Inference server</h2>
      <div className="fields">
        <Field label="Engine"><Select value={inf.engine} options={catalog.engines.map((x) => x.id)} names={Object.fromEntries(catalog.engines.map((x) => [x.id, x.displayName]))}
          onChange={(id) => onChange(newInference(idx, id, inf.model))} testid="inf-engine" /></Field>
        <Field label="Model"><Select value={inf.model} options={catalog.models.map((m) => m.id)} names={Object.fromEntries(catalog.models.map((m) => [m.id, m.displayName]))}
          onChange={(id) => onChange(newInference(idx, inf.engine, id))} testid="inf-model" /></Field>
        <Field label="Weights (quantization)">{quants.length
          ? <Select value={inf.quant} options={quants} onChange={(quant) => set({ quant })} testid="inf-quant" />
          : <span className="bad-text">No {e.displayName} weights for this model</span>}</Field>
        <Field label="KV cache type"><Select value={inf.kvType} options={e.kvTypes} onChange={(kvType) => set({ kvType })} testid="inf-kv" /></Field>
        <Field label="Context length (tokens)"><Num value={inf.contextLength} min={512} max={model.maxContextNative} step={1024} onChange={(contextLength) => set({ contextLength })} testid="inf-ctx" /></Field>
        <Field label="Concurrent users"><Num value={inf.concurrency} min={1} onChange={(concurrency) => set({ concurrency })} testid="inf-conc" /></Field>
        {lcpp && <>
          <Field label="Split mode"><Select value={inf.splitMode} options={e.splitModes} onChange={(splitMode) => set({ splitMode })} testid="inf-split" /></Field>
          <Field label={`Layers on GPU (of ${model.layers})`}>
            <Num value={inf.gpuLayers === 'all' ? model.layers : inf.gpuLayers} min={0} max={model.layers}
              onChange={(n) => set({ gpuLayers: n >= model.layers ? 'all' : n })} testid="inf-ngl" /></Field>
          {model.moe && <Field label="MoE expert layers on CPU"><Num value={inf.cpuMoeLayers ?? 0} min={0} max={model.layers} onChange={(cpuMoeLayers) => set({ cpuMoeLayers })} testid="inf-cmoe" /></Field>}
        </>}
        {!lcpp && <>
          <Field label="Tensor parallel size"><Num value={inf.tp} min={1} max={Math.max(1, gpuCount)} onChange={(tp) => set({ tp })} testid="inf-tp" /></Field>
          <Field label="Pipeline parallel size"><Num value={inf.pp} min={1} max={Math.max(1, gpuCount)} onChange={(pp) => set({ pp })} testid="inf-pp" /></Field>
          {e.cpuOffload.includes('uva-weights') && <Field label="CPU offload per GPU (GiB)"><Num value={inf.cpuOffloadGB ?? 0} min={0} onChange={(cpuOffloadGB) => set({ cpuOffloadGB })} testid="inf-offload" /></Field>}
        </>}
      </div>
      <button className="small" onClick={() => onChange(null)}>Uninstall</button>
    </section>
  );
}

function GameServerApp({ gs, onChange }) {
  if (!gs) {
    return (
      <section className="card app" data-testid="app-gameserver">
        <h2>Game server</h2>
        <p className="muted">Not installed.</p>
        <button onClick={() => onChange({ type: 'minecraft', players: 10, viewDistance: 10, simulationDistance: 10, software: 'vanilla' })} data-testid="gs-install">Set up a game server</button>
      </section>
    );
  }
  const set = (patch) => onChange({ ...gs, ...patch });
  return (
    <section className="card app" data-testid="app-gameserver">
      <h2>Game server (block-building game)</h2>
      <div className="fields">
        <Field label="Server software"><Select value={gs.software} options={SERVER_SOFTWARE} names={FORK_NAMES} onChange={(software) => set({ software })} testid="gs-software" /></Field>
        <Field label="Player slots"><Num value={gs.players} min={1} onChange={(players) => set({ players })} testid="gs-players" /></Field>
        <Field label="view-distance (chunks)"><Num value={gs.viewDistance} min={3} max={32} onChange={(viewDistance) => set({ viewDistance })} testid="gs-view" /></Field>
        <Field label="simulation-distance (chunks)"><Num value={gs.simulationDistance} min={3} max={32} onChange={(simulationDistance) => set({ simulationDistance })} testid="gs-sim" /></Field>
      </div>
      <button className="small" onClick={() => onChange(null)}>Uninstall</button>
    </section>
  );
}

function CloudApp({ cloud, onChange }) {
  if (!cloud) {
    return (
      <section className="card app" data-testid="app-cloud">
        <h2>Virtual machines</h2>
        <p className="muted">Needs the hypervisor OS. No VMs set up.</p>
        <button onClick={() => onChange({ count: 1, vcpus: 2, ramGB: 4, diskGB: 32, cpuType: 'x86-64-v2-AES', diskFormat: 'raw' })} data-testid="vm-install">Set up VMs</button>
      </section>
    );
  }
  const set = (patch) => onChange({ ...cloud, ...patch });
  return (
    <section className="card app" data-testid="app-cloud">
      <h2>Virtual machines</h2>
      <div className="fields">
        <Field label="Number of VMs"><Num value={cloud.count} min={1} onChange={(count) => set({ count })} testid="vm-count" /></Field>
        <Field label="vCPUs per VM"><Num value={cloud.vcpus} min={1} onChange={(vcpus) => set({ vcpus })} testid="vm-vcpus" /></Field>
        <Field label="RAM per VM (GB)"><Num value={cloud.ramGB} min={1} onChange={(ramGB) => set({ ramGB })} testid="vm-ram" /></Field>
        <Field label="Disk per VM (GB)"><Num value={cloud.diskGB} min={1} onChange={(diskGB) => set({ diskGB })} testid="vm-disk" /></Field>
        <Field label="CPU type"><Select value={cloud.cpuType} options={CPU_TYPES} names={CPU_TYPE_NAMES} onChange={(cpuType) => set({ cpuType })} testid="vm-cputype" /></Field>
        <Field label="Disk format"><Select value={cloud.diskFormat} options={DISK_FORMATS} onChange={(diskFormat) => set({ diskFormat })} testid="vm-format" /></Field>
      </div>
      <button className="small" onClick={() => onChange(null)}>Remove VMs</button>
    </section>
  );
}
