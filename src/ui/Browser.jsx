import { useState } from 'react';
import { PAGES, searchPages } from '../content/pages.js';

export function Browser() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const page = PAGES.find((p) => p.id === open);
  const results = searchPages(q);
  return (
    <div className="card browser" data-testid="browser">
      <div className="browser-bar">
        <button className="small" onClick={() => setOpen(null)} disabled={!page}>Back</button>
        <input value={q} placeholder="Search guides" data-testid="browser-search"
          onChange={(e) => { setQ(e.target.value); setOpen(null); }} />
      </div>
      {!page && (
        <ul className="results-list">
          {results.map((p) => <li key={p.id}><a href="#" onClick={(e) => { e.preventDefault(); setOpen(p.id); }}>{p.title}</a></li>)}
          {!results.length && <li className="muted">No pages match.</li>}
        </ul>
      )}
      {page && (
        <article data-testid={`page-${page.id}`}>
          <h2>{page.title}</h2>
          {page.body.map((para, i) => <p key={i}>{para}</p>)}
          <p className="muted small-print">Sources: {page.sources.join(', ')}</p>
        </article>
      )}
    </div>
  );
}
