// Names the game shows for hardware (user decision 2026-10-01: real hardware
// names). Built from each part's realRef, cleaned to a readable product name.
// Where the realRef is generic (a price-tracker basket, not one product), the
// name is a plain description with no brand. Part ids never change, so saves
// keep loading.
export const hardwareNames = {
  // GPUs
  'gpu-ember-g3-12': 'NVIDIA GeForce RTX 3060 12GB',
  'gpu-ember-g3-24': 'NVIDIA GeForce RTX 3090',
  'gpu-ember-g4-24': 'NVIDIA GeForce RTX 4090',
  'gpu-ember-g5-32': 'NVIDIA GeForce RTX 5090',
  'gpu-atelier-a48': 'NVIDIA RTX A6000',
  'gpu-atelier-b96': 'NVIDIA RTX PRO 6000 Blackwell Workstation Edition',
  'gpu-bastion-p48': 'NVIDIA L40S',
  'gpu-bastion-h80': 'NVIDIA A100 80GB PCIe',
  'gpu-bastion-x94': 'NVIDIA H100 NVL',
  'gpu-bastion-h80-sxm': 'NVIDIA A100 80GB SXM',
  'gpu-bastion-x80-sxm': 'NVIDIA H100 SXM5 80GB',
  'gpu-bastion-x141': 'NVIDIA H200 SXM 141GB',
  'gpu-citadel-c180': 'NVIDIA B200 SXM',
  'gpu-citadel-c288': 'NVIDIA B300 SXM',
  'gpu-tessera-t192': 'AMD Instinct MI300X',
  'gpu-tessera-t288': 'AMD Instinct MI355X',
  // CPUs
  'cpu-vela-8': 'AMD Ryzen 7 9700X',
  'cpu-vela-16': 'AMD Ryzen 9 9950X',
  'cpu-summit-32': 'AMD Ryzen Threadripper PRO 9975WX',
  'cpu-keystone-32-g2': 'AMD EPYC 7532',
  'cpu-keystone-32-g5': 'AMD EPYC 9355P',
  'cpu-keystone-64-g5': 'AMD EPYC 9555',
  // RAM (the two desktop kits and the DDR4 RDIMM are generic: no single brand)
  'ram-sprint-2x16-d5': 'DDR5-6000 CL30 32GB (2x16GB) kit',
  'ram-sprint-2x32-d5': 'DDR5-6000 64GB (2x32GB) kit',
  'ram-rack-32-d5-5600': 'Kingston 32GB DDR5-5600 ECC RDIMM (KSM56R46BD8PMI)',
  'ram-rack-64-d5-5600': 'Micron 64GB DDR5-5600 ECC RDIMM (MTC40F2046S1RC56BD2)',
  'ram-rack-64-d5-6400': 'A-Tech 64GB DDR5-6400 ECC RDIMM',
  'ram-rack-32-d4-2933': 'DDR4-2933 32GB ECC RDIMM',
  // Storage
  'sto-strata-nova-2': 'Samsung 990 PRO 2TB',
  'sto-strata-vault-3t8': 'Micron 7450 PRO 3.84TB U.3',
  'sto-lodestone-x24': 'Seagate Exos X24 24TB',
  'sto-lodestone-nas8': 'WD Red Plus 8TB',
  // PSUs
  'psu-voltaic-g650': 'Corsair RM650e',
  'psu-voltaic-g850': 'Corsair RM850e',
  'psu-voltaic-p1000': 'Corsair HX1000i',
  'psu-voltaic-t1600': 'Corsair AX1600i',
  'psu-voltaic-m3000t': 'Supermicro 3000W Titanium PSU module',
  'psu-voltaic-m3300': 'NVIDIA DGX H100/B200 3.3 kW PSU module',
  'psu-voltaic-m3200': 'NVIDIA DGX B300 3.2 kW PSU module',
  'psu-voltaic-m6600t': 'Supermicro 6600W Titanium PSU module',
  // Fans and coolers
  'fan-sirocco-12q': 'ARCTIC P12 PWM PST',
  'fan-sirocco-12m': 'ARCTIC P12 Max',
  'fan-gale-80s': 'Sanyo Denki San Ace 80 (9HV0812P1G001)',
  'clr-frostline-d2': 'Noctua NH-D15 G2',
  'clr-frostline-loop360': 'ARCTIC Liquid Freezer III 360',
  // Network
  'net-lattice-8e2s': 'MikroTik CRS310-8G+2S+IN',
  'net-lattice-8s10': 'MikroTik CRS309-1G-8S+IN',
  'net-lattice-24s2q': 'MikroTik CRS326-24S+2Q+RM',
  'net-lattice-4q100': 'MikroTik CRS504-4XQ-IN',
  'net-lattice-64x100': 'NVIDIA Spectrum-3 SN4600C',
  'net-lattice-32x400': 'NVIDIA Spectrum-3 SN4700',
  'net-lattice-64x800': 'NVIDIA Spectrum-4 SN5600',
  'net-strand-ib64': 'NVIDIA Quantum-2 QM9700',
  'net-strand-nic400': 'NVIDIA ConnectX-7 400G',
  // Cases, racks, nodes (the DGX entries are modeled as barebones equivalents)
  'chs-hollow-quiet-xl': 'Fractal Design Define 7 XL',
  'chs-hollow-gale': 'Fractal Design Torrent',
  'chs-hollow-r4': 'Sliger CX4712',
  'rack-hollow-42': 'APC NetShelter SX AR3100',
  'node-forge-a8': 'NVIDIA DGX A100-class 8-GPU node',
  'node-forge-h8': 'NVIDIA DGX H100/H200-class 8-GPU node',
  'node-forge-b8': 'NVIDIA DGX B200-class 8-GPU node',
  'node-forge-b8u': 'NVIDIA DGX B300-class 8-GPU node',
  'node-loom-t8': 'Supermicro AS-8125GS-TNMR2',
  'node-loom-t8x': 'Supermicro AS-A126GS-TNMR',
  // PDUs
  'pdu-conduit-22k': 'APC NetShelter AP8886',
  'pdu-conduit-17k': 'APC NetShelter AP8966',
};
