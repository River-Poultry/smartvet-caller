import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/index.js';

const router = express.Router();

const ROLES = ['super_admin', 'admin', 'supervisor', 'agent', 'paravet', 'vetboard'];

function toPublicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status, created_at: user.created_at };
}

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
  res.json(rows.map(toPublicUser));
});

router.post('/', (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password are required' });
  if (role && !ROLES.includes(role)) return res.status(400).json({ error: `role must be one of: ${ROLES.join(', ')}` });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'A user with this email already exists' });

  const result = db
    .prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(name, email.toLowerCase(), bcrypt.hashSync(password, 10), role || 'agent');

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(toPublicUser(user));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'User not found' });

  const { name, role, status, password } = req.body;
  if (role && !ROLES.includes(role)) return res.status(400).json({ error: `role must be one of: ${ROLES.join(', ')}` });
  if (status && !['active', 'disabled'].includes(status)) return res.status(400).json({ error: 'status must be active or disabled' });

  if (name !== undefined) db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, req.params.id);
  if (role !== undefined) db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  if (status !== undefined) db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, req.params.id);
  if (password) db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(password, 10), req.params.id);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  res.json(toPublicUser(user));
});

router.delete('/:id', (req, res) => {
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account' });
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
  res.status(204).send();
});

export default router;
