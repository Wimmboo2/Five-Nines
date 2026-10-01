import { pub, est } from '../lib.js';

// CPUs. displayName values are PROPOSED fake brand names, pending user approval.
//
// ipcFactor is relative to Zen 2 = 1.00, chained from AMD's own IPC claims:
//   Zen 3 = +19% over Zen 2 (wiki-zen3), Zen 4 = +13% over Zen 3 (wiki-zen4),
//   Zen 5 = +16% over Zen 4 (reg-zen5). Zen 5 = 1.19 * 1.13 * 1.16 = 1.560.
// Single-thread benchmark databases (Geekbench, PassMark) returned HTTP 403, so
// single-thread speed in the sim is boost clock x ipcFactor: an estimate.

const ZEN5_IPC = est(1.19 * 1.13 * 1.16, 'x Zen 2', 'Chained AMD IPC claims: Zen 3 +19% (wiki-zen3), Zen 4 +13% (wiki-zen4), Zen 5 +16% (reg-zen5).');
const ZEN2_IPC = est(1.0, 'x Zen 2', 'Reference architecture for the IPC chain.');

const RYZEN_IDLE = est(25, 'W', 'No idle package power found on an opened page; assumed for a desktop AM5 CPU.');
const TJMAX_ASSUMED = est(95, 'C', 'AMD Tjmax not found on an opened page (AMD site returned 503); 95 C assumed.');

