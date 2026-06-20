import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

export async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const { rows } = await query('SELECT * FROM agents WHERE email = $1', [email]);
  if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

  const agent = rows[0];
  const valid = await bcrypt.compare(password, agent.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { agentId: agent.id, email: agent.email, isAdmin: agent.is_admin },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  // Mark agent online
  await query(`UPDATE agents SET status = 'online', updated_at = NOW() WHERE id = $1`, [agent.id]);

  res.json({
    token,
    agent: {
      id: agent.id,
      name: agent.name,
      email: agent.email,
      isAdmin: agent.is_admin,
      status: 'online',
    },
  });
}

export async function logout(req, res) {
  await query(`UPDATE agents SET status = 'offline', updated_at = NOW() WHERE id = $1`, [req.agent.id]);
  res.json({ message: 'Logged out' });
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  const { rows } = await query('SELECT password_hash FROM agents WHERE id = $1', [req.agent.id]);
  const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

  const hash = await bcrypt.hash(newPassword, 10);
  await query('UPDATE agents SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.agent.id]);
  res.json({ message: 'Password updated' });
}
