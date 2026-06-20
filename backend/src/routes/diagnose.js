import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { diagnoseFromSymptoms, buildDiagnosisSummary } from '../services/diseaseDiagnosis.js';

const router = Router();

/**
 * POST /api/diagnose
 * Instant synchronous diagnosis — no call context needed.
 * Body: { symptoms: string[], free_text?: string, bird_type?: string }
 * Returns ranked differential diagnoses with treatment + prevention.
 */
router.post('/', requireAuth, (req, res) => {
  const { symptoms = [], free_text = '', bird_type = 'chicken' } = req.body;

  if (!symptoms.length && !free_text) {
    return res.json({ diagnoses: [], summary: '' });
  }

  const diagnoses = diagnoseFromSymptoms(symptoms, free_text, bird_type);
  const summary = buildDiagnosisSummary(diagnoses, symptoms);

  res.json({
    diagnoses,          // [{ name, confidence, is_emergency, is_zoonotic, is_notifiable, treatment, prevention }]
    summary,            // human-readable string
    is_emergency: diagnoses.some(d => d.is_emergency && d.confidence > 0.4),
    is_notifiable: diagnoses.some(d => d.is_notifiable && d.confidence > 0.3),
    top_disease: diagnoses[0]?.name || null,
  });
});

export default router;
