-- ============================================================
-- SmartVet AI Call Centre — Test Data Reset
-- Run ONCE before real-world testing begins.
--
-- What this does:
--   • Deletes all call, transcript, suggestion, dispatch, and
--     vet-review data
--   • Removes test agents (all except richobuku@gmail.com)
--   • Resets richobuku@gmail.com agent stats to zero
--   • Clears sessions, tokens, OTP codes
--   • Clears farmer/vet/farm records synced from Django
--   • Clears inventory (warehouse and vet field stock)
--   • Clears batch tasks
--
-- What this KEEPS:
--   • Database schema (all tables, indexes, types)
--   • Migration history
--   • The admin account (richobuku@gmail.com)
--
-- How to run:
--   psql $DATABASE_URL -f scripts/reset-data.sql
-- ============================================================

BEGIN;

-- ── Call data (CASCADE handles transcripts, ai_suggestions, call_symptoms) ──
TRUNCATE TABLE vet_reviews          RESTART IDENTITY CASCADE;
TRUNCATE TABLE vet_dispatch_requests RESTART IDENTITY CASCADE;
TRUNCATE TABLE calls                RESTART IDENTITY CASCADE;

-- ── Auth / session data ──
TRUNCATE TABLE agent_sessions  RESTART IDENTITY CASCADE;
TRUNCATE TABLE refresh_tokens  RESTART IDENTITY CASCADE;
TRUNCATE TABLE otp_codes       RESTART IDENTITY CASCADE;

-- ── Farmer / vet / farm records (synced from Django) ──
TRUNCATE TABLE batch_tasks RESTART IDENTITY CASCADE;
TRUNCATE TABLE batches     RESTART IDENTITY CASCADE;
TRUNCATE TABLE farmers     RESTART IDENTITY CASCADE;
TRUNCATE TABLE farms       RESTART IDENTITY CASCADE;
TRUNCATE TABLE vets        RESTART IDENTITY CASCADE;

-- ── Inventory ──
TRUNCATE TABLE stock_allocations  RESTART IDENTITY CASCADE;
TRUNCATE TABLE vet_inventory      RESTART IDENTITY CASCADE;
TRUNCATE TABLE warehouse_inventory RESTART IDENTITY CASCADE;

-- ── Agents: remove all test/seed accounts except admin ──
DELETE FROM agents
WHERE email <> 'richobuku@gmail.com';

-- ── Reset admin stats so dashboards start from zero ──
UPDATE agents
SET total_calls              = 0,
    avg_call_duration_seconds = 0,
    status                   = 'offline',
    failed_logins            = 0,
    locked_until             = NULL,
    updated_at               = NOW()
WHERE email = 'richobuku@gmail.com';

COMMIT;

-- Confirm what's left
SELECT 'agents' AS tbl, COUNT(*) FROM agents
UNION ALL SELECT 'calls',               COUNT(*) FROM calls
UNION ALL SELECT 'ai_suggestions',      COUNT(*) FROM ai_suggestions
UNION ALL SELECT 'vet_dispatch_requests', COUNT(*) FROM vet_dispatch_requests
UNION ALL SELECT 'vet_reviews',         COUNT(*) FROM vet_reviews
UNION ALL SELECT 'refresh_tokens',      COUNT(*) FROM refresh_tokens
UNION ALL SELECT 'warehouse_inventory', COUNT(*) FROM warehouse_inventory
ORDER BY tbl;
