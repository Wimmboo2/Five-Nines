// One tagged value: the number, its unit, and the generic "where this number
// comes from" label. Estimates are marked so the player can tell.
export function Tagged({ v, digits }) {
  if (v == null) return <span className="muted">-</span>;
  if (typeof v !== 'object' || !('value' in v)) return <span>{String(v)}</span>;
  let shown = v.value;
  if (typeof shown === 'number') shown = shown.toLocaleString('en-US', { maximumFractionDigits: digits ?? 2 });
  else if (typeof shown === 'boolean') shown = shown ? 'yes' : 'no';
  else if (Array.isArray(shown)) shown = shown.join(', ');
  return (
    <span className={`tv tag-${v.tag}`} title={`${v.sourceLabel} (${v.tag})`}>
      {shown}{v.unit && typeof v.value === 'number' ? ` ${v.unit}` : ''}
      <span className="src">{v.tag === 'estimate' ? 'estimate' : v.sourceLabel}</span>
    </span>
  );
}
