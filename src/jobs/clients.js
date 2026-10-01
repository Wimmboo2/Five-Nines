// Clients the job generator rolls. These are game-design values (who asks for
// what, and what they care about), not measurements of the real world.
// priorities: weight of each scoring axis in percent (they sum to 100).
// Axes: performance, budget, power, noise, temperature.

// Values picked by Claude, pending the user's sign-off: see docs/decisions.md,
// "Game-design values picked by Claude, pending sign-off".
export const CLIENTS = [
  // homelab
  { id: 'cl-tinkerer', tier: 'homelab', name: 'Hobbyist tinkerer', jobTypes: ['inference', 'mixed', 'cloud'],
    priorities: { performance: 35, budget: 35, noise: 15, power: 5, temperature: 10 } },
  { id: 'cl-remote', tier: 'homelab', name: 'Remote worker', jobTypes: ['inference'],
    priorities: { performance: 25, budget: 20, noise: 35, power: 10, temperature: 10 } },
  { id: 'cl-student', tier: 'homelab', name: 'Student on a budget', jobTypes: ['inference', 'game-server'],
    priorities: { performance: 25, budget: 50, noise: 10, power: 10, temperature: 5 } },
  { id: 'cl-guild', tier: 'homelab', name: 'Gaming group host', jobTypes: ['game-server', 'mixed'],
    priorities: { performance: 40, budget: 30, noise: 10, power: 10, temperature: 10 } },
  // server
  { id: 'cl-lawfirm', tier: 'server', name: 'Small law office', jobTypes: ['inference', 'cloud'],
    priorities: { performance: 25, budget: 25, noise: 20, power: 15, temperature: 15 } },
  { id: 'cl-gamehost', tier: 'server', name: 'Game server host', jobTypes: ['game-server', 'mixed'],
    priorities: { performance: 45, budget: 25, noise: 5, power: 15, temperature: 10 } },
  { id: 'cl-startup', tier: 'server', name: 'AI startup', jobTypes: ['inference', 'mixed'],
    priorities: { performance: 50, budget: 20, noise: 5, power: 15, temperature: 10 } },
  { id: 'cl-vps', tier: 'server', name: 'Small VPS host', jobTypes: ['cloud'],
    priorities: { performance: 40, budget: 30, noise: 5, power: 15, temperature: 10 } },
  // mini datacenter (noise is not judged in a data hall)
  { id: 'cl-lab', tier: 'datacenter', name: 'Research lab', jobTypes: ['inference'],
    priorities: { performance: 50, budget: 25, noise: 0, power: 15, temperature: 10 } },
  { id: 'cl-provider', tier: 'datacenter', name: 'Inference provider', jobTypes: ['inference'],
    priorities: { performance: 40, budget: 20, noise: 0, power: 30, temperature: 10 } },
  { id: 'cl-university', tier: 'datacenter', name: 'University cluster', jobTypes: ['inference'],
    priorities: { performance: 35, budget: 40, noise: 0, power: 15, temperature: 10 } },
];

export const TIERS = ['homelab', 'server', 'datacenter'];
