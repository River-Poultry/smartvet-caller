import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../db/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../../uploads/recordings');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = (file.originalname.match(/\.[^.]+$/) || [''])[0] || '.webm';
    cb(null, `call-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

const router = express.Router();

// Directory of callable contacts: farmers (from cases) and paravets
router.get('/contacts', (req, res) => {
  const q = `%${req.query.q || ''}%`;

  const farmers = db
    .prepare(
      `SELECT id, farmer_name AS name, phone, location, status, animal_type, created_at
       FROM tickets
       WHERE farmer_name LIKE ? OR phone LIKE ?
       ORDER BY created_at DESC`
    )
    .all(q, q)
    .map((t) => ({ ...t, contact_type: 'farmer', contact_id: t.id }));

  const paravets = db
    .prepare(
      `SELECT id, name, phone, location, status, specialization
       FROM paravets
       WHERE name LIKE ? OR phone LIKE ?
       ORDER BY name ASC`
    )
    .all(q, q)
    .map((p) => ({ ...p, contact_type: 'paravet', contact_id: p.id }));

  res.json({ farmers, paravets });
});

// Call history
router.get('/', (req, res) => {
  const { contact_type, contact_id } = req.query;
  let rows;
  if (contact_type && contact_id) {
    rows = db
      .prepare('SELECT * FROM calls WHERE contact_type = ? AND contact_id = ? ORDER BY created_at DESC')
      .all(contact_type, contact_id);
  } else {
    rows = db.prepare('SELECT * FROM calls ORDER BY created_at DESC LIMIT 100').all();
  }
  res.json(rows);
});

// Log a call (optionally with a recording)
router.post('/', upload.single('audio'), (req, res) => {
  const { contact_type, contact_id, contact_name, phone, ticket_id, status, notes, duration_seconds } = req.body;

  if (!contact_type || !contact_name) {
    return res.status(400).json({ error: 'contact_type and contact_name are required' });
  }

  const result = db
    .prepare(
      `INSERT INTO calls (contact_type, contact_id, contact_name, phone, ticket_id, agent_id, agent_name, status, notes, duration_seconds, filename, mime_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      contact_type,
      contact_id || null,
      contact_name,
      phone || null,
      ticket_id || null,
      req.user.id,
      req.user.name,
      status || 'completed',
      notes || null,
      duration_seconds ? Number(duration_seconds) : null,
      req.file ? req.file.filename : null,
      req.file ? req.file.mimetype : null
    );

  const call = db.prepare('SELECT * FROM calls WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(call);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM calls WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Call not found' });

  const fields = ['status', 'notes'];
  const updates = {};
  for (const field of fields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  const setClause = Object.keys(updates).map((f) => `${f} = ?`).join(', ');
  if (setClause) {
    db.prepare(`UPDATE calls SET ${setClause} WHERE id = ?`).run(...Object.values(updates), req.params.id);
  }

  const call = db.prepare('SELECT * FROM calls WHERE id = ?').get(req.params.id);
  res.json(call);
});

export default router;
