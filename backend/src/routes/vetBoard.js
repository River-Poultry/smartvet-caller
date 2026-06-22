import { Router } from 'express';
import { requireAuth, requireVetBoard } from '../middleware/auth.js';
import { query } from '../db/index.js';

const router = Router();
router.use(requireAuth, requireVetBoard);

// GET /vet-board/queue?page=1&limit=20&verdict=&disease=
// Returns AI diagnosis suggestions awaiting vet board review (or all with verdict filter)
router.get('/queue', async (req, res) => {
  const page    = Math.max(1, parseInt(req.query.page) || 1);
  const limit   = Math.min(50, parseInt(req.query.limit) || 20);
  const offset  = (page - 1) * limit;
  const verdict = req.query.verdict || ''; // 'pending' | 'correct' | 'incorrect' | 'partial'
  const disease = req.query.disease || '';

  try {
    const conditions = [`s.category = 'disease_diagnosis'`];
    const params = [];
    let p = 1;

    if (verdict === 'pending') {
      conditions.push(`NOT EXISTS (
        SELECT 1 FROM vet_reviews vr WHERE vr.suggestion_id = s.id AND vr.reviewer_id = $${p}
      )`);
      params.push(req.agent.id);
      p++;
    } else if (verdict && verdict !== 'all') {
      conditions.push(`EXISTS (
        SELECT 1 FROM vet_reviews vr WHERE vr.suggestion_id = s.id AND vr.verdict = $${p}
      )`);
      params.push(verdict);
      p++;
    }

    if (disease) {
      conditions.push(`s.suggestion_text ILIKE $${p}`);
      params.push(`%${disease}%`);
      p++;
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const countRes = await query(
      `SELECT COUNT(*)::int AS total FROM ai_suggestions s ${where}`,
      params
    );

    const rows = await query(
      `SELECT
        s.id, s.call_id, s.suggestion_text, s.confidence_score,
        s.category, s.was_acted_on, s.generated_at,
        c.farmer_name, c.phone_number, c.started_at AS call_date,
        c.call_intent, c.outcome, c.is_emergency,
        a.name AS agent_name,
        vr.id AS review_id, vr.verdict, vr.diagnosis_accurate, vr.treatment_accurate,
        vr.severity_accurate, vr.confidence_accurate, vr.field_note,
        vr.suggested_diagnosis, vr.true_severity, vr.reviewed_at
       FROM ai_suggestions s
       LEFT JOIN calls c ON c.id = s.call_id
       LEFT JOIN agents a ON a.id = c.agent_id
       LEFT JOIN vet_reviews vr ON vr.suggestion_id = s.id AND vr.reviewer_id = $${p}
       ${where}
       ORDER BY s.generated_at DESC
       LIMIT $${p + 1} OFFSET $${p + 2}`,
      [...params, req.agent.id, limit, offset]
    );

    res.json({ suggestions: rows.rows, total: countRes.rows[0].total, page, limit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /vet-board/review  — submit or update a review
router.post('/review', async (req, res) => {
  const {
    suggestion_id, verdict, diagnosis_accurate, treatment_accurate,
    severity_accurate, confidence_accurate, field_note,
    suggested_diagnosis, true_severity,
  } = req.body;

  if (!suggestion_id || !verdict) {
    return res.status(400).json({ error: 'suggestion_id and verdict required' });
  }
  if (!['correct', 'incorrect', 'partial'].includes(verdict)) {
    return res.status(400).json({ error: 'verdict must be correct | incorrect | partial' });
  }

  try {
    const { rows } = await query(
      `INSERT INTO vet_reviews
        (suggestion_id, reviewer_id, verdict, diagnosis_accurate, treatment_accurate,
         severity_accurate, confidence_accurate, field_note, suggested_diagnosis, true_severity)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (suggestion_id, reviewer_id) DO UPDATE SET
         verdict               = EXCLUDED.verdict,
         diagnosis_accurate    = EXCLUDED.diagnosis_accurate,
         treatment_accurate    = EXCLUDED.treatment_accurate,
         severity_accurate     = EXCLUDED.severity_accurate,
         confidence_accurate   = EXCLUDED.confidence_accurate,
         field_note            = EXCLUDED.field_note,
         suggested_diagnosis   = EXCLUDED.suggested_diagnosis,
         true_severity         = EXCLUDED.true_severity,
         reviewed_at           = NOW()
       RETURNING *`,
      [suggestion_id, req.agent.id, verdict,
       diagnosis_accurate ?? null, treatment_accurate ?? null,
       severity_accurate ?? null, confidence_accurate ?? null,
       field_note || null, suggested_diagnosis || null, true_severity || null]
    );

    // Mirror to lightweight flag for backward compat with insights tab
    await query(
      `UPDATE ai_suggestions
       SET feedback_correct = $1, feedback_by = $2, feedback_at = NOW()
       WHERE id = $3`,
      [verdict === 'correct', req.agent.id, suggestion_id]
    );

    res.json({ review: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /vet-board/stats  — reviewer's personal stats + board-wide summary
router.get('/stats', async (req, res) => {
  try {
    const [personal, boardWide, agreementByDisease, pendingCount] = await Promise.all([
      // This reviewer's stats
      query(`
        SELECT
          COUNT(*)::int                                          AS total_reviews,
          COUNT(*) FILTER (WHERE verdict = 'correct')::int      AS correct,
          COUNT(*) FILTER (WHERE verdict = 'incorrect')::int    AS incorrect,
          COUNT(*) FILTER (WHERE verdict = 'partial')::int      AS partial,
          ROUND(100.0 * COUNT(*) FILTER (WHERE verdict = 'correct') / NULLIF(COUNT(*), 0))::int AS correct_pct,
          COUNT(*) FILTER (WHERE reviewed_at >= NOW() - INTERVAL '7 days')::int AS reviews_7d,
          COUNT(*) FILTER (WHERE reviewed_at >= NOW() - INTERVAL '30 days')::int AS reviews_30d
        FROM vet_reviews
        WHERE reviewer_id = $1
      `, [req.agent.id]),

      // Board-wide aggregate
      query(`
        SELECT
          COUNT(DISTINCT reviewer_id)::int                          AS total_reviewers,
          COUNT(*)::int                                             AS total_reviews,
          COUNT(*) FILTER (WHERE verdict = 'correct')::int         AS correct,
          COUNT(*) FILTER (WHERE verdict = 'incorrect')::int       AS incorrect,
          COUNT(*) FILTER (WHERE verdict = 'partial')::int         AS partial,
          ROUND(100.0 * COUNT(*) FILTER (WHERE verdict = 'correct') / NULLIF(COUNT(*), 0))::int AS ai_accuracy_pct,
          ROUND(AVG(CASE WHEN verdict = 'correct' THEN s.confidence_score ELSE NULL END) * 100)::int AS avg_confidence_when_correct,
          ROUND(AVG(CASE WHEN verdict = 'incorrect' THEN s.confidence_score ELSE NULL END) * 100)::int AS avg_confidence_when_wrong
        FROM vet_reviews vr
        JOIN ai_suggestions s ON s.id = vr.suggestion_id
      `),

      // Accuracy breakdown by extracted disease
      query(`
        SELECT
          CASE
            WHEN s.suggestion_text ILIKE '%newcastle%'      THEN 'Newcastle Disease'
            WHEN s.suggestion_text ILIKE '%gumboro%'        THEN 'Gumboro (IBD)'
            WHEN s.suggestion_text ILIKE '%coccidiosis%'    THEN 'Coccidiosis'
            WHEN s.suggestion_text ILIKE '%marek%'          THEN "Marek's Disease"
            WHEN s.suggestion_text ILIKE '%fowl typhoid%'   THEN 'Fowl Typhoid'
            WHEN s.suggestion_text ILIKE '%fowl pox%'       THEN 'Fowl Pox'
            WHEN s.suggestion_text ILIKE '%bronchitis%'     THEN 'Inf. Bronchitis'
            WHEN s.suggestion_text ILIKE '%mycoplasma%' OR s.suggestion_text ILIKE '%crd%' THEN 'CRD / Mycoplasma'
            WHEN s.suggestion_text ILIKE '%flip-over%' OR s.suggestion_text ILIKE '%sudden death syndrome%' THEN 'SDS / Flip-over'
            WHEN s.suggestion_text ILIKE '%ascites%' OR s.suggestion_text ILIKE '%water belly%' THEN 'Ascites'
            WHEN s.suggestion_text ILIKE '%gangrenous%'     THEN 'Gangrenous Dermatitis'
            WHEN s.suggestion_text ILIKE '%anaemia%'        THEN 'Inf. Anaemia (CAV)'
            WHEN s.suggestion_text ILIKE '%egg drop%'       THEN 'Egg Drop Syndrome'
            ELSE 'Other'
          END AS disease,
          COUNT(*)::int AS reviews,
          COUNT(*) FILTER (WHERE vr.verdict = 'correct')::int AS correct,
          COUNT(*) FILTER (WHERE vr.verdict = 'incorrect')::int AS incorrect,
          ROUND(100.0 * COUNT(*) FILTER (WHERE vr.verdict = 'correct') / NULLIF(COUNT(*), 0))::int AS accuracy_pct
        FROM vet_reviews vr
        JOIN ai_suggestions s ON s.id = vr.suggestion_id
        GROUP BY 1
        ORDER BY reviews DESC
      `),

      // Pending (unreviewed by this user)
      query(`
        SELECT COUNT(*)::int AS pending
        FROM ai_suggestions s
        WHERE s.category = 'disease_diagnosis'
          AND NOT EXISTS (
            SELECT 1 FROM vet_reviews vr WHERE vr.suggestion_id = s.id AND vr.reviewer_id = $1
          )
      `, [req.agent.id]),
    ]);

    res.json({
      personal: personal.rows[0],
      board: boardWide.rows[0],
      by_disease: agreementByDisease.rows,
      pending_count: pendingCount.rows[0].pending,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /vet-board/export  — training dataset export (CSV-friendly JSON)
router.get('/export', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        s.id AS suggestion_id,
        s.suggestion_text,
        s.confidence_score,
        s.category,
        s.was_acted_on,
        s.generated_at,
        c.call_intent, c.outcome, c.is_emergency,
        COUNT(vr.id)::int AS review_count,
        COUNT(vr.id) FILTER (WHERE vr.verdict = 'correct')::int AS correct_votes,
        COUNT(vr.id) FILTER (WHERE vr.verdict = 'incorrect')::int AS incorrect_votes,
        COUNT(vr.id) FILTER (WHERE vr.verdict = 'partial')::int AS partial_votes,
        ROUND(100.0 * COUNT(vr.id) FILTER (WHERE vr.verdict = 'correct') / NULLIF(COUNT(vr.id), 0))::int AS consensus_accuracy,
        STRING_AGG(vr.field_note, ' | ') AS field_notes,
        STRING_AGG(DISTINCT vr.suggested_diagnosis, ', ') AS alternative_diagnoses,
        MODE() WITHIN GROUP (ORDER BY vr.true_severity) AS consensus_severity
      FROM ai_suggestions s
      LEFT JOIN calls c ON c.id = s.call_id
      LEFT JOIN vet_reviews vr ON vr.suggestion_id = s.id
      WHERE s.category = 'disease_diagnosis'
        AND EXISTS (SELECT 1 FROM vet_reviews v2 WHERE v2.suggestion_id = s.id)
      GROUP BY s.id, s.suggestion_text, s.confidence_score, s.category,
               s.was_acted_on, s.generated_at, c.call_intent, c.outcome, c.is_emergency
      ORDER BY review_count DESC, s.generated_at DESC
    `);

    res.json({ export: rows, generated_at: new Date().toISOString(), total: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
