import { Router } from 'express';
import { initiateCallback, sendFarmerSms } from '../controllers/outreachController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// POST /api/outreach/callback  — agent calls farmer back
router.post('/callback', initiateCallback);

// POST /api/outreach/sms       — agent sends SMS to farmer
router.post('/sms', sendFarmerSms);

export default router;
