import { pub, est } from '../lib.js';

// Datacenter accelerator modules (socketed, not PCIe cards). They only go into
// an 8-GPU node (data-dev/parts/node.js) whose gpuSocket matches formFactor.
// Dense tensor rates: vendors list FP16/BF16 "with sparsity"; dense is half
// (NVIDIA HGX page footnote: "Dense is 1/2 sparse spec shown").
//
// Socket tokens group modules that share a baseboard platform:
//   sxm4 = A100 boards, sxm5 = H100/H200 boards (one DGX H100/H200 system
//   spec covers both), bw1 = B200 boards, bw2 = B300 boards (different system
//   spec: CPUs, PSUs, NICs), oam3 = MI300X-class UBB, oam4 = MI355X-class UBB.

const IDLE_REASON = (w, board) => `No idle figure found. Assumed about 12% of board power (${board} W), the same ratio as the other HBM boards in the catalog (A100 PCIe 40/300 W, H100 NVL 50/400 W).`;
const MAXT = est(85, 'C', 'No figure found; socketed datacenter module assumed to throttle at 85 C like the PCIe datacenter cards in the catalog.');
const PASSIVE = est('passive', '', 'Socketed module with a heatsink cooled by the node\'s fans (air-cooled system specs list front-to-back airflow).');
const NO_SLOTS = est(0, 'slots', 'Socketed module on a baseboard: uses no PCIe expansion slots.');
const DC_P2P = est(true, 'bool', 'Datacenter module; peer-to-peer allowed.');
const HOST_X16 = est(16, 'lanes', 'Each module has a x16 host link through the baseboard PCIe switches (DGX docs list PCIe Gen5 hosts).');

