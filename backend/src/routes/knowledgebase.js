import express from 'express';
import db from '../db/index.js';

const router = express.Router();

router.get('/', (req, res) => {
  const { q, category } = req.query;
  let rows;
  if (q) {
    rows = db
      .prepare(
        `SELECT * FROM knowledge_articles
         WHERE title LIKE ? OR content LIKE ? OR tags LIKE ?
         ORDER BY updated_at DESC`
      )
      .all(`%${q}%`, `%${q}%`, `%${q}%`);
  } else if (category) {
    rows = db.prepare('SELECT * FROM knowledge_articles WHERE category = ? ORDER BY updated_at DESC').all(category);
  } else {
    rows = db.prepare('SELECT * FROM knowledge_articles ORDER BY updated_at DESC').all();
  }
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const article = db.prepare('SELECT * FROM knowledge_articles WHERE id = ?').get(req.params.id);
  if (!article) return res.status(404).json({ error: 'Article not found' });
  res.json(article);
});

router.post('/', (req, res) => {
  const { title, category, content, tags } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'title and content are required' });

  const result = db
    .prepare('INSERT INTO knowledge_articles (title, category, content, tags) VALUES (?, ?, ?, ?)')
    .run(title, category || null, content, tags || null);

  const article = db.prepare('SELECT * FROM knowledge_articles WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(article);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM knowledge_articles WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Article not found' });

  const fields = ['title', 'category', 'content', 'tags'];
  const updates = {};
  for (const field of fields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  const setClause = Object.keys(updates).map((f) => `${f} = ?`).join(', ');
  if (setClause) {
    db.prepare(`UPDATE knowledge_articles SET ${setClause}, updated_at = datetime('now') WHERE id = ?`).run(
      ...Object.values(updates),
      req.params.id
    );
  }

  const article = db.prepare('SELECT * FROM knowledge_articles WHERE id = ?').get(req.params.id);
  res.json(article);
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM knowledge_articles WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Article not found' });
  res.status(204).send();
});

export default router;
