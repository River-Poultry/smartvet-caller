import { Router } from 'express';
import { createDispatch, getDispatchStatus, updateDispatchStatus, listDispatches, escalateDispatch, resolveDispatch } from '../controllers/dispatchController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', listDispatches);
router.post('/', createDispatch);
router.get('/:dispatchId/status', getDispatchStatus);
router.patch('/:dispatchId/status', requireAdmin, updateDispatchStatus);
router.patch('/:dispatchId/escalate', requireAuth, escalateDispatch);
router.patch('/:dispatchId/resolve', requireAuth, resolveDispatch);

export default router;
