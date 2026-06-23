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
        SELECT id, call_id, speaker, text, confidence_score, timestamp_offset_seconds, created_at
        FROM call_transcripts
        WHERE call_id = $1
        ORDER BY timestamp_offset_seconds ASC NULLS LAST, created_at ASC
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

// ── Model Alerts ─────────────────────────────────────────────────────────────

// GET /insights/alerts?status=open
router.get('/alerts', async (req, res) => {
  const status = req.query.status || 'open'; // open | acknowledged | resolved | all
  try {
    const conditions = status !== 'all' ? [`ma.status = $1`] : [];
    const params = status !== 'all' ? [status] : [];

    const { rows } = await query(`
      SELECT
        ma.*,
        a.name AS acknowledged_by_name
      FROM model_alerts ma
      LEFT JOIN agents a ON a.id = ma.acknowledged_by
      ${conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''}
      ORDER BY ma.created_at DESC
      LIMIT 100
    `, params);

    const { rows: counts } = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'open')::int         AS open,
        COUNT(*) FILTER (WHERE status = 'acknowledged')::int AS acknowledged,
        COUNT(*) FILTER (WHERE status = 'resolved')::int     AS resolved
      FROM model_alerts
    `);

    res.json({ alerts: rows, counts: counts[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /insights/alerts/:id  — acknowledge or resolve with optional notes
router.patch('/alerts/:id', async (req, res) => {
  const { status, developer_notes } = req.body;
  if (!['acknowledged', 'resolved'].includes(status)) {
    return res.status(400).json({ error: 'status must be acknowledged or resolved' });
  }
  try {
    const { rows } = await query(`
      UPDATE model_alerts SET
        status           = $1,
        developer_notes  = COALESCE($2, developer_notes),
        acknowledged_by  = CASE WHEN $1 = 'acknowledged' THEN $3 ELSE acknowledged_by END,
        acknowledged_at  = CASE WHEN $1 = 'acknowledged' THEN NOW() ELSE acknowledged_at END,
        resolved_at      = CASE WHEN $1 = 'resolved' THEN NOW() ELSE resolved_at END,
        updated_at       = NOW()
      WHERE id = $4
      RETURNING *
    `, [status, developer_notes || null, req.agent.id, req.params.id]);

    if (!rows.length) return res.status(404).json({ error: 'Alert not found' });
    res.json({ alert: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /insights/training-export?format=jsonl|json
// Full structured export of every VetBoard-reviewed suggestion, ML-ready.
router.get('/training-export', async (req, res) => {
  const format = req.query.format === 'json' ? 'json' : 'jsonl';

  try {
    // Pull every reviewed suggestion with full context
    const { rows } = await query(`
      SELECT
        s.id                  AS suggestion_id,
        s.call_id,
        s.suggestion_text,
        s.confidence_score,
        s.category,
        s.was_acted_on,
        s.generated_at,
        -- Call context
        c.farmer_name,
        c.phone_number        AS farmer_phone,
        c.started_at          AS call_date,
        c.call_intent,
        c.outcome,
        c.is_emergency        AS call_was_emergency,
        c.agent_notes,
        -- Farmer region (best-effort from farmer table)
        f.district            AS farmer_district,
        f.sub_county          AS farmer_sub_county,
        -- Symptoms logged during the call
        (
          SELECT JSONB_AGG(
            JSONB_BUILD_OBJECT(
              'symptom', cs.symptom,
              'severity', cs.severity,
              'logged_at', cs.created_at
            ) ORDER BY cs.created_at
          )
          FROM call_symptoms cs WHERE cs.call_id = s.call_id
        )                     AS symptoms,
        -- All vet reviews for this suggestion
        (
          SELECT JSONB_AGG(
            JSONB_BUILD_OBJECT(
              'verdict',              vr.verdict,
              'diagnosis_accurate',   vr.diagnosis_accurate,
              'treatment_accurate',   vr.treatment_accurate,
              'severity_accurate',    vr.severity_accurate,
              'confidence_accurate',  vr.confidence_accurate,
              'correct_disease',      vr.suggested_diagnosis,
              'true_severity',        vr.true_severity,
              'notes',                vr.field_note,
              'reviewer_role',        a2.role,
              'reviewed_at',          vr.reviewed_at
            ) ORDER BY vr.reviewed_at
          )
          FROM vet_reviews vr
          JOIN agents a2 ON a2.id = vr.reviewer_id
          WHERE vr.suggestion_id = s.id
        )                     AS vet_reviews,
        -- Consensus summary
        (SELECT COUNT(*)::int  FROM vet_reviews vr WHERE vr.suggestion_id = s.id)              AS review_count,
        (SELECT COUNT(*)::int  FROM vet_reviews vr WHERE vr.suggestion_id = s.id AND vr.verdict = 'correct') AS correct_votes,
        (SELECT COUNT(*)::int  FROM vet_reviews vr WHERE vr.suggestion_id = s.id AND vr.verdict = 'incorrect') AS incorrect_votes,
        -- Most common correction (when wrong)
        (
          SELECT vr.suggested_diagnosis
          FROM vet_reviews vr
          WHERE vr.suggestion_id = s.id
            AND vr.suggested_diagnosis IS NOT NULL
            AND vr.verdict = 'incorrect'
          GROUP BY vr.suggested_diagnosis
          ORDER BY COUNT(*) DESC
          LIMIT 1
        )                     AS consensus_correct_disease
      FROM ai_suggestions s
      LEFT JOIN calls c ON c.id = s.call_id
      LEFT JOIN farmers f ON f.id::text = c.farmer_id
      WHERE s.category = 'disease_diagnosis'
        AND EXISTS (SELECT 1 FROM vet_reviews vr WHERE vr.suggestion_id = s.id)
      ORDER BY s.generated_at DESC
    `);

    // Shape into ML-ready records
    const records = rows.map(r => ({
      id: r.suggestion_id,
      generated_at: r.generated_at,
      call: {
        id: r.call_id,
        farmer_name: r.farmer_name,
        farmer_phone: r.farmer_phone,
        region: [r.farmer_sub_county, r.farmer_district].filter(Boolean).join(', ') || null,
        date: r.call_date,
        intent: r.call_intent,
        outcome: r.outcome,
        is_emergency: r.call_was_emergency,
        agent_notes: r.agent_notes || null,
      },
      input: {
        symptoms: (r.symptoms || []).map(s => ({ symptom: s.symptom, severity: s.severity })),
        symptom_text: (r.symptoms || []).map(s => s.symptom).join(', ') || null,
      },
      ai_prediction: {
        suggestion_text: r.suggestion_text,
        confidence: r.confidence_score ? Math.round(r.confidence_score * 100) / 100 : null,
        was_acted_on: r.was_acted_on,
      },
      vet_reviews: r.vet_reviews || [],
      consensus: {
        review_count: r.review_count,
        correct_votes: r.correct_votes,
        incorrect_votes: r.incorrect_votes,
        accurate: r.correct_votes > r.incorrect_votes,
        accuracy_pct: r.review_count > 0
          ? Math.round((r.correct_votes / r.review_count) * 100)
          : null,
        consensus_correct_disease: r.consensus_correct_disease || null,
      },
    }));

    if (format === 'jsonl') {
      const filename = `smartvet-training-${new Date().toISOString().slice(0,10)}.jsonl`;
      res.setHeader('Content-Type', 'application/x-ndjson');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      for (const record of records) {
        res.write(JSON.stringify(record) + '\n');
      }
      return res.end();
    }

    const filename = `smartvet-training-${new Date().toISOString().slice(0,10)}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json({ generated_at: new Date().toISOString(), total: records.length, records });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
