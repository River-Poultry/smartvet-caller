import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await query(
      'SELECT id, name, email, status, is_admin, role FROM agents WHERE id = $1',
      [payload.agentId]
    );
    if (!rows.length) return res.status(401).json({ error: 'Agent not found' });
    req.agent = rows[0];
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.agent?.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
