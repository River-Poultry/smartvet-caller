import express from 'express';
import db from '../db/index.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', (req, res) => {
  const { status } = req.query;
  const rows = status
    ? db.prepare('SELECT * FROM tickets WHERE status = ? ORDER BY created_at DESC').all(status)
    : db.prepare('SELECT * FROM tickets ORDER BY created_at DESC').all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  res.json(ticket);
});

router.post('/', (req, res) => {
  const { farmer_name, phone, location, animal_type, issue_description, priority } = req.body;
  if (!farmer_name) return res.status(400).json({ error: 'farmer_name is required' });

  const result = db
    .prepare(
      `INSERT INTO tickets (farmer_name, phone, location, animal_type, issue_description, priority, agent_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(farmer_name, phone || null, location || null, animal_type || null, issue_description || null, priority || 'normal', req.user.id);

  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(ticket);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Ticket not found' });

  const fields = ['farmer_name', 'phone', 'location', 'animal_type', 'issue_description', 'priority', 'status', 'assigned_paravet_id', 'transcript', 'ai_summary'];
  const updates = {};
  for (const field of fields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  const setClause = Object.keys(updates).map((f) => `${f} = ?`).join(', ');
  if (setClause) {
    db.prepare(`UPDATE tickets SET ${setClause}, updated_at = datetime('now') WHERE id = ?`).run(
      ...Object.values(updates),
      req.params.id
    );
  }

  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);

  // Auto-create a VSB review when a case is resolved (if one doesn't already exist)
  if (updates.status === 'resolved') {
    const existingReview = db.prepare('SELECT id FROM vetboard_reviews WHERE ticket_id = ?').get(req.params.id);
    if (!existingReview) {
      db.prepare('INSERT INTO vetboard_reviews (ticket_id, created_by) VALUES (?, ?)').run(req.params.id, req.user.id);
    }
  }

  res.json(ticket);
});

router.delete('/:id', requireRole('admin', 'supervisor'), (req, res) => {
  const result = db.prepare('DELETE FROM tickets WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Ticket not found' });
  res.status(204).send();
});

export default router;
