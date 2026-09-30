import { pub, est } from '../lib.js';

// 8-GPU server nodes: chassis + GPU baseboard + switch/mesh fabric + fans + PSU
// bays. The player adds the GPU modules (matching gpuSocket), CPUs (up to
// cpuSockets), RAM, storage and PSU modules (from acceptsPsu, up to psuBays).
// Specs come from the vendor system pages; the vendor systems ship with CPUs,
// RAM and NICs included, which these barebones parts do not.
//
// Stock fans: every node uses the catalog 80 mm server fan. Where the vendor
// gives a fan count it is used; where it gives only airflow, the count is
// derived so fan free-air CFM x rack restriction (0.8) x the stated PWM matches
// the published airflow (estimate).

const SERVER_FAN = 'fan-gale-80s';
const FAN_FIT = (cfm, pwm) => `Fan count not published. Derived from the published airflow (${cfm} CFM at ${pwm}% PWM): count = ${cfm} / (${pwm / 100} x 130.7 CFM per fan x 0.8 rack restriction), rounded.`;
const NO_DAMP = est(0, 'dB', 'Server node: no sound damping.');
const NODE_PRICE = (sys, gpus) => `No barebones price found. System price midpoint ${sys} minus 8 GPUs at ${gpus} (same article); the remainder also covers the CPUs, RAM and NICs the real system ships with, so this is high. Flagged.`;

const base = (o) => ({
  category: 'chassis', tier: 'datacenter',
  formFactor: est('gpu-node', '', 'Rackmount 8-GPU server with a GPU baseboard.'),
  gpuBays: est(8, 'GPUs', 'Every node here is an 8-GPU system per its vendor page.'),
  expansionSlots: est(0, 'slots', 'GPU modules sit on the baseboard; the PCIe slots are for NICs and are not modeled as GPU slots.'),
  includedFanModel: est(SERVER_FAN, '', 'Stock fans modeled with the catalog 80 mm server fan.'),
  includedFanSizeMm: est(80, 'mm', 'Supermicro lists 8 cm fans on its GPU nodes; used for all nodes.', 'smc-a126'),
  soundDamping: est(false, 'bool', 'Server node.'), dampingDB: NO_DAMP,
  dustFilters: est(false, 'bool', 'Server node; datacenter air assumed filtered upstream.'),
  driveBays35: est(0, 'bays', 'Nodes use NVMe U.2/E1.S bays; no 3.5" bays modeled.'),
  ...o,
});

