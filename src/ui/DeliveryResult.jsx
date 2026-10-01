import { usd, num } from './format.js';

const AXES = ['performance', 'budget', 'power', 'noise', 'temperature'];

export function DeliveryResult({ result, onClose }) {
  const { job, score, earned, levelUp, player } = result;
  return (
    <section className="card result" data-testid="delivery-result">
      <h2>Delivered: {job.client.name}</h2>
      <p>Client is <b data-testid="satisfaction">{score.satisfaction}</b>. Score <b data-testid="score">{num(score.score, 1)}</b> / 100.</p>
      <table className="parts-table">
        <thead><tr><th>Axis</th><th>Weight</th><th>Score</th></tr></thead>
        <tbody>
          {AXES.filter((a) => score.axes[a] != null).map((a) => (
            <tr key={a}><td>{a}</td><td>{score.weights[a]}%</td><td>{num(score.axes[a], 1)}</td></tr>
          ))}
        </tbody>
      </table>
      <p>Bonus: +{num(score.bonus.total * 100, 1)}% (budget {num(score.bonus.budget * 100, 1)}%, power {num(score.bonus.power * 100, 1)}%).</p>
      {earned.penalty > 0 && <p className="bad-text" data-testid="angry-penalty">The client is angry: on hard that costs you {usd(earned.penalty)} (15% of your money).</p>}
      <p>Paid <b data-testid="earned-money">{usd(earned.money)}</b> and <b data-testid="earned-xp">{earned.xp} xp</b>.{levelUp ? <b> Level up: now level {levelUp}!</b> : ''}</p>
      <p className="muted">Total: {usd(player.money)}, {player.xp} xp, level {player.level}.</p>
      <button onClick={onClose} data-testid="result-close">Back to the job board</button>
    </section>
  );
}
