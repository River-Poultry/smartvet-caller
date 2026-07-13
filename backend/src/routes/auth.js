import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/index.js';
import { signToken, requireAuth } from '../middleware/auth.js';

const router = express.Router();

function toPublicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status };
}

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user || user.status !== 'active' || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  res.json({ token: signToken(user), user: toPublicUser(user) });
});

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(toPublicUser(user));
});

export default router;
