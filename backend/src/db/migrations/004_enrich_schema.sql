-- Migration 004: Enrich batches, farmers for Vetaplay integration

-- Farmers: add vet assignment + profile fields
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS matched_vet_id UUID REFERENCES vets(id);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS chicken_type VARCHAR(50);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(64) DEFAULT 'English';
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS is_registered BOOLEAN DEFAULT true;

-- Batches: add vet info columns + stage tracking
ALTER TABLE batches ADD COLUMN IF NOT EXISTS assigned_vet_name VARCHAR(255);
ALTER TABLE batches ADD COLUMN IF NOT EXISTS assigned_vet_phone VARCHAR(20);
ALTER TABLE batches ADD COLUMN IF NOT EXISTS next_vet_visit DATE;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS last_vet_visit DATE;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Batch tasks: add name + person_assigned
ALTER TABLE batch_tasks ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE batch_tasks ADD COLUMN IF NOT EXISTS person_assigned VARCHAR(20) DEFAULT 'farmer';
ALTER TABLE batch_tasks ADD COLUMN IF NOT EXISTS estimated_time VARCHAR(50);
ALTER TABLE batch_tasks ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false;
ALTER TABLE batch_tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill name from description
UPDATE batch_tasks SET name = LEFT(description, 100) WHERE name IS NULL;

-- Auto-assign matched vets to farmers based on district
UPDATE farmers f SET matched_vet_id = (
  SELECT v.id FROM vets v
  WHERE v.district = f.district AND v.is_available = true
  ORDER BY v.rating DESC LIMIT 1
) WHERE f.matched_vet_id IS NULL;

-- Backfill vet info on batches
UPDATE batches b SET
  assigned_vet_name = v.name,
  assigned_vet_phone = v.phone
FROM vets v WHERE v.id = b.assigned_vet_id AND b.assigned_vet_name IS NULL;

-- Seed sample batches if none exist
INSERT INTO batches (farmer_id, bird_type, current_stage, arrival_date, total_birds, healthy_birds, sick_birds, dead_birds, is_active, next_vet_visit, assigned_vet_id, assigned_vet_name, assigned_vet_phone)
SELECT
  f.id,
  CASE row_number() OVER (ORDER BY f.name) % 4
    WHEN 0 THEN 'broiler' WHEN 1 THEN 'layer' WHEN 2 THEN 'sasso' ELSE 'kuroiler'
  END,
  CASE row_number() OVER (ORDER BY f.name) % 4
    WHEN 0 THEN 'brooding' WHEN 1 THEN 'growing' WHEN 2 THEN 'finishing' ELSE 'laying'
  END,
  CURRENT_DATE - ((row_number() OVER (ORDER BY f.name) % 8) * 7 || ' days')::interval,
  CASE row_number() OVER (ORDER BY f.name) % 5
    WHEN 0 THEN 500 WHEN 1 THEN 1200 WHEN 2 THEN 800 WHEN 3 THEN 350 ELSE 2000
  END,
  CASE row_number() OVER (ORDER BY f.name) % 5
    WHEN 0 THEN 492 WHEN 1 THEN 1180 WHEN 2 THEN 790 WHEN 3 THEN 340 ELSE 1960
  END,
  CASE row_number() OVER (ORDER BY f.name) % 5 WHEN 0 THEN 3 ELSE 2 END,
  CASE row_number() OVER (ORDER BY f.name) % 5 WHEN 0 THEN 5 ELSE 8 END,
  true,
  CURRENT_DATE + '7 days'::interval,
  v.id, v.name, v.phone
FROM farmers f
LEFT JOIN vets v ON v.district = f.district AND v.is_available = true
WHERE NOT EXISTS (SELECT 1 FROM batches b2 WHERE b2.farmer_id = f.id);

-- Seed vaccination tasks for each batch that has none
INSERT INTO batch_tasks (batch_id, name, description, task_type, person_assigned, priority, scheduled_at, status)
SELECT
  b.id,
  t.task_name,
  t.task_name,
  'vaccination',
  'vet',
  'high',
  (b.arrival_date + t.offset_days * INTERVAL '1 day' + INTERVAL '8 hours') AT TIME ZONE 'Africa/Kampala',
  CASE WHEN (b.arrival_date + t.offset_days * INTERVAL '1 day') < CURRENT_DATE THEN 'completed' ELSE 'pending' END
FROM batches b
CROSS JOIN (VALUES
  (1,  'Newcastle + IB Vaccination (ND+IB)'),
  (7,  'Gumboro (IBD) Vaccination'),
  (14, 'Newcastle Booster'),
  (21, 'Gumboro Booster (IBD)'),
  (28, 'Fowl Typhoid Vaccination (FT)'),
  (35, 'Fowl Pox Vaccination (FP)'),
  (42, 'Final Newcastle Booster')
) AS t(offset_days, task_name)
WHERE NOT EXISTS (SELECT 1 FROM batch_tasks bt WHERE bt.batch_id = b.id AND bt.task_type = 'vaccination');

-- Seed routine tasks for each batch that has none
INSERT INTO batch_tasks (batch_id, name, description, task_type, person_assigned, priority, scheduled_at, status)
SELECT
  b.id,
  t.task_name,
  t.task_name,
  'routine activity',
  'farmer',
  'medium',
  (b.arrival_date + t.offset_days * INTERVAL '1 day' + INTERVAL '7 hours') AT TIME ZONE 'Africa/Kampala',
  CASE WHEN (b.arrival_date + t.offset_days * INTERVAL '1 day') < CURRENT_DATE THEN 'completed' ELSE 'pending' END
FROM batches b
CROSS JOIN (VALUES
  (0,  'Chick arrival — brooding setup check'),
  (3,  'Day 3 weight check & feed adjustment'),
  (10, 'Mid-grow health inspection'),
  (20, 'Litter management & biosecurity check'),
  (30, 'Pre-sale weight recording')
) AS t(offset_days, task_name)
WHERE NOT EXISTS (SELECT 1 FROM batch_tasks bt WHERE bt.batch_id = b.id AND bt.task_type = 'routine activity');

-- Triggers
DO $$ BEGIN
  CREATE TRIGGER trg_batches_updated_at BEFORE UPDATE ON batches FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_batch_tasks_updated_at BEFORE UPDATE ON batch_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_farmers_matched_vet ON farmers(matched_vet_id);
CREATE INDEX IF NOT EXISTS idx_batches_vet ON batches(assigned_vet_id);
CREATE INDEX IF NOT EXISTS idx_batches_active ON batches(is_active);
