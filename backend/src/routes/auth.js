import { Router } from 'express';
import {
  login, logout, refresh,
  changePassword, requestOtp, verifyOtp, createAgent,
} from '../controllers/authController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { loginLimiter, refreshLimiter, otpLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/login',       loginLimiter,   login);
router.post('/logout',      requireAuth,    logout);
router.post('/refresh',     refreshLimiter, refresh);
router.post('/otp/request', otpLimiter,     requestOtp);
router.post('/otp/verify',  otpLimiter,     verifyOtp);
router.put('/password',     requireAuth,  changePassword);
router.post('/agents',      requireAuth, requireAdmin, createAgent);

export default router;
