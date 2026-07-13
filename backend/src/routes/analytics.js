import express from 'express';
import db from '../db/index.js';

const router = express.Router();

router.get('/', (req, res) => {
  // Cases
  const caseTotal = db.prepare('SELECT COUNT(*) AS n FROM tickets').get().n;
  const casesByStatus = db.prepare("SELECT status, COUNT(*) AS n FROM tickets GROUP BY status").all();
  const casesByPriority = db.prepare("SELECT priority, COUNT(*) AS n FROM tickets GROUP BY priority").all();
  const casesLast7Days = db.prepare(
    "SELECT date(created_at) AS day, COUNT(*) AS n FROM tickets WHERE created_at >= datetime('now','-7 days') GROUP BY day ORDER BY day ASC"
  ).all();

  // Calls
  const callTotal = db.prepare('SELECT COUNT(*) AS n FROM calls').get().n;
  const callsByOutcome = db.prepare("SELECT status, COUNT(*) AS n FROM calls GROUP BY status").all();
  const callsByAgent = db.prepare(
    "SELECT agent_name, COUNT(*) AS n FROM calls GROUP BY agent_name ORDER BY n DESC LIMIT 10"
  ).all();
  const callsLast7Days = db.prepare(
    "SELECT date(created_at) AS day, COUNT(*) AS n FROM calls WHERE created_at >= datetime('now','-7 days') GROUP BY day ORDER BY day ASC"
  ).all();

  // Recordings
  const recordingTotal = db.prepare('SELECT COUNT(*) AS n FROM call_recordings').get().n;
  const recordingTotalSeconds = db.prepare('SELECT COALESCE(SUM(duration_seconds),0) AS s FROM call_recordings').get().s;

  // AI usage
  const aiSummariesGenerated = db.prepare('SELECT COUNT(*) AS n FROM tickets WHERE ai_summary IS NOT NULL').get().n;
  const recordingsTranscribed = db.prepare("SELECT COUNT(*) AS n FROM call_recordings WHERE transcript IS NOT NULL AND transcript != ''").get().n;

  // VetBoard reviews
  const vetboardTotal = db.prepare('SELECT COUNT(*) AS n FROM vetboard_reviews').get().n;
  const vetboardByStatus = db.prepare('SELECT status, COUNT(*) AS n FROM vetboard_reviews GROUP BY status').all();

  // Agents: calls + cases handled
  const agentPerformance = db.prepare(`
    SELECT u.name, u.role,
      (SELECT COUNT(*) FROM calls c WHERE c.agent_id = u.id) AS calls_made,
      (SELECT COUNT(*) FROM tickets t WHERE t.agent_id = u.id) AS cases_handled
    FROM users u WHERE u.role IN ('agent','supervisor','admin')
    ORDER BY calls_made DESC
  `).all();

  res.json({
    cases: { total: caseTotal, by_status: casesByStatus, by_priority: casesByPriority, last_7_days: casesLast7Days },
    calls: { total: callTotal, by_outcome: callsByOutcome, by_agent: callsByAgent, last_7_days: callsLast7Days },
    recordings: { total: recordingTotal, total_minutes: Math.round(recordingTotalSeconds / 60) },
    ai: { summaries_generated: aiSummariesGenerated, recordings_transcribed: recordingsTranscribed },
    vetboard: { total: vetboardTotal, by_status: vetboardByStatus },
    agents: agentPerformance,
  });
});

export default router;
