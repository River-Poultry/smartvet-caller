-- Vet board role and structured AI suggestion review system

-- Expose role in agents (already exists from 009, this is a no-op safety net)
ALTER TABLE agents ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'agent';

-- Structured review table — richer than a boolean flag on ai_suggestions
CREATE TABLE IF NOT EXISTS vet_reviews (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  suggestion_id   UUID NOT NULL REFERENCES ai_suggestions(id) ON DELETE CASCADE,
  reviewer_id     UUID NOT NULL REFERENCES agents(id),
  -- Core verdict
  verdict         VARCHAR(10) NOT NULL CHECK (verdict IN ('correct', 'incorrect', 'partial')),
  -- Detailed breakdown
  diagnosis_accurate   BOOLEAN,   -- Was the primary disease name right?
  treatment_accurate   BOOLEAN,   -- Was the treatment advice appropriate?
  severity_accurate    BOOLEAN,   -- Was the emergency/severity call correct?
  confidence_accurate  BOOLEAN,   -- Was the AI confidence score appropriate?
  -- Free-text context
  field_note      TEXT,           -- Reviewer's field experience note
  suggested_diagnosis TEXT,       -- What the vet thinks it actually was (if incorrect)
  -- Severity override
  true_severity   VARCHAR(20) CHECK (true_severity IN ('low', 'moderate', 'high', 'critical', 'unknown')),
  -- Metadata
  reviewed_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (suggestion_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_vet_reviews_suggestion ON vet_reviews(suggestion_id);
CREATE INDEX IF NOT EXISTS idx_vet_reviews_reviewer  ON vet_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_vet_reviews_verdict   ON vet_reviews(verdict);
CREATE INDEX IF NOT EXISTS idx_vet_reviews_reviewed_at ON vet_reviews(reviewed_at DESC);

-- Also keep the lightweight feedback columns on ai_suggestions for backward compat
ALTER TABLE ai_suggestions ADD COLUMN IF NOT EXISTS feedback_correct BOOLEAN;
ALTER TABLE ai_suggestions ADD COLUMN IF NOT EXISTS feedback_note    TEXT;
ALTER TABLE ai_suggestions ADD COLUMN IF NOT EXISTS feedback_by      UUID REFERENCES agents(id);
ALTER TABLE ai_suggestions ADD COLUMN IF NOT EXISTS feedback_at      TIMESTAMPTZ;
