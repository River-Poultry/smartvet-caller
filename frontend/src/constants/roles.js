export const ROLES = {
  admin:      { label: 'Admin',      color: 'green',  description: 'Full system access — user management, all dispatches, reports' },
  supervisor: { label: 'Supervisor', color: 'blue',   description: 'Monitor agents, view all calls and dispatches, escalation control' },
  agent:      { label: 'Agent',      color: 'gray',   description: 'Handle inbound calls, create dispatches, farmer registration' },
  trainee:    { label: 'Trainee',    color: 'yellow', description: 'Observe calls and data — read-only, no dispatch authority' },
};

export const ROLE_ORDER = ['admin', 'supervisor', 'agent', 'trainee'];

export function canManageUsers(role) {
  return role === 'admin';
}

export function canViewAdminDashboard(role) {
  return role === 'admin' || role === 'supervisor';
}
