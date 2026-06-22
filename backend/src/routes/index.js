import { Router } from 'express';
import authRoutes from './auth.js';
import twilioRoutes from './twilio.js';
import callRoutes from './calls.js';
import dispatchRoutes from './dispatch.js';
import agentRoutes from './agents.js';
import farmerRoutes from './farmers.js';
import vetRoutes from './vets.js';
import symptomRoutes from './symptoms.js';
import diagnoseRoutes from './diagnose.js';
import aiRoutes from './ai.js';
import inventoryRoutes from './inventory.js';
import outreachRoutes from './outreach.js';
import insightsRoutes from './insights.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/twilio', twilioRoutes);
router.use('/calls', callRoutes);
router.use('/calls/:callId/symptoms', symptomRoutes);
router.use('/vet-dispatch', dispatchRoutes);
router.use('/agents', agentRoutes);
router.use('/farmers', farmerRoutes);
router.use('/vets', vetRoutes);
router.use('/diagnose', diagnoseRoutes);
router.use('/ai', aiRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/outreach', outreachRoutes);
router.use('/insights', insightsRoutes);

export default router;
