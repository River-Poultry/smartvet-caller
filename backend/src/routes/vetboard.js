import express from 'express';
import db from '../db/index.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

const reviewView = `
  SELECT vr.*,
    t.farmer_name, t.animal_type, t.location, t.status AS case_status, t.issue_description, t.priority,
    u.name AS assigned_to_name,
    cb.name AS created_by_name
  FROM vetboard_reviews vr
  JOIN tickets t ON t.id = vr.ticket_id
  LEFT JOIN users u ON u.id = vr.assigned_to
  LEFT JOIN users cb ON cb.id = vr.created_by
`;

// List reviews — vetboard sees only their own; others see all
router.get('/', (req, res) => {
  const { status } = req.query;
  let rows;
  if (req.user.role === 'vetboard') {
    const base = `${reviewView} WHERE (vr.assigned_to = ? OR vr.assigned_to IS NULL)`;
    rows = status
      ? db.prepare(`${base} AND vr.status = ? ORDER BY vr.created_at DESC`).all(req.user.id, status)
      : db.prepare(`${base} ORDER BY vr.created_at DESC`).all(req.user.id);
  } else {
    rows = status
      ? db.prepare(`${reviewView} WHERE vr.status = ? ORDER BY vr.created_at DESC`).all(status)
      : db.prepare(`${reviewView} ORDER BY vr.created_at DESC`).all();
  }
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const review = db.prepare(`${reviewView} WHERE vr.id = ?`).get(req.params.id);
  if (!review) return res.status(404).json({ error: 'Review not found' });
  res.json(review);
});

// Flag a case for VetBoard review (supervisor/admin only)
router.post('/', requireRole('admin', 'supervisor', 'super_admin'), (req, res) => {
  const { ticket_id, assigned_to } = req.body;
  if (!ticket_id) return res.status(400).json({ error: 'ticket_id is required' });

  const ticket = db.prepare('SELECT id FROM tickets WHERE id = ?').get(ticket_id);
  if (!ticket) return res.status(404).json({ error: 'Case not found' });

  const existing = db.prepare("SELECT id FROM vetboard_reviews WHERE ticket_id = ? AND status != 'completed'").get(ticket_id);
  if (existing) return res.status(409).json({ error: 'This case already has an active VetBoard review' });

  const result = db
    .prepare('INSERT INTO vetboard_reviews (ticket_id, assigned_to, created_by) VALUES (?, ?, ?)')
    .run(ticket_id, assigned_to || null, req.user.id);

  const review = db.prepare(`${reviewView} WHERE vr.id = ?`).get(result.lastInsertRowid);
  res.status(201).json(review);
});

// Complete or update a review (vetboard, supervisor, admin)
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM vetboard_reviews WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Review not found' });

  // Vetboard can only update reviews assigned to them or unassigned ones
  if (req.user.role === 'vetboard' && existing.assigned_to && existing.assigned_to !== req.user.id) {
    return res.status(403).json({ error: 'You can only update reviews assigned to you' });
  }

  const { findings, recommendation, status } = req.body;
  const updates = {};
  if (findings !== undefined) updates.findings = findings;
  if (recommendation !== undefined) updates.recommendation = recommendation;
  if (status !== undefined) updates.status = status;
  if (status === 'completed') updates.completed_at = new Date().toISOString();

  const setClause = Object.keys(updates).map((f) => `${f} = ?`).join(', ');
  if (setClause) {
    db.prepare(`UPDATE vetboard_reviews SET ${setClause} WHERE id = ?`).run(...Object.values(updates), req.params.id);
  }

  const review = db.prepare(`${reviewView} WHERE vr.id = ?`).get(req.params.id);
  res.json(review);
});

export default router;
