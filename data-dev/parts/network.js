import { pub, est } from '../lib.js';

// Network switches. MikroTik publishes a suggested price on each product page.

export const networks = [
  {
    id: 'net-lattice-8e2s', category: 'network', tier: 'consumer',
    displayName: 'Latticenet LN-8E2S', realRef: 'MikroTik CRS310-8G+2S+IN',
    ports: [
      { count: pub(8, 'ports', 'mikrotik-crs310'), speedGbps: pub(2.5, 'Gbps', 'mikrotik-crs310'), medium: pub('rj45', '', 'mikrotik-crs310') },
      { count: pub(2, 'ports', 'mikrotik-crs310'), speedGbps: pub(10, 'Gbps', 'mikrotik-crs310'), medium: pub('sfp+', '', 'mikrotik-crs310') },
    ],
    maxPowerW: pub(34, 'W', 'mikrotik-crs310'),
    fans: pub(1, 'fans', 'mikrotik-crs310'),
    priceUSD: pub(219, 'USD', 'mikrotik-crs310'),
  },
  {
    id: 'net-lattice-8s10', category: 'network', tier: 'consumer',
    displayName: 'Latticenet LN-8S10', realRef: 'MikroTik CRS309-1G-8S+IN',
    ports: [
      { count: pub(8, 'ports', 'mikrotik-crs309'), speedGbps: pub(10, 'Gbps', 'mikrotik-crs309'), medium: pub('sfp+', '', 'mikrotik-crs309') },
      { count: pub(1, 'ports', 'mikrotik-crs309'), speedGbps: pub(1, 'Gbps', 'mikrotik-crs309'), medium: pub('rj45', '', 'mikrotik-crs309') },
    ],
    maxPowerW: pub(23, 'W', 'mikrotik-crs309'),
    fans: pub(0, 'fans', 'mikrotik-crs309', 'passive'),
    priceUSD: pub(269, 'USD', 'mikrotik-crs309'),
  },
  {
    id: 'net-lattice-24s2q', category: 'network', tier: 'server',
    displayName: 'Latticenet LN-24S2Q', realRef: 'MikroTik CRS326-24S+2Q+RM',
    ports: [
      { count: pub(24, 'ports', 'mikrotik-crs326'), speedGbps: pub(10, 'Gbps', 'mikrotik-crs326'), medium: pub('sfp+', '', 'mikrotik-crs326') },
      { count: pub(2, 'ports', 'mikrotik-crs326'), speedGbps: pub(40, 'Gbps', 'mikrotik-crs326'), medium: pub('qsfp+', '', 'mikrotik-crs326') },
    ],
    maxPowerW: pub(69, 'W', 'mikrotik-crs326'),
    fans: pub(3, 'fans', 'mikrotik-crs326'),
    rackUnits: pub(1, 'U', 'mikrotik-crs326'),
    priceUSD: pub(599, 'USD', 'mikrotik-crs326'),
  },
  {
    id: 'net-lattice-4q100', category: 'network', tier: 'server',
    displayName: 'Latticenet LN-4Q100', realRef: 'MikroTik CRS504-4XQ-IN',
    ports: [
      { count: pub(4, 'ports', 'mikrotik-crs504'), speedGbps: pub(100, 'Gbps', 'mikrotik-crs504'), medium: pub('qsfp28', '', 'mikrotik-crs504') },
    ],
    maxPowerW: pub(25, 'W', 'mikrotik-crs504', 'without attachments'),
    fans: pub(2, 'fans', 'mikrotik-crs504'),
    priceUSD: pub(799, 'USD', 'mikrotik-crs504'),
  },
  {
    id: 'net-lattice-64x100', category: 'network', tier: 'datacenter', kind: est('switch', '', 'Ethernet switch.'),
    displayName: 'Latticenet LN-64C', realRef: 'NVIDIA Spectrum-3 SN4600C',
    ports: [{ count: pub(64, 'ports', 'nv-sn4000-docs'), speedGbps: pub(100, 'Gbps', 'nv-sn4000-docs'), medium: pub('qsfp28', '', 'nv-sn4000-docs') }],
    switchingTbps: pub(6.4, 'Tbps', 'nv-sn4000-docs'),
    maxPowerW: est(466, 'W', 'Only typical power with passive cables (466 W) is published; used as the max.', 'nv-sn4000-docs'),
    fans: est(4, 'fans', 'Fan count not read; assumed for a 2U switch.'), noiseDBA: pub(67.6, 'dBA', 'nv-sn4000-docs'),
    rackUnits: pub(2, 'U', 'nv-sn4000-docs', '3.46 in high'),
    priceUSD: est(15000, 'USD', 'No price opened. Assumed for a 64-port 100GbE datacenter switch. Flagged.'),
  },
  {
    id: 'net-lattice-32x400', category: 'network', tier: 'datacenter', kind: est('switch', '', 'Ethernet switch.'),
    displayName: 'Latticenet LN-32D', realRef: 'NVIDIA Spectrum-3 SN4700',
    ports: [{ count: pub(32, 'ports', 'nv-sn4000-docs'), speedGbps: pub(400, 'Gbps', 'nv-sn4000-docs'), medium: pub('qsfp-dd', '', 'nv-sn4000-docs') }],
    switchingTbps: pub(12.8, 'Tbps', 'nv-sn4000-docs'),
    maxPowerW: est(630, 'W', 'Only typical power with passive cables (630 W) is published; used as the max.', 'nv-sn4000-docs'),
    fans: est(6, 'fans', 'Fan count not read; assumed for a 1U switch.'), noiseDBA: est(67.6, 'dBA', 'Not published for this model; assumed equal to the SN4600C (67.6 dBA) from the same manual.', 'nv-sn4000-docs'),
    rackUnits: pub(1, 'U', 'nv-sn4000-docs', '1.72 in high'),
    priceUSD: est(25000, 'USD', 'No price opened. Assumed for a 32-port 400GbE datacenter switch. Flagged.'),
  },
  {
    id: 'net-lattice-64x800', category: 'network', tier: 'datacenter', kind: est('switch', '', 'Ethernet switch.'),
    displayName: 'Latticenet LN-64X', realRef: 'NVIDIA Spectrum-4 SN5600',
    ports: [{ count: pub(64, 'ports', 'dell-sn5600'), speedGbps: pub(800, 'Gbps', 'dell-sn5600'), medium: pub('osfp', '', 'dell-sn5600') }],
    switchingTbps: pub(51.2, 'Tbps', 'dell-sn5600'),
    maxPowerW: est(940, 'W', 'Datasheet text did not include power. Search results give 940 W typical; used as the max. Page not opened for that figure.'),
    fans: pub(4, 'fans', 'dell-sn5600', 'hot-swap, N+1'), noiseDBA: est(67.6, 'dBA', 'Not found; assumed equal to the SN4600C (67.6 dBA).', 'nv-sn4000-docs'),
    rackUnits: pub(2, 'U', 'dell-sn5600'),
    priceUSD: est(60000, 'USD', 'No price opened. Assumed for a 64-port 800GbE switch. Flagged.'),
  },
  {
    id: 'net-strand-ib64', category: 'network', tier: 'datacenter', kind: est('switch', '', 'InfiniBand switch.'),
    displayName: 'Strandline SX-64 Fabric Switch', realRef: 'NVIDIA Quantum-2 QM9700',
    ports: [{ count: pub(64, 'ports', 'dell-qm9700', '64 x 400 Gb/s over 32 OSFP cages'), speedGbps: pub(400, 'Gbps', 'dell-qm9700'), medium: pub('osfp-ib', '', 'dell-qm9700') }],
    switchingTbps: pub(51.2, 'Tbps', 'dell-qm9700', 'aggregate bidirectional'),
    maxPowerW: est(747, 'W', 'Datasheet text did not include power. Search results give 747 W typical with passive cables (max 1,720 W with active optics); typical used. Page not opened for that figure.'),
    fans: pub(7, 'fans', 'dell-qm9700', '6+1 hot-swap fan units'), noiseDBA: est(67.6, 'dBA', 'Not found; assumed equal to the SN4600C (67.6 dBA).', 'nv-sn4000-docs'),
    rackUnits: pub(1, 'U', 'dell-qm9700'),
    priceUSD: est(35000, 'USD', 'No price opened. Assumed for a 64-port 400G InfiniBand switch. Flagged.'),
  },
  {
    id: 'net-strand-nic400', category: 'network', tier: 'datacenter', kind: est('nic', '', 'Host adapter card, one per GPU in scale-out nodes.'),
    displayName: 'Strandline HX-400 Adapter', realRef: 'NVIDIA ConnectX-7 400G single-port OSFP',
    ports: [{ count: est(1, 'ports', 'Single-port model (DGX H100 uses "8 x ConnectX-7 Single Port").', 'nv-dgxh100-docs'), speedGbps: est(400, 'Gbps', 'DGX H100 guide: up to 400 Gbps InfiniBand per card.', 'nv-dgxh100-docs'), medium: est('osfp-ib', '', 'OSFP InfiniBand/Ethernet.') }],
    maxPowerW: est(25.9, 'W', 'Search results give ~24.4-25.9 W for the single-port 400G card; upper value used. Page not opened.'),
    fans: est(0, 'fans', 'Passive card cooled by the server airflow.'),
    priceUSD: est(2000, 'USD', 'No price opened. Assumed for a 400G adapter. Flagged.'),
  },
];
