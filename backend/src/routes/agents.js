import { Router } from 'express';
import { listAgents, updateStatus, createAgent, updateAgent, getMetrics } from '../controllers/agentController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', requireAdmin, listAgents);
router.get('/metrics', requireAdmin, getMetrics);
router.patch('/status', updateStatus);
router.post('/', requireAdmin, createAgent);
router.patch('/:agentId', requireAdmin, updateAgent);

export default router;
