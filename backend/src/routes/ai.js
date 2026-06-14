import express from 'express';
import { askAssistant, summarizeTranscript, isConfigured } from '../services/aiService.js';
import db from '../db/index.js';

const router = express.Router();

router.get('/status', (req, res) => {
  res.json({ configured: isConfigured() });
});

router.post('/ask', async (req, res) => {
  const { question, context } = req.body;
  if (!question) return res.status(400).json({ error: 'question is required' });

  try {
    const answer = await askAssistant(question, context);
    res.json({ answer });
  } catch (err) {
    if (err.code === 'AI_NOT_CONFIGURED') {
      return res.status(503).json({ error: err.message, code: err.code });
    }
    res.status(502).json({ error: err.message });
  }
});

router.post('/summarize', async (req, res) => {
  const { transcript, ticket_id } = req.body;
  if (!transcript) return res.status(400).json({ error: 'transcript is required' });

  try {
    const summary = await summarizeTranscript(transcript);

    if (ticket_id) {
      db.prepare("UPDATE tickets SET transcript = ?, ai_summary = ?, updated_at = datetime('now') WHERE id = ?").run(
        transcript,
        summary,
        ticket_id
      );
    }

    res.json({ summary });
  } catch (err) {
    if (err.code === 'AI_NOT_CONFIGURED') {
      return res.status(503).json({ error: err.message, code: err.code });
    }
    res.status(502).json({ error: err.message });
  }
});

export default router;
