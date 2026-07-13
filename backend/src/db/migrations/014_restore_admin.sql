-- Restore richobuku@gmail.com to admin role
-- This runs once via migration runner; safe to re-run (idempotent UPDATE)
UPDATE agents
SET role = 'admin', is_admin = true
WHERE email = 'richobuku@gmail.com';
