-- Migration 017: Ensure default users exist with active status, unlocked logins, and valid password hashes.

-- Super Admin: richobuku@gmail.com (Password: Admin123!)
INSERT INTO agents (name, email, password_hash, role, is_admin, is_active, is_verified, failed_logins, locked_until, status)
VALUES ('Super Admin', 'richobuku@gmail.com', '$2a$12$kgFPFThA.wA3d0FbDNW13.Jwd52YGK2VSgCDnyX2WwgNE1fX24s0y', 'admin', true, true, true, 0, NULL, 'offline')
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = 'admin',
  is_admin = true,
  is_active = true,
  is_verified = true,
  failed_logins = 0,
  locked_until = NULL,
  updated_at = NOW();

-- System Admin: admin@smartvet.africa (Password: Admin123!)
INSERT INTO agents (name, email, password_hash, role, is_admin, is_active, is_verified, failed_logins, locked_until, status)
VALUES ('System Admin', 'admin@smartvet.africa', '$2a$12$kgFPFThA.wA3d0FbDNW13.Jwd52YGK2VSgCDnyX2WwgNE1fX24s0y', 'admin', true, true, true, 0, NULL, 'offline')
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = 'admin',
  is_admin = true,
  is_active = true,
  is_verified = true,
  failed_logins = 0,
  locked_until = NULL,
  updated_at = NOW();

-- Vet Board Reviewer: vetboard@smartvet.africa (Password: VetBoard123!)
INSERT INTO agents (name, email, password_hash, role, is_admin, is_active, is_verified, failed_logins, locked_until, status)
VALUES ('Vet Board Reviewer', 'vetboard@smartvet.africa', '$2a$12$YTy2gzSpt/ID6Trc0vyt.OGt49lmq6mgEi8NdCNihBTbsXSrPrkU2', 'vet_board', false, true, true, 0, NULL, 'offline')
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = 'vet_board',
  is_admin = false,
  is_active = true,
  is_verified = true,
  failed_logins = 0,
  locked_until = NULL,
  updated_at = NOW();

-- Agent: agent@smartvet.africa (Password: Agent123!)
INSERT INTO agents (name, email, password_hash, role, is_admin, is_active, is_verified, failed_logins, locked_until, status)
VALUES ('Call Centre Agent', 'agent@smartvet.africa', '$2a$12$01.s79NFFOvt7Q4QcMCHQuwobEhdfjPIZyeklcj.SdIg8BVvCackm', 'agent', false, true, true, 0, NULL, 'offline')
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = 'agent',
  is_admin = false,
  is_active = true,
  is_verified = true,
  failed_logins = 0,
  locked_until = NULL,
  updated_at = NOW();
