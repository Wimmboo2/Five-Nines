import { pub, est } from '../lib.js';

// Memory. Prices reflect the 2026 DRAM shortage described by the price sources.
// perModuleGB is the capacity of one DIMM; a kit lists moduleCount > 1.

const UDIMM_POWER = est(5, 'W', 'Per-DIMM power under load not found on an opened page; assumed for a DDR5 UDIMM.');
const RDIMM_DDR5_POWER = est(10, 'W', 'Per-DIMM power under load not found on an opened page; assumed for a DDR5 RDIMM (registered clock driver + PMIC on module).');
const RDIMM_DDR4_POWER = est(6, 'W', 'Per-DIMM power under load not found on an opened page; assumed for a DDR4 RDIMM.');

export const rams = [
  {
    id: 'ram-sprint-2x16-d5', category: 'ram', tier: 'consumer',
    displayName: 'Mnemo Sprint 32 (2x16) D5-6000', realRef: 'Generic: DDR5-6000 CL30 2x16GB kit (price tracker basket, no single brand)',
    type: pub('DDR5', '', 'price-cc-ddr5'), speedMTs: pub(6000, 'MT/s', 'price-cc-ddr5'),
    moduleCount: pub(2, 'modules', 'price-cc-ddr5'), perModuleGB: pub(16, 'GB', 'price-cc-ddr5'),
    ecc: est(false, 'bool', 'Consumer non-ECC kit.'), registered: est(false, 'bool', 'Consumer desktop kits are unbuffered DIMMs (UDIMM).'),
    powerPerModuleW: UDIMM_POWER,
    priceUSD: pub(429, 'USD', 'price-cc-ddr5', 'Low end of tracked 32GB DDR5-6000 CL30 kits, 2026-09-26'),
  },
  {
    id: 'ram-sprint-2x32-d5', category: 'ram', tier: 'consumer',
    displayName: 'Mnemo Sprint 64 (2x32) D5-6000', realRef: 'Generic: DDR5-6000 2x32GB kit (price tracker median, no single brand)',
    type: pub('DDR5', '', 'price-cc-ddr5'), speedMTs: pub(6000, 'MT/s', 'price-cc-ddr5'),
    moduleCount: pub(2, 'modules', 'price-cc-ddr5'), perModuleGB: pub(32, 'GB', 'price-cc-ddr5'),
    ecc: est(false, 'bool', 'Consumer non-ECC kit.'), registered: est(false, 'bool', 'Consumer desktop kits are unbuffered DIMMs (UDIMM).'),
    powerPerModuleW: UDIMM_POWER,
    priceUSD: pub(1099, 'USD', 'price-cc-ddr5', 'Median 64GB kit price, 2026-09-26'),
  },
  {
    id: 'ram-rack-32-d5-5600', category: 'ram', tier: 'server',
    displayName: 'Mnemo Rack 32 D5-5600 ECC-R', realRef: 'Kingston KSM56R46BD8PMI 32GB DDR5-5600 ECC RDIMM',
    type: pub('DDR5', '', 'price-dcd-ddr5-32'), speedMTs: pub(5600, 'MT/s', 'price-dcd-ddr5-32'),
    moduleCount: pub(1, 'modules', 'price-dcd-ddr5-32'), perModuleGB: pub(32, 'GB', 'price-dcd-ddr5-32'),
    ecc: pub(true, 'bool', 'price-dcd-ddr5-32'), registered: pub(true, 'bool', 'price-dcd-ddr5-32'),
    powerPerModuleW: RDIMM_DDR5_POWER,
    priceUSD: pub(999.99, 'USD', 'price-dcd-ddr5-32'),
  },
  {
    id: 'ram-rack-64-d5-5600', category: 'ram', tier: 'server',
    displayName: 'Mnemo Rack 64 D5-5600 ECC-R', realRef: 'Micron MTC40F2046S1RC56BD2 64GB DDR5-5600 ECC RDIMM',
    type: pub('DDR5', '', 'price-dcd-ddr5-64'), speedMTs: pub(5600, 'MT/s', 'price-dcd-ddr5-64'),
    moduleCount: pub(1, 'modules', 'price-dcd-ddr5-64'), perModuleGB: pub(64, 'GB', 'price-dcd-ddr5-64'),
    ecc: pub(true, 'bool', 'price-dcd-ddr5-64'), registered: pub(true, 'bool', 'price-dcd-ddr5-64'),
    powerPerModuleW: RDIMM_DDR5_POWER,
    priceUSD: pub(2952.99, 'USD', 'price-dcd-ddr5-64'),
  },
  {
    id: 'ram-rack-64-d5-6400', category: 'ram', tier: 'server',
    displayName: 'Mnemo Rack 64 D5-6400 ECC-R', realRef: 'A-Tech 64GB DDR5-6400 ECC RDIMM',
    type: pub('DDR5', '', 'price-dcd-ddr5-64'), speedMTs: pub(6400, 'MT/s', 'price-dcd-ddr5-64'),
    moduleCount: pub(1, 'modules', 'price-dcd-ddr5-64'), perModuleGB: pub(64, 'GB', 'price-dcd-ddr5-64'),
    ecc: pub(true, 'bool', 'price-dcd-ddr5-64'), registered: pub(true, 'bool', 'price-dcd-ddr5-64'),
    powerPerModuleW: RDIMM_DDR5_POWER,
    priceUSD: pub(2975.65, 'USD', 'price-dcd-ddr5-64'),
  },
  {
    id: 'ram-rack-32-d4-2933', category: 'ram', tier: 'server',
    displayName: 'Mnemo Rack 32 D4-2933 ECC-R', realRef: 'Generic: DDR4-2933 32GB ECC RDIMM (price tracker, cheapest listing)',
    type: pub('DDR4', '', 'price-dcd-ddr4-32'), speedMTs: pub(2933, 'MT/s', 'price-dcd-ddr4-32'),
    moduleCount: pub(1, 'modules', 'price-dcd-ddr4-32'), perModuleGB: pub(32, 'GB', 'price-dcd-ddr4-32'),
    ecc: pub(true, 'bool', 'price-dcd-ddr4-32'), registered: pub(true, 'bool', 'price-dcd-ddr4-32'),
    powerPerModuleW: RDIMM_DDR4_POWER,
    priceUSD: est(286, 'USD', '$8.95/GB lowest DDR4-2933 listing x 32 GB (datacenterdisk, 2026-09-30).', 'price-dcd-ddr4-32'),
  },
];
