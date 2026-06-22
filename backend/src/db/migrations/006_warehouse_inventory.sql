-- Migration 006: Warehouse/central store + vet stock model
-- Vets carry their own field stock; warehouse is the replenishment source

-- Add warehouse_stock column to vet_inventory (vet's personal field allocation)
ALTER TABLE vet_inventory ADD COLUMN IF NOT EXISTS quantity_in_stock numeric(10,2) DEFAULT 0;
ALTER TABLE vet_inventory ADD COLUMN IF NOT EXISTS last_updated_by varchar(255);

-- Update quantity_in_stock from existing quantity column
UPDATE vet_inventory SET quantity_in_stock = quantity WHERE quantity_in_stock = 0;

-- Central warehouse / main store
CREATE TABLE IF NOT EXISTS warehouse_inventory (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_name    varchar(255) NOT NULL UNIQUE,
  category        varchar(100),
  unit            varchar(30) DEFAULT 'dose',
  quantity        numeric(10,2) NOT NULL DEFAULT 0,
  min_stock       numeric(10,2) DEFAULT 20,
  diseases        text[],
  notes           text,
  updated_at      timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warehouse_product ON warehouse_inventory(product_name);

-- Warehouse stock allocation log (tracks vet draws from warehouse)
CREATE TABLE IF NOT EXISTS stock_allocations (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_item_id uuid REFERENCES warehouse_inventory(id),
  vet_inventory_id  uuid REFERENCES vet_inventory(id),
  vet_django_id   varchar(50),
  vet_name        varchar(255),
  product_name    varchar(255),
  quantity_allocated numeric(10,2) NOT NULL,
  notes           text,
  allocated_by    varchar(255),
  allocated_at    timestamptz DEFAULT NOW()
);

-- Seed warehouse with same products as vet_inventory seeds
INSERT INTO warehouse_inventory (product_name, category, unit, quantity, diseases) VALUES
  ('Newcastle I2 Vaccine',        'vaccine',        'dose', 5000, ARRAY['Newcastle Disease (ND)']),
  ('Gumboro Vaccine (IBD)',        'vaccine',        'dose', 3000, ARRAY['Gumboro Disease (IBD)']),
  ('Amprolium (Corid)',            'antiparasitic',  'ml',   2000, ARRAY['Coccidiosis']),
  ('Enrofloxacin',                'antibiotic',     'ml',   1500, ARRAY['Fowl Typhoid / Salmonellosis','Chronic Respiratory Disease (CRD / Mycoplasma)']),
  ('Tylosin Tartrate',            'antibiotic',     'g',    1000, ARRAY['Chronic Respiratory Disease (CRD / Mycoplasma)']),
  ('Doxycycline HCL',             'antibiotic',     'g',     800, ARRAY['Fowl Typhoid / Salmonellosis','Chronic Respiratory Disease (CRD / Mycoplasma)']),
  ('Oxytetracycline',             'antibiotic',     'g',    1200, ARRAY['Infectious Bronchitis (IB)']),
  ('Toltrazuril',                 'antiparasitic',  'ml',   1800, ARRAY['Coccidiosis']),
  ('Vitamin K',                   'vitamin',        'ml',   3000, ARRAY['Coccidiosis']),
  ('Vitamin C + Electrolytes',    'vitamin',        'g',    5000, ARRAY['Newcastle Disease (ND)','Gumboro Disease (IBD)']),
  ('Fowl Pox Vaccine',            'vaccine',        'dose', 2000, ARRAY['Fowl Pox']),
  ('Marek HVT Vaccine',           'vaccine',        'dose', 1000, ARRAY['Marek''s Disease'])
ON CONFLICT (product_name) DO NOTHING;
