export const ROLES = {
  admin:      { label: 'Admin',       color: 'green',  description: 'Full system access — user management, all dispatches, reports' },
  supervisor: { label: 'Supervisor',  color: 'blue',   description: 'Monitor agents, view all calls and dispatches, escalation control' },
  agent:      { label: 'Agent',       color: 'gray',   description: 'Handle inbound calls, create dispatches, farmer registration' },
  trainee:    { label: 'Trainee',     color: 'yellow', description: 'Observe calls and data — read-only, no dispatch authority' },
  vet_board:  { label: 'Vet Board',   color: 'teal',   description: 'Senior veterinarians — review AI diagnoses, provide expert feedback for model improvement' },
};

export const ROLE_ORDER = ['admin', 'supervisor', 'agent', 'trainee', 'vet_board'];
