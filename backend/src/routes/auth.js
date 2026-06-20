import { Router } from 'express';
import {
  login, logout, refresh,
  changePassword, requestOtp, verifyOtp, createAgent,
} from '../controllers/authController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/login',       loginLimiter, login);
router.post('/logout',      requireAuth,  logout);
router.post('/refresh',     refresh);
router.post('/otp/request', requestOtp);
router.post('/otp/verify',  verifyOtp);
router.put('/password',     requireAuth,  changePassword);
router.post('/agents',      requireAuth, requireAdmin, createAgent);

export default router;
