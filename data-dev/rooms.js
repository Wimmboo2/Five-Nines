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
