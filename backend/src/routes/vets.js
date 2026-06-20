import { Router } from 'express';
import { listVets, getVet, assignVetToDispatch, toggleAvailability, getNearbyVets } from '../controllers/vetController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', listVets);
router.get('/nearby', getNearbyVets);
router.get('/:vetId', getVet);
router.post('/dispatch/:dispatchId/assign', assignVetToDispatch);
router.patch('/:vetId/availability', requireAdmin, toggleAvailability);

export default router;
