import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { diagnoseFromSymptoms, buildDiagnosisSummary } from '../services/diseaseDiagnosis.js';

const router = Router();

router.post('/', requireAuth, (req, res) => {
  const { symptoms = [], free_text = '', bird_type = 'chicken' } = req.body;

  if (!symptoms.length && !free_text) {
    return res.json({ diagnoses: [], summary: '' });
  }

  const diagnoses = diagnoseFromSymptoms(symptoms, free_text, bird_type);
  const summary = buildDiagnosisSummary(diagnoses, symptoms);

  res.json({
    diagnoses,
    summary,
    is_emergency: diagnoses.some(d => d.is_emergency && d.confidence > 0.4),
    is_notifiable: diagnoses.some(d => d.is_notifiable && d.confidence > 0.3),
    top_disease: diagnoses[0]?.name || null,
  });
});

export default router;
