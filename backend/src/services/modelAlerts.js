/**
 * Model alert checker — runs after each VetBoard review.
 * Creates entries in model_alerts when accuracy thresholds are crossed,
 * giving AI developers a clear signal to revisit the diagnosis engine.
 */
import { query } from '../db/index.js';
import { logger } from '../config/logger.js';

// Known diseases in our DISEASE_DB — used to detect unknown diseases in vet corrections
const KNOWN_DISEASES = [
  'newcastle', 'gumboro', 'ibd', 'coccidiosis', "marek's", 'marek',
  'fowl typhoid', 'salmonella', 'fowl pox', 'bronchitis', 'mycoplasma', 'crd',
  'flip-over', 'sudden death', 'ascites', 'water belly', 'gangrenous',
  'anaemia', 'cav', 'egg drop', 'aspergillosis', 'pullorum', 'cholera',
];

// Extract a readable disease name from suggestion_text using ILIKE patterns
function extractDisease(suggestionText) {
  const t = (suggestionText || '').toLowerCase();
  if (t.includes('newcastle'))    return 'Newcastle Disease';
  if (t.includes('gumboro'))      return 'Gumboro (IBD)';
  if (t.includes('coccidiosis'))  return 'Coccidiosis';
  if (t.includes("marek"))        return "Marek's Disease";
  if (t.includes('fowl typhoid')) return 'Fowl Typhoid';
  if (t.includes('fowl pox'))     return 'Fowl Pox';
  if (t.includes('bronchitis'))   return 'Inf. Bronchitis';
  if (t.includes('mycoplasma') || t.includes('crd')) return 'CRD / Mycoplasma';
  if (t.includes('flip-over') || t.includes('sudden death')) return 'Sudden Death Syndrome';
  if (t.includes('ascites') || t.includes('water belly')) return 'Ascites';
  if (t.includes('gangrenous'))   return 'Gangrenous Dermatitis';
  if (t.includes('anaemia') || t.includes('cav')) return 'Inf. Anaemia (CAV)';
  if (t.includes('egg drop'))     return 'Egg Drop Syndrome';
  return 'Unknown';
}

function isKnownDisease(text) {
  if (!text) return true; // no correction provided — don't flag
  const lower = text.toLowerCase();
  return KNOWN_DISEASES.some(d => lower.includes(d));
}

async function openAlertExists(diseaseName, triggerType) {
  const { rows } = await query(
    `SELECT id FROM model_alerts
     WHERE disease_name = $1 AND trigger_type = $2 AND status = 'open'`,
    [diseaseName, triggerType]
  );
  return rows.length > 0;
}

async function upsertAlert({ triggerType, diseaseName, accuracyPct, rejectionCount, reviewCount, sampleIds }) {
  // Don't duplicate open alerts for the same disease + trigger type
  if (await openAlertExists(diseaseName, triggerType)) return;

  await query(
    `INSERT INTO model_alerts
       (trigger_type, disease_name, accuracy_pct, rejection_count, review_count, sample_ids)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [triggerType, diseaseName, accuracyPct ?? null, rejectionCount ?? null, reviewCount ?? null, sampleIds ?? []]
  );
  logger.info('[modelAlerts] Alert created', { triggerType, diseaseName, accuracyPct });
}

/**
 * Run all threshold checks after a VetBoard review is submitted.
 * @param {string} suggestionId - the reviewed suggestion's UUID
 * @param {string} suggestedDiagnosis - what the vet says it actually was (may be null)
 */
export async function checkModelAlerts(suggestionId, suggestedDiagnosis) {
  try {
    // Get the suggestion text so we know which AI disease to evaluate
    const { rows: sRows } = await query(
      `SELECT s.suggestion_text, s.id
       FROM ai_suggestions s WHERE s.id = $1`,
      [suggestionId]
    );
    if (!sRows.length) return;

    const diseaseName = extractDisease(sRows[0].suggestion_text);

    // ── Check 1: accuracy drop (30-day window, min 5 reviews) ──────────────────
    const { rows: accRows } = await query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE vr.verdict = 'correct')::int AS correct,
         COUNT(*) FILTER (WHERE vr.verdict = 'incorrect')::int AS incorrect,
         ARRAY_AGG(s.id) AS ids
       FROM vet_reviews vr
       JOIN ai_suggestions s ON s.id = vr.suggestion_id
       WHERE s.suggestion_text ILIKE $1
         AND vr.reviewed_at >= NOW() - INTERVAL '30 days'`,
      [`%${sRows[0].suggestion_text.slice(0, 30)}%`]
    );

    // Re-query using disease keyword for broader match
    const diseaseKeyword = diseaseName === 'Unknown' ? sRows[0].suggestion_text.slice(0, 20) : diseaseName.split(' ')[0].toLowerCase();
    const { rows: broadRows } = await query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE vr.verdict = 'correct')::int AS correct,
         COUNT(*) FILTER (WHERE vr.verdict = 'incorrect')::int AS incorrect,
         ARRAY_AGG(s.id) AS ids
       FROM vet_reviews vr
       JOIN ai_suggestions s ON s.id = vr.suggestion_id
       WHERE s.suggestion_text ILIKE $1
         AND vr.reviewed_at >= NOW() - INTERVAL '30 days'`,
      [`%${diseaseKeyword}%`]
    );

    const { total, correct, incorrect, ids } = broadRows[0];
    if (total >= 5) {
      const accuracyPct = Math.round((correct / total) * 100);
      if (accuracyPct < 65) {
        await upsertAlert({
          triggerType: 'accuracy_drop',
          diseaseName,
          accuracyPct,
          rejectionCount: incorrect,
          reviewCount: total,
          sampleIds: ids || [],
        });
      }
    }

    // ── Check 2: rejection spike (7-day window, 5+ rejections) ─────────────────
    const { rows: spikeRows } = await query(
      `SELECT COUNT(*)::int AS rejections, ARRAY_AGG(s.id) AS ids
       FROM vet_reviews vr
       JOIN ai_suggestions s ON s.id = vr.suggestion_id
       WHERE s.suggestion_text ILIKE $1
         AND vr.verdict = 'incorrect'
         AND vr.reviewed_at >= NOW() - INTERVAL '7 days'`,
      [`%${diseaseKeyword}%`]
    );

    if (spikeRows[0].rejections >= 5) {
      await upsertAlert({
        triggerType: 'rejection_spike',
        diseaseName,
        rejectionCount: spikeRows[0].rejections,
        sampleIds: spikeRows[0].ids || [],
      });
    }

    // ── Check 3: vet corrected to an unknown disease ────────────────────────────
    if (suggestedDiagnosis && !isKnownDisease(suggestedDiagnosis)) {
      await upsertAlert({
        triggerType: 'unknown_disease',
        diseaseName: suggestedDiagnosis,
        sampleIds: [suggestionId],
      });
    }
  } catch (err) {
    // Never let alert checks crash the review submission
    logger.error('[modelAlerts] Check failed', { error: err.message });
  }
}

/**
 * Returns count of open model alerts (for dashboard badge).
 */
export async function openAlertCount() {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS count FROM model_alerts WHERE status = 'open'`
  );
  return rows[0].count;
}
