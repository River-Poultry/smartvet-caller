-- Model alerts: tracks when VetBoard feedback crosses thresholds
-- indicating the AI diagnosis engine needs developer attention.

CREATE TABLE IF NOT EXISTS model_alerts (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type        TEXT        NOT NULL
    CHECK (trigger_type IN ('accuracy_drop', 'rejection_spike', 'unknown_disease')),
  disease_name        TEXT        NOT NULL,
  accuracy_pct        INT,                          -- current accuracy % for this disease
  rejection_count     INT,                          -- rejections in the trigger window
  review_count        INT,                          -- total reviews in the trigger window
  window_days         INT         NOT NULL DEFAULT 30,
  sample_ids          UUID[]      DEFAULT '{}',     -- suggestion IDs that fed into this alert
  status              TEXT        NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'acknowledged', 'resolved')),
  developer_notes     TEXT,
  acknowledged_by     UUID        REFERENCES agents(id),
  acknowledged_at     TIMESTAMPTZ,
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_model_alerts_status   ON model_alerts(status);
CREATE INDEX IF NOT EXISTS idx_model_alerts_disease  ON model_alerts(disease_name);
CREATE INDEX IF NOT EXISTS idx_model_alerts_created  ON model_alerts(created_at DESC);
