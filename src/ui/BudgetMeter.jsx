import { usd } from './format.js';

export function BudgetMeter({ cost, budget }) {
  const frac = budget ? cost / budget : 0;
  const cls = frac > 1 ? 'over' : frac > 0.9 ? 'near' : 'ok';
  return (
    <div className={`budget ${cls}`} data-testid="budget-meter">
      <div className="label">
        <span>Build cost {usd(cost)}</span>
        <span>{budget ? `Budget ${usd(budget)} · ${frac > 1 ? usd(cost - budget) + ' over' : usd(budget - cost) + ' left'}` : 'No active job'}</span>
      </div>
      <div className="track"><div className="fill" style={{ width: `${Math.min(100, frac * 100)}%` }} /></div>
    </div>
  );
}
