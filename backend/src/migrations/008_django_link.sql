ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS django_id INTEGER,
  ADD COLUMN IF NOT EXISTS django_role VARCHAR(20);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_django_id ON agents(django_id) WHERE django_id IS NOT NULL;
