// Game-side data access. The game imports ONLY the generated file, which has
// fake names and generic source labels (see scripts/build-game-data.js).
import gameData from '../generated/game-data.json';
import { resolve } from './build.js';

// Tagged form: every value is { value, unit, tag, sourceLabel } for the
// "where this number comes from" display.
export const tagged = gameData;

// Plain form for the simulation.
export const catalog = resolve(gameData);
