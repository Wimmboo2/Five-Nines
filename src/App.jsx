import { catalog } from './data/index.js';

// Placeholder shell. The game UI starts in stage 5; stages 1-3 build the data
// layer and the simulation engine underneath it. The part counts below come
// from the shipped catalog, so the real data is in the bundle and the dist
// brand check scans it.
export default function App() {
  const counts = Object.entries(catalog.parts).map(([k, v]) => `${v.length} ${k}`);
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <h1>Five Nines</h1>
      <p>Simulation engine in development. No playable UI yet.</p>
      <p>Catalog: {counts.join(', ')}; {catalog.models.length} models; {catalog.engines.length} engines.</p>
    </main>
  );
}
