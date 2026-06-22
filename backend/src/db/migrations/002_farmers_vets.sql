-- Migration 002: Farmers, Farms, Vets/Paravets

CREATE TABLE farmers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  alt_phone VARCHAR(20),
  district VARCHAR(100),
  sub_county VARCHAR(100),
  village VARCHAR(100),
  location_lat FLOAT,
  location_lng FLOAT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE farms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  name VARCHAR(255),
  animal_type VARCHAR(50) NOT NULL DEFAULT 'poultry',
  flock_size INT,
  housing_type VARCHAR(100),
  location_lat FLOAT,
  location_lng FLOAT,
  location_address TEXT,
  paravet_assigned_id UUID,
  last_visit_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'paravet', -- 'paravet' | 'vet'
  district VARCHAR(100),
  sub_county VARCHAR(100),
  location_lat FLOAT,
  location_lng FLOAT,
  specialisation VARCHAR(255) DEFAULT 'Poultry',
  is_available BOOLEAN DEFAULT true,
  current_job_id UUID,
  total_visits INT DEFAULT 0,
  rating FLOAT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track symptoms during a call
CREATE TABLE call_symptoms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  symptom VARCHAR(255) NOT NULL,
  severity VARCHAR(20) DEFAULT 'moderate', -- mild | moderate | severe
  added_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link farmers to calls
ALTER TABLE calls ADD COLUMN IF NOT EXISTS farmer_ref_id UUID REFERENCES farmers(id);

-- Seed farmers (Uganda context)
INSERT INTO farmers (name, phone, district, sub_county, village, location_lat, location_lng) VALUES
  ('Okello James',     '+256700123456', 'Kampala',   'Kawempe',    'Bwaise',       0.3476,  32.5825),
  ('Nakato Sarah',     '+256772345678', 'Wakiso',    'Nansana',    'Nabweru',      0.3722,  32.5108),
  ('Mugisha Peter',    '+256753456789', 'Mukono',    'Goma',       'Seeta',        0.3333,  32.7167),
  ('Apio Grace',       '+256781234567', 'Jinja',     'Bugembe',    'Walukuba',     0.4356,  33.2058),
  ('Tumwine Robert',   '+256704567890', 'Mbarara',   'Kakiika',    'Ruharo',      -0.6167,  30.6500),
  ('Namukasa Fatuma',  '+256756789012', 'Masaka',    'Nyendo',     'Kimaanya',    -0.3333,  31.7333),
  ('Kato Emmanuel',    '+256779012345', 'Luwero',    'Bamunanika', 'Wobulenzi',    0.7000,  32.6000),
  ('Akello Doreen',    '+256752345678', 'Gulu',      'Laroo',      'Pece',         2.7667,  32.3056);

-- Seed farms (link to farmers by order)
INSERT INTO farms (farmer_id, name, animal_type, flock_size, housing_type, location_address)
SELECT id, name || ' Poultry Farm', 'broilers',
  CASE name
    WHEN 'Okello James'   THEN 500
    WHEN 'Nakato Sarah'   THEN 1200
    WHEN 'Mugisha Peter'  THEN 800
    WHEN 'Apio Grace'     THEN 350
    WHEN 'Tumwine Robert' THEN 2000
    WHEN 'Namukasa Fatuma'THEN 600
    WHEN 'Kato Emmanuel'  THEN 950
    WHEN 'Akello Doreen'  THEN 400
  END,
  'deep litter', district || ', ' || sub_county
FROM farmers;

-- Seed vets/paravets
INSERT INTO vets (name, phone, role, district, sub_county, location_lat, location_lng, specialisation, is_available, rating) VALUES
  ('Dr. Ssali Moses',    '+256701111111', 'vet',      'Kampala',  'Kawempe',   0.3476, 32.5825, 'Poultry & Livestock', true,  4.8),
  ('Peter Muwanga',      '+256702222222', 'paravet',  'Kampala',  'Makindye',  0.2833, 32.6000, 'Poultry',             true,  4.5),
  ('Grace Nakato',       '+256703333333', 'paravet',  'Wakiso',   'Nansana',   0.3722, 32.5108, 'Poultry',             true,  4.7),
  ('Dr. Achen Betty',    '+256704444444', 'vet',      'Jinja',    'Bugembe',   0.4356, 33.2058, 'Poultry & Swine',     true,  4.9),
  ('Okwir Samuel',       '+256705555555', 'paravet',  'Mukono',   'Goma',      0.3333, 32.7167, 'Poultry',             false, 4.3),
  ('Nasimolo Juliet',    '+256706666666', 'paravet',  'Wakiso',   'Entebbe',   0.0500, 32.4500, 'Layers & Broilers',   true,  4.6),
  ('Dr. Tugume Alex',    '+256707777777', 'vet',      'Mbarara',  'Kakiika',  -0.6167, 30.6500, 'Poultry & Cattle',    true,  4.7),
  ('Karungi Patience',   '+256708888888', 'paravet',  'Masaka',   'Nyendo',   -0.3333, 31.7333, 'Poultry',             true,  4.4);

-- Update call_symptoms updated_at trigger
CREATE TRIGGER trg_farmers_updated_at BEFORE UPDATE ON farmers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_vets_updated_at BEFORE UPDATE ON vets FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_farmers_phone ON farmers(phone);
CREATE INDEX idx_farms_farmer_id ON farms(farmer_id);
CREATE INDEX idx_vets_available ON vets(is_available, district);
