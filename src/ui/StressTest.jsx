import { useEffect, useState } from 'react';
import { num } from './format.js';

// Plays a finished stress-test run at 60x: one sample per simulated minute,
// one sample per real second (user decision). Skip jumps to the end.
export const PLAYBACK_MS_PER_SAMPLE = 1000;

const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export function StressTest({ run, onDone, onProgress }) {
  const samples = run.result.samples;
  // Resume from the saved simulated time after a reload.
  const [i, setI] = useState(() => Math.max(0, samples.findIndex((s) => s.t >= (run.positionS ?? 0))));
  const done = i >= samples.length - 1;
  useEffect(() => {
    if (done) { onDone?.(); return undefined; }
    const h = setTimeout(() => setI((x) => x + 1), PLAYBACK_MS_PER_SAMPLE);
    return () => clearTimeout(h);
  }, [i, done]);
  useEffect(() => { if (samples[i]) onProgress?.(samples[i].t); }, [i]);
  const s = samples[Math.min(i, samples.length - 1)];
  if (!s) return <p className="bad-text" data-testid="stress-failed">{run.result.failure?.message}</p>;
  const throttled = s.throttle.some((p) => p < 0.999);
  return (
    <div className="stress" data-testid="stress-test">
      <div className="stress-head">
        <b>Simulated time {clock(s.t)} / 60:00</b>
        {!done && <button className="small" onClick={() => setI(samples.length - 1)} data-testid="stress-skip">Skip</button>}
      </div>
      <progress max={3600} value={s.t} />
      <ul className="kv gauges">
        <li><span>Wall power</span><b>{num(s.wallW)} W</b></li>
        <li><span>Room</span><b>{num(s.roomC, 1)} C</b></li>
        <li><span>Case inlet</span><b>{num(s.caseInletC, 1)} C</b></li>
        {s.gpuC.map((c, k) => <li key={k}><span>GPU {k}</span><b>{num(c, 1)} C{s.throttle[k] < 0.999 ? ` (throttled to ${Math.round(s.throttle[k] * 100)}%)` : ''}</b></li>)}
        {s.cpuC != null && <li><span>CPU</span><b>{num(s.cpuC, 1)} C</b></li>}
        <li><span>Noise at listener</span><b>{num(s.noiseDBA, 1)} dBA</b></li>
        {s.tokS != null && <li><span>Speed per user</span><b>{num(s.tokS, 1)} tok/s</b></li>}
        <li><span>Throttling</span><b>{throttled ? 'yes' : 'no'}</b></li>
      </ul>
      {done && (run.result.completed
        ? <p className="ok-text" data-testid="stress-passed">Passed: one simulated hour with no failure.</p>
        : <p className="bad-text" data-testid="stress-failed">Stopped at {clock(run.result.failedAtS)}: {run.result.failure.message}</p>)}
    </div>
  );
}
