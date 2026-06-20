import { Router } from 'express';
import { addSymptom, removeSymptom, listSymptoms } from '../controllers/symptomController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router({ mergeParams: true });
router.use(requireAuth);

router.get('/', listSymptoms);
router.post('/', addSymptom);
router.delete('/:symptomId', removeSymptom);

export default router;
