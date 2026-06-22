import { query } from '../db/index.js';
import { generateSuggestions } from '../services/aiSuggestions.js';
import { notifyAgent } from '../services/websocket.js';

export async function addSymptom(req, res) {
  const { callId } = req.params;
  const { symptom, severity = 'moderate' } = req.body;
  if (!symptom) return res.status(400).json({ error: 'symptom required' });

  const { rows } = await query(
    `INSERT INTO call_symptoms (call_id, symptom, severity) VALUES ($1, $2, $3) RETURNING *`,
    [callId, symptom.trim(), severity]
  );

  const allSymptoms = await query(
    `SELECT symptom FROM call_symptoms WHERE call_id = $1`,
    [callId]
  );
  const trackedSymptoms = allSymptoms.rows.map(r => r.symptom);
  const suggestions = await generateSuggestions(callId, trackedSymptoms.join(', '), trackedSymptoms);

  const callRes = await query('SELECT agent_id FROM calls WHERE id = $1', [callId]);
  if (callRes.rows[0]?.agent_id) {
    notifyAgent(callRes.rows[0].agent_id, 'AI_SUGGESTION', { suggestions, symptom: rows[0] });
  }

  res.status(201).json({ symptom: rows[0], suggestions });
}

export async function removeSymptom(req, res) {
  const { callId, symptomId } = req.params;

  await query(
    `DELETE FROM call_symptoms WHERE id = $1 AND call_id = $2`,
    [symptomId, callId]
  );

  res.sendStatus(204);
}

export async function listSymptoms(req, res) {
  const { callId } = req.params;
  const { rows } = await query(
    `SELECT * FROM call_symptoms WHERE call_id = $1 ORDER BY added_at`,
    [callId]
  );
  res.json(rows);
}
