// Formatting and per-category spec lists for the menus.

export const usd = (x) => (x == null ? '-' : '$' + Math.round(x).toLocaleString('en-US'));
export const num = (x, d = 0) => (x == null || !Number.isFinite(x) ? '-' : x.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d }));
export const gb = (bytes) => num(bytes / 1e9, 1) + ' GB';

export const CATEGORY_LABELS = {
  gpu: 'GPUs', cpu: 'CPUs', cooler: 'CPU coolers', ram: 'Memory', storage: 'Storage', psu: 'Power supplies',
  chassis: 'Cases and nodes', fan: 'Fans', network: 'Networking', pdu: 'Power distribution', rack: 'Racks',
};
export const TIER_LABELS = { consumer: 'Consumer', workstation: 'Workstation', server: 'Server', datacenter: 'Datacenter' };

// Which specs the shop shows for each category (first N shown on the card).
export const SPEC_KEYS = {
  gpu: ['vramGB', 'memBandwidthGBs', 'fp16TensorTflops', 'boardPowerW', 'formFactor', 'linkType', 'linkBandwidthGBs', 'cooling', 'slots'],
  cpu: ['cores', 'boostClockGHz', 'tdpW', 'memType', 'memChannels', 'pcieLanes', 'maxSockets'],
  cooler: ['type', 'thermalResistanceCW', 'noiseAtQuietDBA', 'noiseMaxDBA'],
  ram: ['type', 'moduleCount', 'perModuleGB', 'speedMTs', 'registered'],
  storage: ['kind', 'capacityTB', 'seqReadMBs', 'randReadIopsHighQD', 'activePowerW'],
  psu: ['ratedW', 'rating', 'formFactor'],
  chassis: ['formFactor', 'gpuBays', 'gpuSocket', 'fabric', 'cpuSockets', 'psuBays', 'maxSystemPowerW', 'expansionSlots', 'includedFans', 'fanMounts', 'rackUnits'],
  fan: ['sizeMm', 'maxAirflowCFM', 'maxStaticPressureMmH2O', 'maxNoiseSone', 'maxPowerW'],
  network: ['kind', 'maxPowerW', 'rackUnits', 'switchingTbps', 'noiseDBA'],
  pdu: ['capacityW', 'phases', 'outletsC13', 'outletsC19'],
  rack: ['rackUnits', 'heightMm', 'depthMm'],
};

export const SPEC_LABELS = {
  vramGB: 'Memory', memBandwidthGBs: 'Bandwidth', fp16TensorTflops: 'FP16 tensor', boardPowerW: 'Board power', formFactor: 'Form factor',
  linkType: 'GPU link', linkBandwidthGBs: 'Link bandwidth', cooling: 'Cooling', slots: 'Slots', cores: 'Cores', boostClockGHz: 'Boost clock',
  tdpW: 'TDP', memType: 'Memory type', memChannels: 'Channels', pcieLanes: 'PCIe lanes', maxSockets: 'Max sockets', type: 'Type',
  thermalResistanceCW: 'Thermal resistance', noiseAtQuietDBA: 'Noise (quiet)', noiseMaxDBA: 'Noise (max)', moduleCount: 'Modules',
  perModuleGB: 'Per module', speedMTs: 'Speed', registered: 'Registered', kind: 'Kind', capacityTB: 'Capacity', seqReadMBs: 'Seq. read',
  randReadIopsHighQD: 'Random read', activePowerW: 'Active power', ratedW: 'Rated', rating: 'Efficiency', gpuBays: 'GPU positions',
  gpuSocket: 'GPU socket', fabric: 'GPU fabric', cpuSockets: 'CPU sockets', psuBays: 'PSU bays', maxSystemPowerW: 'Max system power',
  expansionSlots: 'Expansion slots', includedFans: 'Included fans', fanMounts: 'Fan mounts', rackUnits: 'Rack units', sizeMm: 'Size',
  maxAirflowCFM: 'Airflow', maxStaticPressureMmH2O: 'Static pressure', maxNoiseSone: 'Loudness', maxPowerW: 'Power', switchingTbps: 'Switching',
  noiseDBA: 'Noise', capacityW: 'Capacity', phases: 'Phases', outletsC13: 'C13 outlets', outletsC19: 'C19 outlets', heightMm: 'Height', depthMm: 'Depth',
};

export function portsSummary(ports) {
  if (!Array.isArray(ports)) return null;
  return ports.map((p) => `${p.count.value}x ${p.speedGbps.value}G ${p.medium.value}`).join(', ');
}
