import { pub } from '../lib.js';

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
];