export const dcGpus = [
  {
    id: 'gpu-bastion-h80-sxm', category: 'gpu', tier: 'datacenter',
    displayName: 'Halcyon Bastion H80 Socket', realRef: 'NVIDIA A100 80GB SXM',
    vramGB: pub(80, 'GB', 'nv-a100-page'), memBandwidthGBs: pub(2039, 'GB/s', 'nv-a100-page'), memType: pub('HBM2e', '', 'nv-a100-page'),
    fp16TensorTflops: pub(312, 'TFLOPS', 'nv-a100-page', 'dense'), fp16AccTensorTflops: pub(312, 'TFLOPS', 'nv-a100-page', 'one FP16 tensor rate'),
    fp32Tflops: pub(19.5, 'TFLOPS', 'nv-a100-page'), int8TensorTops: pub(624, 'TOPS', 'nv-a100-page', 'dense'),
    boostClockMHz: pub(1410, 'MHz', 'wiki-nv-dc', 'PCIe card clock; SXM assumed the same'),
    boardPowerW: pub(400, 'W', 'nv-a100-page'),
    idlePowerW: est(50, 'W', IDLE_REASON(50, 400)), maxTempC: MAXT,
    pcieGen: pub(4, '', 'nv-a100-page'), pcieLanes: HOST_X16,
    linkType: pub('nvlink', '', 'nv-a100-page'), linkBandwidthGBs: pub(600, 'GB/s', 'nv-a100-page', 'NVLink per GPU, bidirectional'),
    p2pOverPcie: DC_P2P, cooling: PASSIVE, slots: NO_SLOTS,
    formFactor: est('sxm4', '', 'SXM4 module; fits A100-generation 8-GPU baseboards only.'),
    priceUSD: est(10000, 'USD', 'Article gives "approx. $10,000 by 2023" and no 2026 figure; used as the older-generation price.', 'price-il-dc'),
  },
  {
    id: 'gpu-bastion-x80-sxm', category: 'gpu', tier: 'datacenter',
    displayName: 'Halcyon Bastion X80 Socket', realRef: 'NVIDIA H100 SXM5 80GB',
    vramGB: pub(80, 'GB', 'nv-h100-page'), memBandwidthGBs: pub(3350, 'GB/s', 'nv-h100-page'), memType: pub('HBM3', '', 'nv-h100-page'),
    fp16TensorTflops: est(989.5, 'TFLOPS', '1,979 with sparsity / 2.', 'nv-h100-page'), fp16AccTensorTflops: est(989.5, 'TFLOPS', '1,979 with sparsity / 2; one FP16 tensor rate.', 'nv-h100-page'),
    fp32Tflops: pub(67, 'TFLOPS', 'nv-h100-page'), int8TensorTops: est(1979, 'TOPS', '3,958 with sparsity / 2.', 'nv-h100-page'),
    boostClockMHz: pub(1980, 'MHz', 'wiki-nv-dc'),
    boardPowerW: pub(700, 'W', 'nv-h100-page'),
    idlePowerW: est(70, 'W', IDLE_REASON(70, 700) + ' Rounded down to 10%.'), maxTempC: MAXT,
    pcieGen: pub(5, '', 'nv-h100-page'), pcieLanes: HOST_X16,
    linkType: pub('nvlink', '', 'nv-h100-page'), linkBandwidthGBs: pub(900, 'GB/s', 'nv-h100-page', 'NVLink per GPU'),
    p2pOverPcie: DC_P2P, cooling: PASSIVE, slots: NO_SLOTS,
    formFactor: est('sxm5', '', 'SXM5 module; the DGX H100/H200 user guide describes one system for both GPUs, so H100 and H200 share the board.', 'nv-dgxh100-docs'),
    priceUSD: pub(28000, 'USD', 'price-il-dc', 'midpoint of "$25,000 to $31,000 (2026)"'),
  },
  {
    id: 'gpu-bastion-x141', category: 'gpu', tier: 'datacenter',
    displayName: 'Halcyon Bastion X141 Socket', realRef: 'NVIDIA H200 SXM 141GB',
    vramGB: pub(141, 'GB', 'nv-h200-page'), memBandwidthGBs: pub(4800, 'GB/s', 'nv-h200-page'), memType: pub('HBM3e', '', 'nv-h200-page'),
    fp16TensorTflops: est(989.5, 'TFLOPS', 'Page lists 1,979 TFLOPS FP16 with sparsity; dense is half.', 'nv-h200-page'),
    fp16AccTensorTflops: est(989.5, 'TFLOPS', 'Same as fp16TensorTflops (Hopper has one FP16 tensor rate).', 'nv-h200-page'),
    fp32Tflops: pub(66.91, 'TFLOPS', 'wiki-nv-dc'), int8TensorTops: est(1979, 'TOPS', 'Twice the dense FP16 rate, as on the H100 SXM (same GH100 compute).'),
    boostClockMHz: pub(1980, 'MHz', 'wiki-nv-dc'),
    boardPowerW: pub(700, 'W', 'nv-h200-page', 'up to 700 W'),
    idlePowerW: est(85, 'W', IDLE_REASON(85, 700)), maxTempC: MAXT,
    pcieGen: est(5, '', 'Same GH100 host interface as the H100 SXM (PCIe Gen5).', 'nv-h100-page'), pcieLanes: HOST_X16,
    linkType: pub('nvlink', '', 'nv-h200-page'), linkBandwidthGBs: pub(900, 'GB/s', 'nv-h200-page', 'NVLink per GPU'),
    p2pOverPcie: DC_P2P, cooling: PASSIVE, slots: NO_SLOTS,
    formFactor: est('sxm5', '', 'Shares the H100 board (one DGX H100/H200 system spec).', 'nv-dgxh100-docs'),
    priceUSD: pub(42500, 'USD', 'price-il-dc', 'midpoint of "$30,000 to $55,000"'),
  },
  {
    id: 'gpu-citadel-c180', category: 'gpu', tier: 'datacenter',
    displayName: 'Halcyon Citadel C180', realRef: 'NVIDIA B200 SXM',
    vramGB: pub(180, 'GB', 'wiki-nv-dc', 'DGX B200: 1,440 GB total for 8 GPUs'), memBandwidthGBs: pub(8000, 'GB/s', 'wiki-nv-dc'), memType: pub('HBM3e', '', 'wiki-nv-dc'),
    fp16TensorTflops: est(2250, 'TFLOPS', 'HGX B200 lists 36 PFLOPS FP16/BF16 for 8 GPUs with sparsity; 36/8/2 = 2.25 PF dense per GPU. Wikipedia\'s table shows 1,191.2 in its half-precision column: the sources disagree; the vendor figure is used.', 'nv-hgx-page'),
    fp16AccTensorTflops: est(2250, 'TFLOPS', 'Same as fp16TensorTflops (one FP16 tensor rate on datacenter parts).', 'nv-hgx-page'),
    fp32Tflops: pub(74.45, 'TFLOPS', 'wiki-nv-dc'), int8TensorTops: est(4500, 'TOPS', 'Twice the dense FP16 estimate (HGX lists FP8 at twice FP16: 72 vs 36 PF); INT8 not listed, assumed equal to FP8.', 'nv-hgx-page'),
    boostClockMHz: pub(1965, 'MHz', 'wiki-nv-dc'),
    boardPowerW: pub(1000, 'W', 'wiki-nv-dc'),
    idlePowerW: est(120, 'W', IDLE_REASON(120, 1000)), maxTempC: MAXT,
    pcieGen: est(5, '', 'DGX B200 host CPUs are PCIe Gen5; the host link runs at Gen5.', 'nv-dgxb200-docs'), pcieLanes: HOST_X16,
    linkType: pub('nvlink', '', 'nv-hgx-page'), linkBandwidthGBs: pub(1800, 'GB/s', 'nv-hgx-page', 'NVLink GPU-to-GPU per GPU'),
    p2pOverPcie: DC_P2P, cooling: PASSIVE, slots: NO_SLOTS,
    formFactor: est('bw1', '', 'B200 8-GPU baseboard; B300 systems use a different board and system spec.', 'nv-dgxb200-docs'),
    priceUSD: pub(47500, 'USD', 'price-il-dc', 'midpoint of street quotes "$45,000 to $50,000"'),
  },
  {
    id: 'gpu-citadel-c288', category: 'gpu', tier: 'datacenter',
    displayName: 'Halcyon Citadel C288', realRef: 'NVIDIA B300 SXM (Blackwell Ultra)',
    vramGB: pub(288, 'GB', 'nv-dgxb300-docs', '"8 x 288 GB"'), memBandwidthGBs: pub(8000, 'GB/s', 'wiki-nv-dc'), memType: pub('HBM3e', '', 'wiki-nv-dc'),
    fp16TensorTflops: est(2250, 'TFLOPS', 'HGX B300 lists the same 36 PFLOPS FP16/BF16 (sparse, 8 GPUs) as HGX B200: 2.25 PF dense per GPU.', 'nv-hgx-page'),
    fp16AccTensorTflops: est(2250, 'TFLOPS', 'Same as fp16TensorTflops.', 'nv-hgx-page'),
    fp32Tflops: pub(76.99, 'TFLOPS', 'wiki-nv-dc'), int8TensorTops: est(4500, 'TOPS', 'Not listed on any opened page. Assumed equal to the dense FP8 rate (72 PF sparse / 8 / 2); flagged because Blackwell Ultra is reported to trade away some integer throughput.', 'nv-hgx-page'),
    boostClockMHz: pub(2032, 'MHz', 'wiki-nv-dc'),
    boardPowerW: pub(1400, 'W', 'wiki-nv-dc'),
    idlePowerW: est(150, 'W', IDLE_REASON(150, 1400) + ' Rounded down.'), maxTempC: MAXT,
    pcieGen: est(5, '', 'DGX B300 host CPUs (Xeon 6776P) are PCIe Gen5 hosts; assumed Gen5 host link.', 'nv-dgxb300-docs'), pcieLanes: HOST_X16,
    linkType: pub('nvlink', '', 'nv-hgx-page'), linkBandwidthGBs: pub(1800, 'GB/s', 'nv-hgx-page', 'NVLink GPU-to-GPU per GPU'),
    p2pOverPcie: DC_P2P, cooling: PASSIVE, slots: NO_SLOTS,
    formFactor: est('bw2', '', 'B300 8-GPU baseboard (DGX B300 spec differs from DGX B200: CPUs, 12 PSUs, 800G NICs).', 'nv-dgxb300-docs'),
    priceUSD: pub(53000, 'USD', 'price-il-dc', '"approx. $53,000 (July 2026)"'),
  },
  {
    id: 'gpu-tessera-t192', category: 'gpu', tier: 'datacenter',
    displayName: 'Corvid Tessera T192', realRef: 'AMD Instinct MI300X',
    vramGB: pub(192, 'GB', 'wiki-amd-instinct'), memBandwidthGBs: pub(5300, 'GB/s', 'wiki-amd-instinct'), memType: pub('HBM3', '', 'wiki-amd-instinct'),
    fp16TensorTflops: pub(1307.4, 'TFLOPS', 'wiki-amd-instinct', 'FP16 dense (2,614.9 in the INT8 column)'),
    fp16AccTensorTflops: pub(1307.4, 'TFLOPS', 'wiki-amd-instinct', 'one FP16 matrix rate'),
    fp32Tflops: pub(163.4, 'TFLOPS', 'wiki-amd-instinct'), int8TensorTops: pub(2614.9, 'TOPS', 'wiki-amd-instinct'),
    boostClockMHz: pub(2100, 'MHz', 'wiki-amd-instinct'),
    boardPowerW: pub(750, 'W', 'wiki-amd-instinct', 'typical board power'),
    idlePowerW: est(90, 'W', IDLE_REASON(90, 750)), maxTempC: MAXT,
    pcieGen: pub(5, '', 'wiki-amd-instinct'), pcieLanes: pub(16, 'lanes', 'wiki-amd-instinct'),
    linkType: est('infinity-fabric', '', 'GPU-to-GPU links on the 8-GPU baseboard (Supermicro page: "AMD Infinity Fabric Link").', 'smc-as8125'),
    linkBandwidthGBs: est(896, 'GB/s', 'Search summaries (AMD platform data sheet, not opened) give 128 GB/s to each of the other 7 GPUs, 896 GB/s aggregate per GPU. A full mesh, not a switch: treated as 896 GB/s per GPU for all-reduce, an approximation.'),
    p2pOverPcie: DC_P2P, cooling: PASSIVE, slots: NO_SLOTS,
    formFactor: pub('oam3', '', 'wiki-amd-instinct', 'OAM module; token groups MI300X-class boards'),
    priceUSD: est(20000, 'USD', 'List price undisclosed (article). Cloud on-demand from $2.59/GPU-h, below the MI355X ($8.60/GPU-h); assumed below the H100 SXM 2026 range ($25k-31k). Flagged.', 'price-il-dc'),
  },
  {
    id: 'gpu-tessera-t288', category: 'gpu', tier: 'datacenter',
    displayName: 'Corvid Tessera T288', realRef: 'AMD Instinct MI355X',
    vramGB: pub(288, 'GB', 'wiki-amd-instinct'), memBandwidthGBs: pub(8000, 'GB/s', 'wiki-amd-instinct'), memType: pub('HBM3e', '', 'wiki-amd-instinct'),
    fp16TensorTflops: est(2500, 'TFLOPS', 'The table lists 5,000 in the INT8 column and only vector FP16 (157.3). On the MI300X row dense FP16 matrix is exactly half of INT8 (1,307.4 vs 2,614.9); the same ratio gives 2,500.', 'wiki-amd-instinct'),
    fp16AccTensorTflops: est(2500, 'TFLOPS', 'Same as fp16TensorTflops.', 'wiki-amd-instinct'),
    fp32Tflops: pub(157.3, 'TFLOPS', 'wiki-amd-instinct'), int8TensorTops: pub(5000, 'TOPS', 'wiki-amd-instinct'),
    boostClockMHz: pub(2400, 'MHz', 'wiki-amd-instinct'),
    boardPowerW: pub(1400, 'W', 'wiki-amd-instinct', 'typical board power'),
    idlePowerW: est(150, 'W', IDLE_REASON(150, 1400) + ' Rounded down.'), maxTempC: MAXT,
    pcieGen: pub(5, '', 'wiki-amd-instinct'), pcieLanes: pub(16, 'lanes', 'wiki-amd-instinct'),
    linkType: est('infinity-fabric', '', 'Same Infinity Fabric baseboard design as the MI300X platform.'),
    linkBandwidthGBs: est(896, 'GB/s', 'No figure on an opened page; assumed the same 7-link mesh bandwidth as the MI300X platform. Flagged.'),
    p2pOverPcie: DC_P2P, cooling: PASSIVE, slots: NO_SLOTS,
    formFactor: pub('oam4', '', 'wiki-amd-instinct', 'OAM module; token groups MI355X-class boards'),
    priceUSD: est(45000, 'USD', 'List price undisclosed (article). Same 288 GB HBM3e class as the B300 (~$53k) and B200 (street $45-50k), cloud rate $8.60/GPU-h; assumed at the B200 street low end. Flagged.', 'price-il-dc'),
  },
];
