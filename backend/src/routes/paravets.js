import express from 'express';
import db from '../db/index.js';

const router = express.Router();

router.get('/', (req, res) => {
  const { status } = req.query;
  const rows = status
    ? db.prepare('SELECT * FROM paravets WHERE status = ? ORDER BY name').all(status)
    : db.prepare('SELECT * FROM paravets ORDER BY name').all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const paravet = db.prepare('SELECT * FROM paravets WHERE id = ?').get(req.params.id);
  if (!paravet) return res.status(404).json({ error: 'Paravet not found' });
  res.json(paravet);
});

router.post('/', (req, res) => {
  const { name, phone, specialization, location, status } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const result = db
    .prepare('INSERT INTO paravets (name, phone, specialization, location, status) VALUES (?, ?, ?, ?, ?)')
    .run(name, phone || null, specialization || null, location || null, status || 'available');

  const paravet = db.prepare('SELECT * FROM paravets WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(paravet);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM paravets WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Paravet not found' });

  const fields = ['name', 'phone', 'specialization', 'location', 'status'];
  const updates = {};
  for (const field of fields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  const setClause = Object.keys(updates).map((f) => `${f} = ?`).join(', ');
  if (setClause) {
    db.prepare(`UPDATE paravets SET ${setClause} WHERE id = ?`).run(...Object.values(updates), req.params.id);
  }

  const paravet = db.prepare('SELECT * FROM paravets WHERE id = ?').get(req.params.id);
  res.json(paravet);
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM paravets WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Paravet not found' });
  res.status(204).send();
});

export default router;
