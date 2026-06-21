ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'agent';

CREATE INDEX IF NOT EXISTS idx_agents_role ON agents(role);

UPDATE agents SET role = 'admin' WHERE is_admin = true AND role = 'agent';
