import express from 'express';
import db from '../db/index.js';

const router = express.Router();

const dispatchView = `
  SELECT d.*, t.farmer_name, t.location AS ticket_location, t.issue_description, t.animal_type,
         p.name AS paravet_name, p.phone AS paravet_phone
  FROM dispatches d
  JOIN tickets t ON t.id = d.ticket_id
  JOIN paravets p ON p.id = d.paravet_id
`;

router.get('/', (req, res) => {
  const rows = db.prepare(`${dispatchView} ORDER BY d.created_at DESC`).all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const dispatch = db.prepare(`${dispatchView} WHERE d.id = ?`).get(req.params.id);
  if (!dispatch) return res.status(404).json({ error: 'Dispatch not found' });
  res.json(dispatch);
});

router.post('/', (req, res) => {
  const { ticket_id, paravet_id, scheduled_time, notes } = req.body;
  if (!ticket_id || !paravet_id) return res.status(400).json({ error: 'ticket_id and paravet_id are required' });

  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticket_id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  const paravet = db.prepare('SELECT * FROM paravets WHERE id = ?').get(paravet_id);
  if (!paravet) return res.status(404).json({ error: 'Paravet not found' });

  const result = db
    .prepare('INSERT INTO dispatches (ticket_id, paravet_id, scheduled_time, notes) VALUES (?, ?, ?, ?)')
    .run(ticket_id, paravet_id, scheduled_time || null, notes || null);

  db.prepare("UPDATE tickets SET assigned_paravet_id = ?, status = 'assigned', updated_at = datetime('now') WHERE id = ?").run(
    paravet_id,
    ticket_id
  );
  db.prepare("UPDATE paravets SET status = 'on_call' WHERE id = ?").run(paravet_id);

  const dispatch = db.prepare(`${dispatchView} WHERE d.id = ?`).get(result.lastInsertRowid);
  res.status(201).json(dispatch);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM dispatches WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Dispatch not found' });

  const fields = ['scheduled_time', 'status', 'notes'];
  const updates = {};
  for (const field of fields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  const setClause = Object.keys(updates).map((f) => `${f} = ?`).join(', ');
  if (setClause) {
    db.prepare(`UPDATE dispatches SET ${setClause} WHERE id = ?`).run(...Object.values(updates), req.params.id);
  }

  if (updates.status === 'completed') {
    db.prepare("UPDATE tickets SET status = 'resolved', updated_at = datetime('now') WHERE id = ?").run(existing.ticket_id);
    db.prepare("UPDATE paravets SET status = 'available' WHERE id = ?").run(existing.paravet_id);
  }

  const dispatch = db.prepare(`${dispatchView} WHERE d.id = ?`).get(req.params.id);
  res.json(dispatch);
});

export default router;
