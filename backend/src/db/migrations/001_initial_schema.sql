-- SmartVet Call Centre - Initial Schema
-- Migration 001

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
CREATE TYPE agent_status AS ENUM ('offline', 'online', 'on_call', 'on_break');
CREATE TYPE transcript_status AS ENUM ('pending', 'completed', 'failed');
CREATE TYPE call_intent AS ENUM ('product_inquiry', 'disease_diagnosis', 'vet_request', 'pricing_question', 'vaccination_inquiry', 'other');
CREATE TYPE urgency_level AS ENUM ('emergency', 'scheduled');
CREATE TYPE dispatch_status AS ENUM ('pending', 'assigned', 'in_progress', 'completed', 'cancelled');
CREATE TYPE speaker_type AS ENUM ('farmer', 'agent', 'system');
CREATE TYPE suggestion_category AS ENUM ('disease_diagnosis', 'product_recommendation', 'escalation_alert', 'general_advice');
CREATE TYPE call_outcome AS ENUM ('resolved', 'vet_requested', 'follow_up', 'no_action', 'transferred');
CREATE TYPE contact_method AS ENUM ('sms', 'whatsapp');

-- Agents
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  twilio_worker_sid VARCHAR(50),
  status agent_status NOT NULL DEFAULT 'offline',
  is_admin BOOLEAN DEFAULT false,
  total_calls INT DEFAULT 0,
  avg_call_duration_seconds INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calls
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id),
  farmer_id VARCHAR(100),
  farmer_name VARCHAR(255),
  phone_number VARCHAR(20) NOT NULL,
  twilio_call_sid VARCHAR(50) UNIQUE,
  twilio_conference_sid VARCHAR(50),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INT,
  recording_url TEXT,
  recording_sid VARCHAR(50),
  transcript_text TEXT,
  transcript_status transcript_status DEFAULT 'pending',
  call_intent call_intent DEFAULT 'other',
  is_emergency BOOLEAN DEFAULT false,
  agent_notes TEXT,
  outcome call_outcome,
  next_steps TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Call transcript segments
CREATE TABLE call_transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  timestamp_offset_seconds FLOAT,
  speaker speaker_type NOT NULL,
  text TEXT NOT NULL,
  confidence_score FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI suggestions
CREATE TABLE ai_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  transcript_segment_id UUID REFERENCES call_transcripts(id),
  suggestion_text TEXT NOT NULL,
  category suggestion_category NOT NULL,
  confidence_score FLOAT,
  actions JSONB DEFAULT '[]',
  was_acted_on BOOLEAN DEFAULT false,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vet dispatch requests
CREATE TABLE vet_dispatch_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id UUID REFERENCES calls(id),
  farmer_id VARCHAR(100) NOT NULL,
  farmer_name VARCHAR(255),
  farmer_phone VARCHAR(20),
  farm_id VARCHAR(100),
  farm_name VARCHAR(255),
  urgency_level urgency_level NOT NULL DEFAULT 'scheduled',
  visit_type VARCHAR(100),
  symptoms_description TEXT,
  animal_type VARCHAR(50),
  animal_count INT,
  requested_date DATE,
  requested_time_window VARCHAR(50),
  assigned_paravet_id VARCHAR(100),
  assigned_paravet_name VARCHAR(255),
  assigned_paravet_phone VARCHAR(20),
  assigned_vet_id VARCHAR(100),
  status dispatch_status NOT NULL DEFAULT 'pending',
  location_lat FLOAT,
  location_lng FLOAT,
  location_address TEXT,
  farmer_contact_sent BOOLEAN DEFAULT false,
  contact_method contact_method,
  core_job_id VARCHAR(100),
  eta_minutes INT,
  agent_id UUID REFERENCES agents(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent sessions (for presence tracking)
CREATE TABLE agent_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_calls_agent_id ON calls(agent_id);
CREATE INDEX idx_calls_phone_number ON calls(phone_number);
CREATE INDEX idx_calls_twilio_sid ON calls(twilio_call_sid);
CREATE INDEX idx_calls_started_at ON calls(started_at DESC);
CREATE INDEX idx_call_transcripts_call_id ON call_transcripts(call_id);
CREATE INDEX idx_ai_suggestions_call_id ON ai_suggestions(call_id);
CREATE INDEX idx_vet_dispatch_status ON vet_dispatch_requests(status);
CREATE INDEX idx_vet_dispatch_farmer ON vet_dispatch_requests(farmer_id);
CREATE INDEX idx_vet_dispatch_created ON vet_dispatch_requests(created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_calls_updated_at BEFORE UPDATE ON calls FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_dispatch_updated_at BEFORE UPDATE ON vet_dispatch_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed admin agent
INSERT INTO agents (name, email, password_hash, is_admin, status)
VALUES ('Admin', 'admin@smartvet.africa', '$2a$10$placeholder_replace_on_first_run', true, 'offline');
