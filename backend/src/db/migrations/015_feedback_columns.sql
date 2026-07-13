-- Add feedback columns to ai_suggestions for admin inline feedback
-- Vet board reviews use vet_reviews table; these lightweight columns serve the insights tab
ALTER TABLE ai_suggestions
  ADD COLUMN IF NOT EXISTS feedback_correct BOOLEAN,
  ADD COLUMN IF NOT EXISTS feedback_note    TEXT,
  ADD COLUMN IF NOT EXISTS feedback_by      UUID REFERENCES agents(id),
  ADD COLUMN IF NOT EXISTS feedback_at      TIMESTAMPTZ;
