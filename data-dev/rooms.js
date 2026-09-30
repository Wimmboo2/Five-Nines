import { est } from './lib.js';

// Room schema. Room VALUES are generated per job by the job generator (stage 4),
// which needs the user's answers first. Only the fields the thermal model reads
// are defined here, with units.
export const roomSchema = {
  floorAreaM2: { unit: 'm2', meaning: 'Floor area of the room' },
  heightM: { unit: 'm', meaning: 'Ceiling height' },
  wallAreaM2: { unit: 'm2', meaning: 'Area of walls, ceiling and floor that exchange heat with the room air' },
  wallUValue: { unit: 'W/(m2 K)', meaning: 'Overall heat transfer coefficient of the room envelope (not found on an opened page; job generator must supply it)' },
  airChangesPerHour: { unit: '1/h', meaning: 'Outside air exchanged per hour by ventilation or leakage' },
  ambientC: { unit: 'C', meaning: 'Temperature of the air coming in and of the space behind the walls' },
  listenerDistanceM: { unit: 'm', meaning: 'Where noise is judged from (distance to the build)' },
  closed: { unit: 'bool', meaning: 'Door closed, no HVAC' },
};


// Room archetypes the job generator rolls from, per job tier. Each field is a
// [min, max] range; the generator picks uniformly inside it with the job seed.
// wallAreaM2 is not stored: the generator derives it from a square floor plan
// (2 x floor + 4 x sqrt(floor) x height).
const range = (lo, hi, unit, reasoning, source) => ({ min: est(lo, unit, reasoning, source), max: est(hi, unit, reasoning, source) });
const HOME_U = range(1.0, 1.8, 'W/(m2 K)', 'No U-value found on an opened page. Interior walls and doors of a home room assumed 1.0-1.8 (the stage-3 test fixture used 1.8).');

export const roomArchetypes = [
  {
    id: 'room-closet', tier: 'homelab', displayName: 'Closet or cupboard',
    floorAreaM2: range(2, 4, 'm2', 'Small walk-in closet or cupboard; assumed.'), heightM: range(2.4, 2.6, 'm', 'Typical home ceiling; assumed.'),
    wallUValue: HOME_U,
    airChangesPerHour: range(0.3, 1, '1/h', 'Closed door, no ventilation: only leakage. Engineering ToolBox recommended rates (offices 4/h) are for ventilated rooms; a closet is assumed well below.', 'etb-ach'),
    ambientC: range(20, 26, 'C', 'Indoor home temperature range; assumed.'), listenerDistanceM: range(1, 3, 'm', 'Someone in the next room or at the door; assumed.'),
  },
  {
    id: 'room-office', tier: 'homelab', displayName: 'Home office',
    floorAreaM2: range(8, 14, 'm2', 'Spare bedroom used as an office; assumed.'), heightM: range(2.4, 2.7, 'm', 'Typical home ceiling; assumed.'),
    wallUValue: HOME_U,
    airChangesPerHour: range(1, 4, '1/h', 'Up to the recommended 4/h for a private office (Engineering ToolBox); homes often run lower.', 'etb-ach'),
    ambientC: range(20, 25, 'C', 'Indoor home temperature range; assumed.'), listenerDistanceM: range(1, 2, 'm', 'Person working at the desk next to the build; assumed.'),
  },
  {
    id: 'room-garage', tier: 'homelab', displayName: 'Garage',
    floorAreaM2: range(15, 30, 'm2', 'Single or double garage; assumed.'), heightM: range(2.4, 3, 'm', 'Typical ceiling height for this kind of room; assumed.'),
    wallUValue: range(1.5, 3, 'W/(m2 K)', 'Poorly insulated garage envelope; assumed.'),
    airChangesPerHour: range(1, 3, '1/h', 'Leaky garage door; assumed.'),
    ambientC: range(12, 30, 'C', 'Unconditioned space tracks outdoor temperature; assumed range.'), listenerDistanceM: range(3, 6, 'm', 'Nobody sits in the garage; noise judged from the house side; assumed.'),
  },
  {
    id: 'room-server-small', tier: 'server', displayName: 'Small server room',
    floorAreaM2: range(10, 20, 'm2', 'Office server room; assumed.'), heightM: range(2.7, 3, 'm', 'Typical ceiling height for this kind of room; assumed.'),
    wallUValue: range(0.8, 1.5, 'W/(m2 K)', 'Interior office walls and doors, not found on an opened page; assumed.'),
    airChangesPerHour: range(15, 20, '1/h', 'Engineering ToolBox recommends 15-20 air changes per hour for computer rooms.', 'etb-ach'),
    ambientC: range(18, 24, 'C', 'Conditioned office air; assumed.'), listenerDistanceM: range(3, 6, 'm', 'Nearest desk outside the room; assumed.'),
  },
  {
    id: 'room-office-corner', tier: 'server', displayName: 'Office corner rack',
    floorAreaM2: range(20, 40, 'm2', 'Open-plan office area around a rack; assumed.'), heightM: range(2.7, 3, 'm', 'Typical ceiling height for this kind of room; assumed.'),
    wallUValue: range(0.8, 1.5, 'W/(m2 K)', 'Interior office walls and doors, not found on an opened page; assumed.'),
    airChangesPerHour: range(4, 6, '1/h', 'Engineering ToolBox recommends about 4/h for offices; assumed 4-6.', 'etb-ach'),
    ambientC: range(20, 24, 'C', 'Conditioned office air; assumed.'), listenerDistanceM: range(2, 4, 'm', 'Staff desks nearby; assumed.'),
  },
  {
    id: 'room-data-hall', tier: 'datacenter', displayName: 'Small data hall',
    floorAreaM2: range(40, 120, 'm2', 'Mini datacenter hall; assumed.'), heightM: range(3, 4.5, 'm', 'Raised floor plus ceiling plenum; assumed.'),
    wallUValue: range(0.3, 0.8, 'W/(m2 K)', 'Insulated building envelope; assumed.'),
    airChangesPerHour: range(30, 60, '1/h', 'Stands in for precision (CRAC) cooling, which the room model has no separate term for: at 30-60 air changes per hour a 100 m2 x 3.5 m hall carries away ~14 kW with a 2-5 C rise. Estimate.'),
    ambientC: range(18, 24, 'C', 'Supply air temperature of the cooling units; assumed.'), listenerDistanceM: range(1, 2, 'm', 'Technician at the rack; noise is not scored for data halls.'),
  },
];
