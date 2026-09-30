import { pub, est } from '../lib.js';

// Power supplies. Efficiency points are the 80 PLUS tier MINIMUMS
// (115 V internal non-redundant), not a specific unit's measured curve.
// Real units usually beat these; that is flagged in the report.

const GOLD_115 = [
  { loadPct: pub(20, '%', 'wiki-80plus'), eff: pub(0.87, 'fraction', 'wiki-80plus') },
  { loadPct: pub(50, '%', 'wiki-80plus'), eff: pub(0.90, 'fraction', 'wiki-80plus') },
  { loadPct: pub(100, '%', 'wiki-80plus'), eff: pub(0.87, 'fraction', 'wiki-80plus') },
];
const PLATINUM_115 = [
  { loadPct: pub(20, '%', 'wiki-80plus'), eff: pub(0.90, 'fraction', 'wiki-80plus') },
  { loadPct: pub(50, '%', 'wiki-80plus'), eff: pub(0.92, 'fraction', 'wiki-80plus') },
  { loadPct: pub(100, '%', 'wiki-80plus'), eff: pub(0.89, 'fraction', 'wiki-80plus') },
];
const TITANIUM_115 = [
  { loadPct: pub(10, '%', 'wiki-80plus'), eff: pub(0.90, 'fraction', 'wiki-80plus') },
  { loadPct: pub(20, '%', 'wiki-80plus'), eff: pub(0.92, 'fraction', 'wiki-80plus') },
  { loadPct: pub(50, '%', 'wiki-80plus'), eff: pub(0.94, 'fraction', 'wiki-80plus') },
  { loadPct: pub(100, '%', 'wiki-80plus'), eff: pub(0.90, 'fraction', 'wiki-80plus') },
];

const PSU_FAN_NOTE = 'PSU fan noise not modeled separately yet: counted as part of the chassis airflow.';

export const psus = [
  {
    id: 'psu-voltaic-g650', category: 'psu', tier: 'consumer',
    displayName: 'Voltaic G650', realRef: 'Corsair RM650e (2025)',
    ratedW: pub(650, 'W', 'wiki-80plus', 'Rated wattage from model name'),
    rating: est('80plus-gold', '', 'Listed as Cybenetics Gold in a search result; the 80 PLUS Gold tier minimums are used for the curve.'),
    efficiencyCurve: GOLD_115,
    mtbfHours: est(100000, 'h', 'MTBF not found on an opened page; assumed. ' + PSU_FAN_NOTE),
    priceUSD: est(105, 'USD', 'Search results (pages not opened) put US pricing around $104.99 in 2026.'),
  },
  {
    id: 'psu-voltaic-g850', category: 'psu', tier: 'consumer',
    displayName: 'Voltaic G850', realRef: 'Corsair RM850e (2025)',
    ratedW: pub(850, 'W', 'wiki-80plus', 'Rated wattage from model name'),
    rating: est('80plus-gold', '', 'ATX 3.1 Gold unit per search listings; 80 PLUS Gold tier minimums used.'),
    efficiencyCurve: GOLD_115,
    mtbfHours: est(100000, 'h', 'MTBF not found on an opened page; assumed.'),
    priceUSD: est(95, 'USD', 'Search results (pages not opened) show $94.99 at Amazon in 2026.'),
  },
  {
    id: 'psu-voltaic-p1000', category: 'psu', tier: 'consumer',
    displayName: 'Voltaic P1000', realRef: 'Corsair HX1000i',
    ratedW: pub(1000, 'W', 'wiki-80plus', 'Rated wattage from model name'),
    rating: est('80plus-platinum', '', 'Listed as 80 PLUS Platinum in search results; tier minimums used.'),
    efficiencyCurve: PLATINUM_115,
    mtbfHours: est(100000, 'h', 'MTBF not found on an opened page; assumed.'),
    priceUSD: est(220, 'USD', 'Search results (pages not opened) show $219.99 promotional and EUR 222-250 in 2026.'),
  },
  {
    id: 'psu-voltaic-t1600', category: 'psu', tier: 'workstation',
    displayName: 'Voltaic T1600', realRef: 'Corsair AX1600i',
    ratedW: pub(1600, 'W', 'wiki-80plus', 'Rated wattage from model name'),
    rating: est('80plus-titanium', '', '80 PLUS Titanium per search results; tier minimums used.'),
    efficiencyCurve: TITANIUM_115,
    mtbfHours: est(100000, 'h', 'MTBF not found on an opened page; assumed.'),
    priceUSD: est(550, 'USD', 'Search results (pages not opened) show EUR 469-580 in 2026; converted and rounded.'),
  },
];
