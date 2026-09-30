import { pub, meas, est } from '../lib.js';

// Fans and CPU coolers.
//
// Fan noise: ARCTIC publishes loudness in sone. The sim converts sone to an
// approximate dB(A) with phon = 40 + 10*log2(sone), the standard sone/phon
// relation; treating phon as dB(A) is an approximation (estimate, flagged).
//
// Fan life: ARCTIC's MTTF report (P9 Max, representative model) gives
// L10 = 30,000 h at 40 C, MTTF ~= 7 x L10, and acceleration AF = 2^((Ts-Tu)/10).

const ARCTIC_LIFE = {
  l10Hours40C: pub(30000, 'h', 'arctic-mttf-p9max', 'Representative model P9 Max; applied to other ARCTIC fans'),
  mttfHours40C: pub(210000, 'h', 'arctic-mttf-p9max'),
};

export const fans = [
  {
    id: 'fan-sirocco-12q', category: 'fan', tier: 'consumer',
    displayName: 'Sirocco S12 Quiet', realRef: 'ARCTIC P12 PWM PST',
    sizeMm: pub(120, 'mm', 'arctic-p12pst'),
    minRpm: pub(200, 'rpm', 'arctic-p12pst'), maxRpm: pub(1800, 'rpm', 'arctic-p12pst'),
    maxAirflowCFM: pub(56.3, 'CFM', 'arctic-p12pst'),
    maxStaticPressureMmH2O: pub(2.2, 'mmH2O', 'arctic-p12pst'),
    maxNoiseSone: pub(0.3, 'sone', 'arctic-p12pst'),
    maxPowerW: pub(1.2, 'W', 'arctic-p12pst', '0.1 A x 12 V'),
    ...ARCTIC_LIFE,
    priceUSD: est(8, 'USD', 'Price not shown on the product page; assumed for a single 120 mm fan.'),
  },
  {
    id: 'fan-sirocco-12m', category: 'fan', tier: 'consumer',
    displayName: 'Sirocco S12 Max', realRef: 'ARCTIC P12 Max',
    sizeMm: pub(120, 'mm', 'arctic-p12max'),
    minRpm: pub(400, 'rpm', 'arctic-p12max'), maxRpm: pub(3300, 'rpm', 'arctic-p12max'),
    maxAirflowCFM: pub(81.04, 'CFM', 'arctic-p12max'),
    maxStaticPressureMmH2O: pub(4.35, 'mmH2O', 'arctic-p12max'),
    maxNoiseSone: pub(0.6, 'sone', 'arctic-p12max'),
    maxPowerW: pub(3.48, 'W', 'arctic-p12max', '0.29 A x 12 V'),
    ...ARCTIC_LIFE,
    priceUSD: est(12, 'USD', 'Price not shown on the product page; assumed.'),
  },
];

// CPU coolers. thermalResistanceCW is the measured CPU-sensor temperature rise
// over ambient divided by the heat load, from GamersNexus's test benches.
// It includes that test CPU's own die-to-heatspreader resistance.
export const coolers = [
  {
    id: 'clr-frostline-d2', category: 'cooler', tier: 'consumer',
    displayName: 'Frostline Tower D2', realRef: 'Noctua NH-D15 G2 (LBC)',
    type: meas('air-tower', '', 'gn-nhd15g2'),
    thermalResistanceCW: meas(52.5 / 200, 'C/W', 'gn-nhd15g2', '52.5 C over ambient at 200 W, AMD 3950X bench, 100% fan speed'),
    thermalResistanceQuietCW: meas(55 / 200, 'C/W', 'gn-nhd15g2', '55 C over ambient at 200 W, noise-normalized to 35 dBA'),
    noiseAtQuietDBA: meas(35, 'dBA', 'gn-nhd15g2', 'noise-normalized level used in the review'),
    noiseMaxDBA: est(40, 'dBA', 'Full-speed noise for the NH-D15 G2 not read from the review; assumed near the AIO full-speed figure (39.8 dBA).'),
    fanCount: est(2, 'fans', 'Dual-fan tower cooler.'),
    socketSupport: est(['AM5'], '', 'Consumer socket only; server/workstation sockets need a separate SKU.'),
    priceUSD: est(150, 'USD', 'Tom\'s Hardware review title "Not worth $150" (search result, page not opened).'),
  },
  {
    id: 'clr-frostline-loop360', category: 'cooler', tier: 'consumer',
    displayName: 'Frostline Loop 360', realRef: 'ARCTIC Liquid Freezer III 360',
    type: meas('aio-360', '', 'gn-nhd15g2'),
    thermalResistanceCW: meas(45 / 200, 'C/W', 'gn-nhd15g2', '45 C over ambient at 200 W, AMD bench, 100% fans (39.8 dBA)'),
    thermalResistanceQuietCW: meas(47.3 / 200, 'C/W', 'gn-nhd15g2', '47.3 C over ambient at 200 W, noise-normalized to 35 dBA'),
    noiseAtQuietDBA: meas(35, 'dBA', 'gn-nhd15g2'),
    noiseMaxDBA: meas(39.8, 'dBA', 'gn-nhd15g2'),
    fanCount: est(3, 'fans', '360 mm radiator with three 120 mm fans.'),
    socketSupport: est(['AM5'], '', 'Consumer socket only in this catalog.'),
    priceUSD: est(110, 'USD', 'Price not collected on an opened page; assumed.'),
  },
];