export const nodes = [
  base({
    id: 'node-forge-a8', displayName: 'Anvilworks Forge A8', realRef: 'NVIDIA DGX A100 (barebones equivalent)',
    gpuSocket: est('sxm4', '', 'A100 SXM4 baseboard.', 'nv-dgxa100-docs'),
    fabric: pub('switch', '', 'nv-dgxa100-docs', '6 NVSwitches, 600 GB/s GPU-to-GPU'),
    cpuSockets: pub(2, 'sockets', 'nv-dgxa100-docs'),
    psuBays: pub(6, 'bays', 'nv-dgxa100-docs', '3+3 redundancy'), acceptsPsu: est(['psu-voltaic-m3000t'], '', 'DGX A100 PSUs are 3000 W; modeled with the catalog 3000 W Titanium module.', 'nv-dgxa100-docs'),
    maxSystemPowerW: pub(6500, 'W', 'nv-dgxa100-docs'),
    airflowCFM: pub(840, 'CFM', 'nv-dgxa100-docs', 'at 80% fan PWM'),
    includedFans: est(10, 'fans', FAN_FIT(840, 80)), fanMounts: est(10, 'mounts', 'Stock fans only.'),
    rackUnits: pub(6, 'U', 'nv-dgxa100-docs'),
    volumeL: est(100.5, 'L', 'Dimensions not read. 6U (266.7 mm) x 447 mm x 843 mm (width and depth of the Supermicro 10U node). Estimate.'),
    priceUSD: est(60000, 'USD', 'No price found for an A100 8-GPU system in 2026. Assumed close to the H100 node below (same class of chassis, switches and PSUs). Flagged.'),
  }),
  base({
    id: 'node-forge-h8', displayName: 'Anvilworks Forge H8', realRef: 'NVIDIA DGX H100/H200 (barebones equivalent)',
    gpuSocket: est('sxm5', '', 'H100/H200 SXM5 baseboard (one system spec for both).', 'nv-dgxh100-docs'),
    fabric: pub('switch', '', 'nv-dgxh100-docs', '4th-gen NVLink via NVSwitch, 900 GB/s GPU-to-GPU'),
    cpuSockets: pub(2, 'sockets', 'nv-dgxh100-docs'),
    psuBays: pub(6, 'bays', 'nv-dgxh100-docs', '4+2 redundancy'), acceptsPsu: est(['psu-voltaic-m3300'], '', 'DGX H100 PSUs are 3.3 kW.', 'nv-dgxh100-docs'),
    maxSystemPowerW: pub(10200, 'W', 'nv-dgxh100-docs'),
    airflowCFM: pub(1105, 'CFM', 'nv-dgxh100-docs', 'front-to-back at 80% fan PWM'),
    includedFans: est(13, 'fans', FAN_FIT(1105, 80)), fanMounts: est(13, 'mounts', 'Stock fans only.'),
    rackUnits: pub(8, 'U', 'nv-dgxh100-docs'),
    volumeL: est(134, 'L', 'Dimensions not read. 8U (355.6 mm) x 447 mm x 843 mm (width and depth of the Supermicro 10U node). Estimate.'),
    priceUSD: est(61000, 'USD', NODE_PRICE('$285,000 (H100 HGX $250k-320k)', '$28,000 (H100 midpoint)'), 'price-il-dc'),
  }),
  base({
    id: 'node-forge-b8', displayName: 'Anvilworks Forge B8', realRef: 'NVIDIA DGX B200 (barebones equivalent)',
    gpuSocket: est('bw1', '', 'B200 baseboard.', 'nv-dgxb200-docs'),
    fabric: pub('switch', '', 'nv-dgxb200-docs', '2 x 5th-gen NVLink switches, 14.4 TB/s aggregate'),
    cpuSockets: pub(2, 'sockets', 'nv-dgxb200-docs'),
    psuBays: pub(6, 'bays', 'nv-dgxb200-docs', '5+1 redundancy'), acceptsPsu: est(['psu-voltaic-m3300'], '', 'DGX B200 PSUs are 3.3 kW (same rating as DGX H100).', 'nv-dgxb200-docs'),
    maxSystemPowerW: pub(14300, 'W', 'nv-dgxb200-docs'),
    airflowCFM: pub(1550, 'CFM', 'nv-dgxb200-docs', 'PWM not stated; taken as full speed'),
    includedFans: est(15, 'fans', FAN_FIT(1550, 100)), fanMounts: est(15, 'mounts', 'Stock fans only.'),
    rackUnits: pub(10, 'U', 'nv-dgxb200-docs'),
    volumeL: est(164.7, 'L', 'Dimensions not read. Same 10U size as the Supermicro 10U node (17.2 x 17.6 x 33.2 in). Estimate.', 'smc-a126'),
    priceUSD: est(70000, 'USD', 'System midpoint $450,000 (B200 HGX $400k-500k) minus 8 x $47,500 (B200 street midpoint) = $70,000; the remainder also covers CPUs, RAM and NICs. Flagged.', 'price-il-dc'),
  }),
  base({
    id: 'node-forge-b8u', displayName: 'Anvilworks Forge B8 Ultra', realRef: 'NVIDIA DGX B300 (barebones equivalent)',
    gpuSocket: est('bw2', '', 'B300 baseboard.', 'nv-dgxb300-docs'),
    fabric: pub('switch', '', 'nv-dgxb300-docs', '2 x 5th-gen NVLink switch, 14.4 TB/s aggregate'),
    cpuSockets: pub(2, 'sockets', 'nv-dgxb300-docs'),
    psuBays: pub(12, 'bays', 'nv-dgxb300-docs', 'N+N redundancy'), acceptsPsu: est(['psu-voltaic-m3200'], '', 'DGX B300 PSUs are 3.2 kW.', 'nv-dgxb300-docs'),
    maxSystemPowerW: pub(14500, 'W', 'nv-dgxb300-docs'),
    airflowCFM: pub(2850, 'CFM', 'nv-dgxb300-docs', 'PSU 1500 CFM + busbar 1350 CFM at 70% PWM'),
    includedFans: est(39, 'fans', FAN_FIT(2850, 70)), fanMounts: est(39, 'mounts', 'Stock fans only.'),
    rackUnits: pub(10, 'U', 'nv-dgxb300-docs'),
    volumeL: est(164.7, 'L', 'Dimensions not read. Same 10U size as the Supermicro 10U node (17.2 x 17.6 x 33.2 in). Estimate.', 'smc-a126'),
    priceUSD: est(90000, 'USD', 'The article lists the DGX B300 at "$300,000 to $350,000", which is below 8 x its own B300 price ($53k): the figures conflict, so no subtraction is possible. Assumed a bit above the B200 node. Flagged.', 'price-il-dc'),
  }),
  base({
    id: 'node-loom-t8', displayName: 'Anvilworks Loom T8', realRef: 'Supermicro AS-8125GS-TNMR2 (MI300X 8-GPU)',
    gpuSocket: est('oam3', '', 'MI300X-class OAM baseboard.', 'smc-as8125'),
    fabric: pub('mesh', '', 'smc-as8125', 'Infinity Fabric Link GPU-to-GPU (full mesh, no switch)'),
    cpuSockets: pub(2, 'sockets', 'smc-as8125'),
    psuBays: pub(6, 'bays', 'smc-as8125', '3+3 redundant, Titanium'), acceptsPsu: pub(['psu-voltaic-m3000t'], '', 'smc-as8125', '6x 3000 W Titanium'),
    maxSystemPowerW: est(9000, 'W', 'Not published. Three non-redundant 3000 W supplies (3+3) set the ceiling.', 'smc-as8125'),
    airflowCFM: est(1046, 'CFM', 'Not published. 10 fans x 130.7 CFM x 0.8 rack restriction at full speed.'),
    includedFans: pub(10, 'fans', 'smc-as8125', '"10 heavy duty fans"'), fanMounts: pub(10, 'mounts', 'smc-as8125'),
    rackUnits: pub(8, 'U', 'smc-as8125'),
    volumeL: est(134, 'L', 'Dimensions not read. 8U (355.6 mm) x 447 mm x 843 mm (width and depth of the Supermicro 10U node). Estimate.'),
    priceUSD: est(50000, 'USD', 'No price found. Assumed a little below the H100-class node (no NVSwitch; mesh fabric). Flagged.'),
  }),
  base({
    id: 'node-loom-t8x', displayName: 'Anvilworks Loom T8X', realRef: 'Supermicro AS-A126GS-TNMR (MI355X 8-GPU)',
    gpuSocket: est('oam4', '', 'MI355X-class OAM baseboard.', 'smc-a126'),
    fabric: pub('mesh', '', 'smc-a126', 'Infinity Fabric Link GPU-to-GPU'),
    cpuSockets: pub(2, 'sockets', 'smc-a126'),
    psuBays: pub(6, 'bays', 'smc-a126', '4+2 redundant, Titanium'), acceptsPsu: pub(['psu-voltaic-m6600t'], '', 'smc-a126', '6x 6600 W Titanium'),
    maxSystemPowerW: est(26400, 'W', 'Not published. Four non-redundant 6600 W supplies (4+2) set the ceiling.', 'smc-a126'),
    airflowCFM: est(1987, 'CFM', 'Not published. 19 fans x 130.7 CFM x 0.8 rack restriction at full speed.'),
    includedFans: pub(19, 'fans', 'smc-a126', '"up to 19x 8cm heavy duty fans"'), fanMounts: pub(19, 'mounts', 'smc-a126'),
    rackUnits: pub(10, 'U', 'smc-a126'),
    volumeL: est(164.7, 'L', 'Published dimensions 17.2" x 17.6" x 33.2" = 164.7 L.', 'smc-a126'),
    priceUSD: est(80000, 'USD', 'No price found. Assumed near the B200-class node (same power class, 6.6 kW Titanium PSUs). Flagged.'),
  }),
];
