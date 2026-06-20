import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import { sendOtpEmail } from '../utils/email.js';

// ── helpers ─────────────────────────────────────────────────────────────

export function normalisePhone(raw) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('256')) return `+${digits}`;
  if (digits.startsWith('0'))   return `+256${digits.slice(1)}`;
  if (digits.length === 9)      return `+256${digits}`;
  return `+${digits}`;
}

function validatePassword(password) {
  if (!password || password.length < 8)  return 'Password must be at least 8 characters';
  if (!/[0-9]/.test(password))           return 'Password must contain at least one digit';
  if (!/[a-zA-Z]/.test(password))        return 'Password must contain at least one letter';
  return null;
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function signAccess(agent) {
  return jwt.sign(
    { agentId: agent.id, email: agent.email, isAdmin: agent.is_admin },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
}

async function issueRefreshToken(agentId) {
  const raw   = crypto.randomBytes(40).toString('hex');
  const hash  = crypto.createHash('sha256').update(raw).digest('hex');
  const expAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await query(
    `INSERT INTO refresh_tokens (agent_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [agentId, hash, expAt]
  );
  return raw;
}

// ── login ────────────────────────────────────────────────────────────────

export async function login(req, res) {
  const { identifier, email, password } = req.body;
  const id = (identifier || email || '').trim();

  if (!id || !password) {
    return res.status(400).json({ error: 'Identifier and password are required' });
  }

  // Multi-identifier: email OR normalised phone (matching Django AbstractUser pattern)
  const phone = normalisePhone(id.includes('@') ? null : id);
  const { rows } = await query(
    `SELECT * FROM agents WHERE email = $1 OR phone = $2 LIMIT 1`,
    [id.toLowerCase(), phone]
  );

  if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

  const agent = rows[0];

  // Account lock check
  if (agent.locked_until && new Date(agent.locked_until) > new Date()) {
    const wait = Math.ceil((new Date(agent.locked_until) - Date.now()) / 60000);
    return res.status(429).json({ error: `Account locked. Try again in ${wait} minute(s).` });
  }

  const valid = await bcrypt.compare(password, agent.password_hash);
  if (!valid) {
    const failed    = (agent.failed_logins || 0) + 1;
    const lockUntil = failed >= 5 ? new Date(Date.now() + 5 * 60 * 1000) : null;
    await query(
      `UPDATE agents SET failed_logins = $1, locked_until = $2 WHERE id = $3`,
      [failed, lockUntil, agent.id]
    );
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // OTP gate: if env flag is on and agent not yet verified
  if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && !agent.is_verified) {
    const code = generateOtp();
    const exp  = new Date(Date.now() + 10 * 60 * 1000);
    await query(
      `UPDATE otp_codes SET used = true WHERE agent_id = $1 AND purpose = 'verify' AND used = false`,
      [agent.id]
    );
    await query(
      `INSERT INTO otp_codes (agent_id, code, purpose, expires_at) VALUES ($1, $2, 'verify', $3)`,
      [agent.id, code, exp]
    );
    try { await sendOtpEmail(agent.email, code, 'verify'); } catch {}
    return res.status(403).json({
      error: 'Email not verified. A verification code has been sent.',
      requiresVerification: true,
      agentId: agent.id,
    });
  }

  // Reset login failure counters
  await query(
    `UPDATE agents SET failed_logins = 0, locked_until = NULL, status = 'online', updated_at = NOW() WHERE id = $1`,
    [agent.id]
  );

  const accessToken  = signAccess(agent);
  const refreshToken = await issueRefreshToken(agent.id);

  res.json({
    token: accessToken,
    refreshToken,
    agent: {
      id:      agent.id,
      name:    agent.name,
      email:   agent.email,
      phone:   agent.phone,
      isAdmin: agent.is_admin,
      status:  'online',
    },
  });
}

// ── token refresh ────────────────────────────────────────────────────────

export async function refresh(req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const { rows } = await query(
    `SELECT rt.*, a.is_admin, a.email, a.name, a.phone
     FROM refresh_tokens rt
     JOIN agents a ON a.id = rt.agent_id
     WHERE rt.token_hash = $1 AND rt.revoked = false AND rt.expires_at > NOW()`,
    [hash]
  );

  if (!rows.length) return res.status(401).json({ error: 'Invalid or expired refresh token' });

  const rec = rows[0];
  // Rotate: revoke old, issue new pair (prevents token reuse)
  await query(`UPDATE refresh_tokens SET revoked = true WHERE id = $1`, [rec.id]);

  const accessToken = signAccess({ id: rec.agent_id, email: rec.email, is_admin: rec.is_admin });
  const newRefresh  = await issueRefreshToken(rec.agent_id);

  res.json({ token: accessToken, refreshToken: newRefresh });
}

// ── logout ────────────────────────────────────────────────────────────────

export async function logout(req, res) {
  const { refreshToken } = req.body;
  if (refreshToken) {
    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await query(`UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1`, [hash]);
  }
  await query(`UPDATE agents SET status = 'offline', updated_at = NOW() WHERE id = $1`, [req.agent.id]);
  res.json({ message: 'Logged out' });
}

// ── OTP: request / verify ─────────────────────────────────────────────────

export async function requestOtp(req, res) {
  const { agentId, purpose = 'verify' } = req.body;
  if (!agentId) return res.status(400).json({ error: 'agentId required' });

  const { rows } = await query(`SELECT * FROM agents WHERE id = $1`, [agentId]);
  if (!rows.length) return res.status(404).json({ error: 'Agent not found' });

  const agent = rows[0];
  if (purpose === 'verify' && agent.is_verified) {
    return res.status(400).json({ error: 'Account already verified' });
  }

  const code = generateOtp();
  const exp  = new Date(Date.now() + 10 * 60 * 1000);
  await query(
    `UPDATE otp_codes SET used = true WHERE agent_id = $1 AND purpose = $2 AND used = false`,
    [agentId, purpose]
  );
  await query(
    `INSERT INTO otp_codes (agent_id, code, purpose, expires_at) VALUES ($1, $2, $3, $4)`,
    [agentId, code, purpose, exp]
  );

  try { await sendOtpEmail(agent.email, code, purpose); } catch {}
  res.json({ message: 'OTP sent to registered email' });
}

export async function verifyOtp(req, res) {
  const { agentId, code, purpose = 'verify' } = req.body;
  if (!agentId || !code) return res.status(400).json({ error: 'agentId and code required' });

  const { rows } = await query(
    `SELECT * FROM otp_codes
     WHERE agent_id = $1 AND code = $2 AND purpose = $3 AND used = false AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [agentId, code, purpose]
  );

  if (!rows.length) return res.status(400).json({ error: 'Invalid or expired code' });

  await query(`UPDATE otp_codes SET used = true WHERE id = $1`, [rows[0].id]);
  if (purpose === 'verify') {
    await query(`UPDATE agents SET is_verified = true WHERE id = $1`, [agentId]);
  }
  res.json({ message: 'Verified', purpose });
}

// ── password change ───────────────────────────────────────────────────────

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  const err = validatePassword(newPassword);
  if (err) return res.status(400).json({ error: err });

  const { rows } = await query(`SELECT password_hash FROM agents WHERE id = $1`, [req.agent.id]);
  const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

  const hash = await bcrypt.hash(newPassword, 12);
  await query(`UPDATE agents SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [hash, req.agent.id]);
  // Invalidate all sessions on password change
  await query(`UPDATE refresh_tokens SET revoked = true WHERE agent_id = $1`, [req.agent.id]);
  res.json({ message: 'Password updated. Please log in again.' });
}

// ── admin: create agent ────────────────────────────────────────────────────

export async function createAgent(req, res) {
  const { name, email, phone, password, isAdmin = false } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });

  const err = validatePassword(password);
  if (err) return res.status(400).json({ error: err });

  const hash   = await bcrypt.hash(password, 12);
  const normPh = normalisePhone(phone);

  try {
    const { rows } = await query(
      `INSERT INTO agents (name, email, phone, password_hash, is_admin, is_verified)
       VALUES ($1, $2, $3, $4, $5, true) RETURNING id, name, email, phone, is_admin`,
      [name, email.toLowerCase().trim(), normPh, hash, isAdmin]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Email or phone already registered' });
    throw e;
  }
}
