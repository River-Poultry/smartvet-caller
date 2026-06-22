import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { query } from '../db/index.js';

const router = Router();

// All insights endpoints require admin
router.use(requireAuth, requireAdmin);

// GET /insights/overview?days=30
router.get('/overview', async (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 30, 365);
  try {
    const [kpi, intentBreakdown, outcomeBreakdown, dailyVolume] = await Promise.all([

      // KPI summary
      query(`
        SELECT
          COUNT(*)::int                                                    AS total_calls,
          COUNT(*) FILTER (WHERE ended_at IS NOT NULL)::int                AS completed_calls,
          COUNT(*) FILTER (WHERE is_emergency)::int                        AS emergency_calls,
          COUNT(*) FILTER (WHERE call_intent = 'disease_diagnosis')::int   AS diagnosis_calls,
          COUNT(*) FILTER (WHERE outcome = 'vet_requested')::int           AS vet_requested,
          COUNT(*) FILTER (WHERE outcome = 'resolved')::int                AS resolved,
          ROUND(AVG(duration_seconds) FILTER (WHERE duration_seconds > 0)) AS avg_duration_s,
          ROUND(AVG(duration_seconds) FILTER (WHERE duration_seconds > 0 AND call_intent = 'disease_diagnosis')) AS avg_diag_duration_s,
          COUNT(*) FILTER (WHERE started_at >= NOW() - INTERVAL '1 day')::int  AS calls_today,
          COUNT(*) FILTER (WHERE started_at >= NOW() - INTERVAL '7 days')::int AS calls_7d
        FROM calls
        WHERE started_at >= NOW() - ($1 || ' days')::INTERVAL
      `, [days]),

      // Intent breakdown
      query(`
        SELECT call_intent, COUNT(*)::int AS cnt
        FROM calls
        WHERE started_at >= NOW() - ($1 || ' days')::INTERVAL
          AND call_intent IS NOT NULL
        GROUP BY call_intent ORDER BY cnt DESC
      `, [days]),

      // Outcome breakdown
      query(`
        SELECT outcome, COUNT(*)::int AS cnt
        FROM calls
        WHERE started_at >= NOW() - ($1 || ' days')::INTERVAL
          AND outcome IS NOT NULL
        GROUP BY outcome ORDER BY cnt DESC
      `, [days]),

      // Daily call volume (last days)
      query(`
        SELECT
          DATE_TRUNC('day', started_at)::date AS day,
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE is_emergency)::int AS emergency,
          COUNT(*) FILTER (WHERE call_intent = 'disease_diagnosis')::int AS diagnosis
        FROM calls
        WHERE started_at >= NOW() - ($1 || ' days')::INTERVAL
        GROUP BY 1 ORDER BY 1
      `, [days]),
    ]);

    res.json({
      kpi: kpi.rows[0],
      intent_breakdown: intentBreakdown.rows,
      outcome_breakdown: outcomeBreakdown.rows,
      daily_volume: dailyVolume.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /insights/diseases?days=30
router.get('/diseases', async (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 30, 365);
  try {
    const [diseases, acted, dispatched] = await Promise.all([

      // Top diseases from ai_suggestions
      query(`
        SELECT
          CASE
            WHEN suggestion_text ILIKE '%newcastle%'      THEN 'Newcastle Disease (ND)'
            WHEN suggestion_text ILIKE '%gumboro%'        THEN 'Gumboro Disease (IBD)'
            WHEN suggestion_text ILIKE '%coccidiosis%'    THEN 'Coccidiosis'
            WHEN suggestion_text ILIKE '%marek%'          THEN "Marek's Disease"
            WHEN suggestion_text ILIKE '%fowl typhoid%'   THEN 'Fowl Typhoid / Salmonellosis'
            WHEN suggestion_text ILIKE '%fowl pox%'       THEN 'Fowl Pox'
            WHEN suggestion_text ILIKE '%bronchitis%'     THEN 'Infectious Bronchitis (IB)'
            WHEN suggestion_text ILIKE '%mycoplasma%' OR suggestion_text ILIKE '%crd%' THEN 'Chronic Respiratory Disease (CRD)'
            WHEN suggestion_text ILIKE '%flip-over%' OR suggestion_text ILIKE '%sudden death syndrome%' THEN 'Sudden Death Syndrome (SDS)'
            WHEN suggestion_text ILIKE '%ascites%' OR suggestion_text ILIKE '%water belly%' THEN 'Ascites / Water Belly'
            WHEN suggestion_text ILIKE '%gangrenous%'     THEN 'Gangrenous Dermatitis'
            WHEN suggestion_text ILIKE '%anaemia%' OR suggestion_text ILIKE '%cav%' THEN 'Infectious Anaemia (CAV)'
            WHEN suggestion_text ILIKE '%egg drop%'       THEN 'Egg Drop Syndrome (EDS)'
            ELSE 'Other'
          END AS disease,
          COUNT(*)::int                                         AS mentions,
          ROUND(AVG(confidence_score) * 100)::int              AS avg_confidence,
          COUNT(*) FILTER (WHERE was_acted_on)::int            AS acted_on,
          COUNT(*) FILTER (WHERE suggestion_text ILIKE '%EMERGENCY%')::int AS emergency_count
        FROM ai_suggestions
        WHERE category = 'disease_diagnosis'
          AND generated_at >= NOW() - ($1 || ' days')::INTERVAL
        GROUP BY 1
        ORDER BY mentions DESC
        LIMIT 15
      `, [days]),

      // Overall suggestion action rate
      query(`
        SELECT
          COUNT(*)::int AS total_suggestions,
          COUNT(*) FILTER (WHERE was_acted_on)::int AS total_acted,
          COUNT(*) FILTER (WHERE category = 'disease_diagnosis')::int AS diag_suggestions,
          COUNT(*) FILTER (WHERE category = 'escalation_alert')::int  AS escalation_suggestions,
          ROUND(AVG(confidence_score) * 100)::int AS avg_confidence
        FROM ai_suggestions
        WHERE generated_at >= NOW() - ($1 || ' days')::INTERVAL
      `, [days]),

      // Disease → dispatch correlation
      query(`
        SELECT
          d.symptoms_description,
          COUNT(*)::int AS dispatch_count,
          COUNT(*) FILTER (WHERE d.urgency_level = 'emergency')::int AS emergency_dispatches
        FROM vet_dispatch_requests d
        WHERE d.created_at >= NOW() - ($1 || ' days')::INTERVAL
          AND d.symptoms_description IS NOT NULL
        GROUP BY d.symptoms_description
        ORDER BY dispatch_count DESC
        LIMIT 10
      `, [days]),
    ]);

    res.json({
      disease_mentions: diseases.rows,
      suggestion_stats: acted.rows[0],
      dispatch_symptom_clusters: dispatched.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /insights/agents?days=30
router.get('/agents', async (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 30, 365);
  try {
    const { rows } = await query(`
      SELECT
        a.id,
        a.name,
        a.email,
        a.role,
        COUNT(c.id)::int                                             AS total_calls,
        COUNT(c.id) FILTER (WHERE c.ended_at IS NOT NULL)::int       AS completed_calls,
        COUNT(c.id) FILTER (WHERE c.is_emergency)::int               AS emergency_calls,
        COUNT(c.id) FILTER (WHERE c.call_intent = 'disease_diagnosis')::int AS diagnosis_calls,
        COUNT(c.id) FILTER (WHERE c.outcome = 'resolved')::int       AS resolved_calls,
        COUNT(c.id) FILTER (WHERE c.outcome = 'vet_requested')::int  AS vet_requested,
        ROUND(AVG(c.duration_seconds) FILTER (WHERE c.duration_seconds > 0))::int AS avg_duration_s,
        ROUND(
          100.0 * COUNT(c.id) FILTER (WHERE c.outcome = 'resolved') /
          NULLIF(COUNT(c.id) FILTER (WHERE c.outcome IS NOT NULL), 0)
        )::int AS resolution_rate,
        (
          SELECT COUNT(*)::int FROM ai_suggestions s
          JOIN calls cc ON cc.id = s.call_id
          WHERE cc.agent_id = a.id
            AND cc.started_at >= NOW() - ($1 || ' days')::INTERVAL
        ) AS suggestions_generated,
        (
          SELECT COUNT(*) FILTER (WHERE s.was_acted_on)::int FROM ai_suggestions s
          JOIN calls cc ON cc.id = s.call_id
          WHERE cc.agent_id = a.id
            AND cc.started_at >= NOW() - ($1 || ' days')::INTERVAL
        ) AS suggestions_acted_on
      FROM agents a
      LEFT JOIN calls c ON c.agent_id = a.id
        AND c.started_at >= NOW() - ($1 || ' days')::INTERVAL
      WHERE a.is_active = true
      GROUP BY a.id, a.name, a.email, a.role
      ORDER BY total_calls DESC
    `, [days]);

    res.json({ agents: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /insights/call/:id  — full drilldown for one call
router.get('/call/:id', async (req, res) => {
  try {
    const [callRes, suggestionsRes, transcriptRes] = await Promise.all([
      query(`
        SELECT c.*,
          a.name AS agent_name, a.email AS agent_email, a.role AS agent_role
        FROM calls c
        LEFT JOIN agents a ON a.id = c.agent_id
        WHERE c.id = $1
      `, [req.params.id]),

      query(`
        SELECT * FROM ai_suggestions
        WHERE call_id = $1
        ORDER BY generated_at ASC
      `, [req.params.id]),

      query(`
        SELECT * FROM call_transcripts
        WHERE call_id = $1
        ORDER BY sequence_number ASC, created_at ASC
      `, [req.params.id]),
    ]);

    if (!callRes.rows[0]) return res.status(404).json({ error: 'Call not found' });

    res.json({
      call: callRes.rows[0],
      suggestions: suggestionsRes.rows,
      transcript: transcriptRes.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /insights/suggestion/:id/feedback  — mark AI suggestion correct/incorrect
router.patch('/suggestion/:id/feedback', async (req, res) => {
  const { correct, note } = req.body;
  try {
    // Add feedback columns if they don't exist (graceful migration)
    await query(`
      ALTER TABLE ai_suggestions
        ADD COLUMN IF NOT EXISTS feedback_correct BOOLEAN,
        ADD COLUMN IF NOT EXISTS feedback_note TEXT,
        ADD COLUMN IF NOT EXISTS feedback_by UUID REFERENCES agents(id),
        ADD COLUMN IF NOT EXISTS feedback_at TIMESTAMPTZ
    `).catch(() => {});

    await query(`
      UPDATE ai_suggestions
      SET feedback_correct = $1, feedback_note = $2, feedback_by = $3, feedback_at = NOW()
      WHERE id = $4
    `, [correct, note || null, req.agent.id, req.params.id]);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
