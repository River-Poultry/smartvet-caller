-- Migration 005: Escalation levels + vet inventory

-- Add escalation columns to dispatch table
ALTER TABLE vet_dispatch_requests
  ADD COLUMN IF NOT EXISTS escalation_level    smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS escalated_at        timestamptz,
  ADD COLUMN IF NOT EXISTS escalation_notes    text,
  ADD COLUMN IF NOT EXISTS resolved_at         timestamptz,
  ADD COLUMN IF NOT EXISTS agent_notes         text,
  ADD COLUMN IF NOT EXISTS top_diagnosis       varchar(200),
  ADD COLUMN IF NOT EXISTS diagnosis_confidence numeric(4,3);

-- Add notes column to calls table
ALTER TABLE calls
  ADD COLUMN IF NOT EXISTS agent_notes text,
  ADD COLUMN IF NOT EXISTS call_outcome varchar(50);

-- Vet inventory — what each vet currently carries
CREATE TABLE IF NOT EXISTS vet_inventory (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vet_django_id varchar(50) NOT NULL,   -- Django vet id (django-vet-{id})
  vet_name      varchar(255),
  product_name  varchar(255) NOT NULL,
  category      varchar(100),           -- vaccine, antibiotic, antiparasitic, vitamin, other
  unit          varchar(30) DEFAULT 'dose',
  quantity      numeric(10,2) NOT NULL DEFAULT 0,
  min_stock     numeric(10,2) DEFAULT 5,
  diseases      text[],                 -- disease names this treats
  notes         text,
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vet_inventory_vet ON vet_inventory(vet_django_id);
CREATE INDEX IF NOT EXISTS idx_vet_inventory_product ON vet_inventory(product_name);

-- Seed common veterinary products (can be managed via admin later)
INSERT INTO vet_inventory (vet_django_id, vet_name, product_name, category, unit, quantity, diseases) VALUES
  ('1', 'Akello Kevin', 'Newcastle I2 Vaccine', 'vaccine', 'dose', 500, ARRAY['Newcastle Disease (ND)']),
  ('1', 'Akello Kevin', 'Gumboro Vaccine (IBD)', 'vaccine', 'dose', 300, ARRAY['Gumboro Disease (IBD)']),
  ('1', 'Akello Kevin', 'Amprolium (Corid)', 'antiparasitic', 'ml', 200, ARRAY['Coccidiosis']),
  ('1', 'Akello Kevin', 'Enrofloxacin', 'antibiotic', 'ml', 150, ARRAY['Fowl Typhoid / Salmonellosis', 'Chronic Respiratory Disease (CRD / Mycoplasma)']),
  ('2', 'Allan Jr', 'Tylosin Tartrate', 'antibiotic', 'g', 100, ARRAY['Chronic Respiratory Disease (CRD / Mycoplasma)']),
  ('2', 'Allan Jr', 'Doxycycline HCL', 'antibiotic', 'g', 80, ARRAY['Fowl Typhoid / Salmonellosis', 'Chronic Respiratory Disease (CRD / Mycoplasma)']),
  ('2', 'Allan Jr', 'Oxytetracycline', 'antibiotic', 'g', 120, ARRAY['Infectious Bronchitis (IB)']),
  ('2', 'Allan Jr', 'Toltrazuril', 'antiparasitic', 'ml', 180, ARRAY['Coccidiosis']),
  ('3', 'Dr. Lawrence Opiyo', 'Vitamin K', 'vitamin', 'ml', 300, ARRAY['Coccidiosis']),
  ('3', 'Dr. Lawrence Opiyo', 'Vitamin C + Electrolytes', 'vitamin', 'g', 500, ARRAY['Newcastle Disease (ND)', 'Gumboro Disease (IBD)']),
  ('3', 'Dr. Lawrence Opiyo', 'Fowl Pox Vaccine', 'vaccine', 'dose', 200, ARRAY['Fowl Pox']),
  ('3', 'Dr. Lawrence Opiyo', 'Marek HVT Vaccine', 'vaccine', 'dose', 100, ARRAY['Marek''s Disease'])
ON CONFLICT DO NOTHING;
