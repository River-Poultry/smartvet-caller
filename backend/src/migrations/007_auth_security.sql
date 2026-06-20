-- Auth security improvements: phone login, refresh tokens, OTP, login tracking
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS phone          VARCHAR(20),
  ADD COLUMN IF NOT EXISTS is_verified    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS failed_logins  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until   TIMESTAMPTZ;

-- Normalise existing agents as verified (admin-created, no OTP pending)
UPDATE agents SET is_verified = true WHERE is_verified = false;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_agent ON refresh_tokens(agent_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash  ON refresh_tokens(token_hash);

CREATE TABLE IF NOT EXISTS otp_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  code        CHAR(6) NOT NULL,
  purpose     VARCHAR(20) NOT NULL DEFAULT 'verify', -- 'verify' | 'reset'
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_agent ON otp_codes(agent_id);
