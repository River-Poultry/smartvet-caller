import { Router } from 'express';
import { listAgents, updateStatus, createAgent, updateAgent, getMetrics, syncFromDjango, deleteAgent, toggleAgentActive } from '../controllers/agentController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', requireAdmin, listAgents);
router.get('/metrics', requireAdmin, getMetrics);
router.patch('/status', updateStatus);
router.post('/', requireAdmin, createAgent);
router.patch('/:agentId', requireAdmin, updateAgent);
router.delete('/:agentId', requireAdmin, deleteAgent);
router.patch('/:agentId/toggle-active', requireAdmin, toggleAgentActive);
router.post('/sync-django', requireAdmin, syncFromDjango);

export default router;
