CREATE TABLE IF NOT EXISTS batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  bird_type VARCHAR(50) NOT NULL DEFAULT 'broiler', -- broiler|layer|sasso|kuroiler|rainbow_rooster
  current_stage VARCHAR(50) DEFAULT 'brooding', -- brooding|growing|finishing|laying
  arrival_date DATE NOT NULL,
  total_birds INT DEFAULT 0,
  healthy_birds INT DEFAULT 0,
  dead_birds INT DEFAULT 0,
  sick_birds INT DEFAULT 0,
  avg_weight DECIMAL(5,2) DEFAULT 0,
  description TEXT,
  assigned_vet_id UUID REFERENCES vets(id),
  vetaplay_batch_id INT, -- link to vetaplay
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS batch_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  task_type VARCHAR(50) DEFAULT 'routine activity',
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'pending', -- pending|completed|overdue|skipped
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  assigned_to VARCHAR(20) DEFAULT 'farmer', -- farmer|vet
  vetaplay_task_id INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_batches_farmer ON batches(farmer_id);
CREATE INDEX IF NOT EXISTS idx_batch_tasks_batch ON batch_tasks(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_tasks_scheduled ON batch_tasks(scheduled_at);