export const cpus = [
  {
    id: 'cpu-vela-8', category: 'cpu', tier: 'consumer',
    displayName: 'Orrin Vela 8', realRef: 'AMD Ryzen 7 9700X',
    maxSockets: est(1, 'sockets', 'Desktop socket AM5 platform: one CPU per board.'),
    arch: pub('zen5', '', 'wiki-ryzen-list'),
    cores: pub(8, 'cores', 'wiki-ryzen-list'), threads: pub(16, 'threads', 'wiki-ryzen-list'),
    baseClockGHz: pub(3.8, 'GHz', 'wiki-ryzen-list'), boostClockGHz: pub(5.5, 'GHz', 'wiki-ryzen-list'),
    l3MB: pub(32, 'MB', 'wiki-ryzen-list'), tdpW: pub(65, 'W', 'wiki-ryzen-list'),
    memType: pub('DDR5', '', 'wiki-ryzen-list'), memChannels: pub(2, 'channels', 'wiki-ryzen-list'),
    memMaxMTs: pub(5600, 'MT/s', 'wiki-ryzen-list', 'DDR5-5600 in 2x1R/2x2R configuration'),
    memMaxMTsTwoPerChannel: pub(3600, 'MT/s', 'wiki-ryzen-list', '"only DDR5-3600 for 4x1R and 4x2R"'),
    eccSupport: est(false, 'bool', 'Consumer platform; ECC UDIMM support depends on the motherboard and is not modeled.'),
    pcieGen: pub(5, '', 'wiki-ryzen-list'), pcieLanes: pub(24, 'lanes', 'wiki-ryzen-list', '28 total, 4 reserved for the chipset link'),
    ipcFactor: ZEN5_IPC, idlePowerW: RYZEN_IDLE, tjMaxC: TJMAX_ASSUMED,
    priceUSD: pub(359, 'USD', 'wiki-ryzen-list', 'Launch MSRP (Aug 2024); no Sept 2026 street price collected'),
  },
  {
    id: 'cpu-vela-16', category: 'cpu', tier: 'consumer',
    displayName: 'Orrin Vela 16', realRef: 'AMD Ryzen 9 9950X',
    maxSockets: est(1, 'sockets', 'Desktop socket AM5 platform: one CPU per board.'),
    arch: pub('zen5', '', 'wiki-ryzen-list'),
    cores: pub(16, 'cores', 'wiki-ryzen-list'), threads: pub(32, 'threads', 'wiki-ryzen-list'),
    baseClockGHz: pub(4.3, 'GHz', 'wiki-ryzen-list'), boostClockGHz: pub(5.7, 'GHz', 'wiki-ryzen-list'),
    l3MB: pub(64, 'MB', 'wiki-ryzen-list'), tdpW: pub(170, 'W', 'wiki-ryzen-list'),
    memType: pub('DDR5', '', 'wiki-ryzen-list'), memChannels: pub(2, 'channels', 'wiki-ryzen-list'),
    memMaxMTs: pub(5600, 'MT/s', 'wiki-ryzen-list'),
    memMaxMTsTwoPerChannel: pub(3600, 'MT/s', 'wiki-ryzen-list', '"only DDR5-3600 for 4x1R and 4x2R"'),
    eccSupport: est(false, 'bool', 'Consumer platform; ECC UDIMM support depends on the motherboard and is not modeled.'),
    pcieGen: pub(5, '', 'wiki-ryzen-list'), pcieLanes: pub(24, 'lanes', 'wiki-ryzen-list', '28 total, 4 to chipset'),
    ipcFactor: ZEN5_IPC, idlePowerW: RYZEN_IDLE, tjMaxC: TJMAX_ASSUMED,
    priceUSD: pub(649, 'USD', 'wiki-ryzen-list', 'Launch MSRP (Aug 2024)'),
  },
  {
    id: 'cpu-summit-32', category: 'cpu', tier: 'workstation',
    displayName: 'Orrin Summit 32', realRef: 'AMD Ryzen Threadripper PRO 9975WX',
    maxSockets: est(1, 'sockets', 'Workstation sTR5 platform: one CPU per board.'),
    arch: pub('zen5', '', 'wiki-threadripper'),
    cores: pub(32, 'cores', 'wiki-threadripper'), threads: pub(64, 'threads', 'wiki-threadripper'),
    baseClockGHz: pub(4.0, 'GHz', 'wiki-threadripper'), boostClockGHz: pub(5.4, 'GHz', 'wiki-threadripper'),
    l3MB: pub(128, 'MB', 'wiki-threadripper'), tdpW: pub(350, 'W', 'wiki-threadripper'),
    memType: pub('DDR5', '', 'wiki-threadripper'), memChannels: pub(8, 'channels', 'wiki-threadripper'),
    memMaxMTs: pub(6400, 'MT/s', 'wiki-threadripper'),
    eccSupport: pub(true, 'bool', 'wiki-threadripper'),
    pcieGen: pub(5, '', 'wiki-threadripper'), pcieLanes: pub(124, 'lanes', 'wiki-threadripper', '128 PCIe 5.0, 4 run as PCIe 4.0 to the chipset'),
    ipcFactor: ZEN5_IPC, idlePowerW: est(60, 'W', 'No idle figure found; assumed for a 350 W workstation part.'), tjMaxC: TJMAX_ASSUMED,
    priceUSD: pub(4099, 'USD', 'wiki-threadripper', 'Launch MSRP (Jul 2025)'),
  },
  {
    id: 'cpu-keystone-32-g2', category: 'cpu', tier: 'server',
    displayName: 'Orrin Keystone 32 G2', realRef: 'AMD EPYC 7532',
    maxSockets: est(2, 'sockets', 'EPYC 7002 non-P part: 2-socket capable (P suffix marks single-socket parts).'),
    arch: pub('zen2', '', 'wiki-epyc'),
    cores: pub(32, 'cores', 'wiki-epyc'), threads: pub(64, 'threads', 'wiki-epyc'),
    baseClockGHz: pub(2.4, 'GHz', 'wiki-epyc'), boostClockGHz: pub(3.3, 'GHz', 'wiki-epyc'),
    l3MB: pub(256, 'MB', 'wiki-epyc'), tdpW: pub(200, 'W', 'wiki-epyc'),
    memType: pub('DDR4', '', 'wiki-epyc'), memChannels: pub(8, 'channels', 'wiki-epyc'),
    memMaxMTs: est(3200, 'MT/s', 'Rome is described as eight-channel DDR4 (wiki-epyc); DDR4-3200 maximum not found on an opened page.'),
    eccSupport: pub(true, 'bool', 'wiki-epyc'),
    pcieGen: pub(4, '', 'wiki-epyc'), pcieLanes: pub(128, 'lanes', 'wiki-epyc'),
    ipcFactor: ZEN2_IPC, idlePowerW: est(60, 'W', 'No idle figure found; assumed for a 200 W server part.'), tjMaxC: TJMAX_ASSUMED,
    priceUSD: pub(695, 'USD', 'price-itc-7532', 'New bulk; launch price was $3,350'),
  },
  {
    id: 'cpu-keystone-32-g5', category: 'cpu', tier: 'server',
    displayName: 'Orrin Keystone 32 G5', realRef: 'AMD EPYC 9355P',
    maxSockets: est(1, 'sockets', 'EPYC 9355P: the P suffix marks a single-socket part.'),
    arch: pub('zen5', '', 'wiki-epyc'),
    cores: pub(32, 'cores', 'wiki-epyc'), threads: pub(64, 'threads', 'wiki-epyc'),
    baseClockGHz: pub(3.55, 'GHz', 'wiki-epyc'), boostClockGHz: pub(4.4, 'GHz', 'wiki-epyc'),
    l3MB: pub(256, 'MB', 'wiki-epyc'), tdpW: pub(280, 'W', 'wiki-epyc'),
    memType: pub('DDR5', '', 'wiki-epyc'), memChannels: pub(12, 'channels', 'wiki-epyc'),
    memMaxMTs: pub(6400, 'MT/s', 'wiki-epyc'),
    eccSupport: pub(true, 'bool', 'wiki-epyc'),
    pcieGen: pub(5, '', 'wiki-epyc'), pcieLanes: pub(128, 'lanes', 'wiki-epyc'),
    ipcFactor: ZEN5_IPC, idlePowerW: est(70, 'W', 'No idle figure found; assumed for a 280 W server part.'), tjMaxC: TJMAX_ASSUMED,
    priceUSD: pub(2998, 'USD', 'wiki-epyc', '1kU launch price'),
  },
  {
    id: 'cpu-keystone-64-g5', category: 'cpu', tier: 'server',
    displayName: 'Orrin Keystone 64 G5', realRef: 'AMD EPYC 9555',
    maxSockets: pub(2, 'sockets', 'wiki-epyc', '160 PCIe lanes in 2-socket systems implies 2P support'),
    arch: pub('zen5', '', 'wiki-epyc'),
    cores: pub(64, 'cores', 'wiki-epyc'), threads: pub(128, 'threads', 'wiki-epyc'),
    baseClockGHz: pub(3.2, 'GHz', 'wiki-epyc'), boostClockGHz: pub(4.4, 'GHz', 'wiki-epyc'),
    l3MB: pub(256, 'MB', 'wiki-epyc'), tdpW: pub(360, 'W', 'wiki-epyc'),
    memType: pub('DDR5', '', 'wiki-epyc'), memChannels: pub(12, 'channels', 'wiki-epyc'),
    memMaxMTs: pub(6400, 'MT/s', 'wiki-epyc'),
    eccSupport: pub(true, 'bool', 'wiki-epyc'),
    pcieGen: pub(5, '', 'wiki-epyc'), pcieLanes: pub(128, 'lanes', 'wiki-epyc', '160 in 2-socket systems'),
    ipcFactor: ZEN5_IPC, idlePowerW: est(80, 'W', 'No idle figure found; assumed for a 360 W server part.'), tjMaxC: TJMAX_ASSUMED,
    priceUSD: pub(9826, 'USD', 'wiki-epyc', '1kU launch price'),
  },
];
