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

// 230 V internal REDUNDANT minimums (server PSU modules run from 200-240 V).
const TITANIUM_230R = [
  { loadPct: pub(10, '%', 'wiki-80plus'), eff: pub(0.90, 'fraction', 'wiki-80plus') },
  { loadPct: pub(20, '%', 'wiki-80plus'), eff: pub(0.94, 'fraction', 'wiki-80plus') },
  { loadPct: pub(50, '%', 'wiki-80plus'), eff: pub(0.96, 'fraction', 'wiki-80plus') },
  { loadPct: pub(100, '%', 'wiki-80plus'), eff: pub(0.91, 'fraction', 'wiki-80plus') },
];
const PLATINUM_230R = [
  { loadPct: pub(10, '%', 'wiki-80plus'), eff: pub(0.88, 'fraction', 'wiki-80plus') },
  { loadPct: pub(20, '%', 'wiki-80plus'), eff: pub(0.90, 'fraction', 'wiki-80plus') },
  { loadPct: pub(50, '%', 'wiki-80plus'), eff: pub(0.94, 'fraction', 'wiki-80plus') },
  { loadPct: pub(100, '%', 'wiki-80plus'), eff: pub(0.91, 'fraction', 'wiki-80plus') },
];
const MODULE = est('module', '', 'Hot-swap server PSU module: goes into a node PSU bay; several share the load.');
const MOD_MTBF = est(250000, 'h', 'MTBF not found on an opened page. Assumed higher than desktop units (100,000 h assumed) because hot-swap server modules are built for continuous duty. Flagged.');

const PSU_FAN_NOTE = 'PSU fan noise not modeled separately yet: counted as part of the chassis airflow.';

export const psus = [
  {
    id: 'psu-voltaic-g650', category: 'psu', tier: 'consumer',
    displayName: 'Voltaic G650', realRef: 'Corsair RM650e (2025)',
    ratedW: pub(650, 'W', 'wiki-80plus', 'Rated wattage from model name'),
    rating: est('80plus-gold', '', 'Listed as Cybenetics Gold in a search result; the 80 PLUS Gold tier minimums are used for the curve.'),
    efficiencyCurve: GOLD_115, formFactor: est('atx', '', 'Desktop ATX power supply.'),
    mtbfHours: est(100000, 'h', 'MTBF not found on an opened page; assumed. ' + PSU_FAN_NOTE),
    priceUSD: est(105, 'USD', 'Search results (pages not opened) put US pricing around $104.99 in 2026.'),
  },
  {
    id: 'psu-voltaic-g850', category: 'psu', tier: 'consumer',
    displayName: 'Voltaic G850', realRef: 'Corsair RM850e (2025)',
    ratedW: pub(850, 'W', 'wiki-80plus', 'Rated wattage from model name'),
    rating: est('80plus-gold', '', 'ATX 3.1 Gold unit per search listings; 80 PLUS Gold tier minimums used.'),
    efficiencyCurve: GOLD_115, formFactor: est('atx', '', 'Desktop ATX power supply.'),
    mtbfHours: est(100000, 'h', 'MTBF not found on an opened page; assumed.'),
    priceUSD: est(95, 'USD', 'Search results (pages not opened) show $94.99 at Amazon in 2026.'),
  },
  {
    id: 'psu-voltaic-p1000', category: 'psu', tier: 'consumer',
    displayName: 'Voltaic P1000', realRef: 'Corsair HX1000i',
    ratedW: pub(1000, 'W', 'wiki-80plus', 'Rated wattage from model name'),
    rating: est('80plus-platinum', '', 'Listed as 80 PLUS Platinum in search results; tier minimums used.'),
    efficiencyCurve: PLATINUM_115, formFactor: est('atx', '', 'Desktop ATX power supply.'),
    mtbfHours: est(100000, 'h', 'MTBF not found on an opened page; assumed.'),
    priceUSD: est(220, 'USD', 'Search results (pages not opened) show $219.99 promotional and EUR 222-250 in 2026.'),
  },
  {
    id: 'psu-voltaic-t1600', category: 'psu', tier: 'workstation',
    displayName: 'Voltaic T1600', realRef: 'Corsair AX1600i',
    ratedW: pub(1600, 'W', 'wiki-80plus', 'Rated wattage from model name'),
    rating: est('80plus-titanium', '', '80 PLUS Titanium per search results; tier minimums used.'),
    efficiencyCurve: TITANIUM_115, formFactor: est('atx', '', 'Desktop ATX power supply.'),
    mtbfHours: est(100000, 'h', 'MTBF not found on an opened page; assumed.'),
    priceUSD: est(550, 'USD', 'Search results (pages not opened) show EUR 469-580 in 2026; converted and rounded.'),
  },
  {
    id: 'psu-voltaic-m3000t', category: 'psu', tier: 'datacenter',
    displayName: 'Voltaic M3000T module', realRef: 'Supermicro 3000W Titanium redundant PSU (AS-8125GS-TNMR2)',
    ratedW: pub(3000, 'W', 'smc-as8125'), rating: pub('80plus-titanium', '', 'smc-as8125', 'Titanium Level (96%)'),
    efficiencyCurve: TITANIUM_230R, formFactor: MODULE, mtbfHours: MOD_MTBF,
    priceUSD: est(900, 'USD', 'No price opened. Assumed for a 3 kW Titanium hot-swap module. Flagged.'),
  },
  {
    id: 'psu-voltaic-m3300', category: 'psu', tier: 'datacenter',
    displayName: 'Voltaic M3300 module', realRef: 'NVIDIA DGX H100/B200 3.3 kW PSU',
    ratedW: pub(3300, 'W', 'nv-dgxh100-docs', '3.3 kW each'),
    rating: est('80plus-platinum', '', 'Efficiency level not stated in the DGX guides; 80 PLUS Platinum 230 V redundant minimums assumed. Flagged.'),
    efficiencyCurve: PLATINUM_230R, formFactor: MODULE, mtbfHours: MOD_MTBF,
    priceUSD: est(1000, 'USD', 'No price opened. Assumed for a 3.3 kW hot-swap module. Flagged.'),
  },
  {
    id: 'psu-voltaic-m3200', category: 'psu', tier: 'datacenter',
    displayName: 'Voltaic M3200 module', realRef: 'NVIDIA DGX B300 3.2 kW PSU',
    ratedW: pub(3200, 'W', 'nv-dgxb300-docs', '12 x 3.2 kW'),
    rating: est('80plus-titanium', '', 'Efficiency level not stated in the DGX B300 guide; Titanium 230 V redundant minimums assumed for a 2025 design. Flagged.'),
    efficiencyCurve: TITANIUM_230R, formFactor: MODULE, mtbfHours: MOD_MTBF,
    priceUSD: est(1000, 'USD', 'No price opened. Assumed for a 3.2 kW hot-swap module. Flagged.'),
  },
  {
    id: 'psu-voltaic-m6600t', category: 'psu', tier: 'datacenter',
    displayName: 'Voltaic M6600T module', realRef: 'Supermicro 6600W Titanium redundant PSU (AS-A126GS-TNMR)',
    ratedW: pub(6600, 'W', 'smc-a126'), rating: pub('80plus-titanium', '', 'smc-a126', 'Titanium (96%)'),
    efficiencyCurve: TITANIUM_230R, formFactor: MODULE, mtbfHours: MOD_MTBF,
    priceUSD: est(1800, 'USD', 'No price opened. Assumed roughly twice the 3 kW module. Flagged.'),
  },
];
