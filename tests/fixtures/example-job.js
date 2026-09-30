// Hand-written fixtures for the brief's example job. NOT produced by a job
// generator (that is stage 4). Room values here are test fixtures, labeled as
// estimates: real room values come from the job generator once it exists.

export const exampleJobSpec = {
  source: 'brief example job (hand-written, not generated)',
  workloads: ['Minecraft servers', 'AI model up to 32B parameters'],
  targets: { decodeTokS: 20, contextTokens: 262144, maxWallW: 1000, noise: 'quiet', room: 'small closed space, must not overheat' },
};

export const smallClosedRoom = {
  _note: 'Fixture. A 2.0 x 1.5 m closet, 2.4 m ceiling. wallUValue and airChangesPerHour are estimates (not found on an opened page): an uninsulated stud wall with gypsum both sides is taken as ~1.8 W/m2K, and a shut door with no HVAC as 0.5 air changes/hour.',
  floorAreaM2: 3.0,
  heightM: 2.4,
  wallAreaM2: 2 * (2.0 + 1.5) * 2.4 + 2 * 3.0,
  wallUValue: 1.8,
  airChangesPerHour: 0.5,
  ambientC: 22,
  listenerDistanceM: 2,
  closed: true,
};

// A reasonable player build for the example job.
export const exampleBuild = {
  gpus: [{ part: 'gpu-ember-g5-32' }],
  cpu: 'cpu-vela-16',
  cooler: 'clr-frostline-d2',
  ram: [{ part: 'ram-sprint-2x32-d5', count: 1 }],
  storage: [{ part: 'sto-strata-nova-2', count: 1 }],
  psu: 'psu-voltaic-p1000',
  chassis: 'chs-hollow-quiet-xl',
  fans: [],
  network: [],
};

export const exampleSoftware = {
  inference: {
    engine: 'eng-kettle', model: 'mdl-quill-3-30b-a3b', quant: 'Q4_K_M', kvType: 'q8_0',
    contextLength: 262144, concurrency: 1, splitMode: 'none', gpuLayers: 'all',
  },
  gameServers: [{ type: 'minecraft', players: 20 }],
};
