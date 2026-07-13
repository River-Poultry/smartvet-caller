import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { diagnoseFromSymptoms, buildDiagnosisSummary } from '../services/diseaseDiagnosis.js';

const router = Router();

router.post('/', requireAuth, (req, res) => {
  const { symptoms = [], free_text = '', bird_type, flock_details = {} } = req.body;

  const birdType = flock_details.birdType || bird_type || 'chicken';

  if (!symptoms.length && !free_text) {
    return res.json({ diagnoses: [], summary: '' });
  }

  const diagnoses = diagnoseFromSymptoms(symptoms, free_text, birdType, flock_details);
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
