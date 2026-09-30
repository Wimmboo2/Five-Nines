// Validates data-dev and writes src/generated/game-data.json (the only data
// the game imports). Exits non-zero on any validation error.

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, validateAll, buildAndCheck } from './dev-data.js';

const devErrors = validateAll();
if (devErrors.length) {
  console.error(`data-dev validation failed (${devErrors.length} errors):`);
  for (const e of devErrors) console.error('  - ' + e);
  process.exit(1);
}

const { game, errors } = buildAndCheck();
if (errors.length) {
  console.error(`shipped data check failed (${errors.length} errors):`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}

const out = path.join(ROOT, 'src/generated/game-data.json');
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(game, null, 1));
console.log(`game data written: ${path.relative(ROOT, out)}`);
