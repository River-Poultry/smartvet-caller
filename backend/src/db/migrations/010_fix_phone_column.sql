-- Backfill phone from phone_number for agents created before the column was unified.
-- phone_number was the original column (migration 001); phone was added in migration 007.
-- agentController now writes exclusively to phone, so this one-time backfill closes the gap.
UPDATE agents
SET phone = phone_number
WHERE phone IS NULL
  AND phone_number IS NOT NULL;
