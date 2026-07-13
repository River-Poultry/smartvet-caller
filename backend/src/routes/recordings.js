import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../db/index.js';
import { requireRole } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../../uploads/recordings');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = (file.originalname.match(/\.[^.]+$/) || [''])[0] || '.webm';
    cb(null, `recording-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

const router = express.Router();

router.get('/', (req, res) => {
  const { ticket_id } = req.query;
  const rows = ticket_id
    ? db.prepare('SELECT * FROM call_recordings WHERE ticket_id = ? ORDER BY created_at DESC').all(ticket_id)
    : db.prepare('SELECT * FROM call_recordings ORDER BY created_at DESC').all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const recording = db.prepare('SELECT * FROM call_recordings WHERE id = ?').get(req.params.id);
  if (!recording) return res.status(404).json({ error: 'Recording not found' });
  res.json(recording);
});

router.post('/', upload.single('audio'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'audio file is required' });

  const { ticket_id, agent_name, transcript, duration_seconds } = req.body;

  const result = db
    .prepare(
      `INSERT INTO call_recordings (ticket_id, agent_name, agent_id, filename, mime_type, duration_seconds, transcript)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      ticket_id || null,
      agent_name || req.user.name,
      req.user.id,
      req.file.filename,
      req.file.mimetype,
      duration_seconds ? Number(duration_seconds) : null,
      transcript || null
    );

  const recording = db.prepare('SELECT * FROM call_recordings WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(recording);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM call_recordings WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Recording not found' });

  const fields = ['ticket_id', 'agent_name', 'transcript', 'ai_summary'];
  const updates = {};
  for (const field of fields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  const setClause = Object.keys(updates).map((f) => `${f} = ?`).join(', ');
  if (setClause) {
    db.prepare(`UPDATE call_recordings SET ${setClause} WHERE id = ?`).run(...Object.values(updates), req.params.id);
  }

  const recording = db.prepare('SELECT * FROM call_recordings WHERE id = ?').get(req.params.id);
  res.json(recording);
});

router.delete('/:id', requireRole('admin', 'supervisor'), (req, res) => {
  const existing = db.prepare('SELECT * FROM call_recordings WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Recording not found' });

  fs.unlink(path.join(uploadsDir, existing.filename), () => {});
  db.prepare('DELETE FROM call_recordings WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;
