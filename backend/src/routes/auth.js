import { Router } from 'express';
import {
  login, logout, refresh,
  changePassword, requestOtp, verifyOtp,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { loginLimiter, refreshLimiter, otpLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/login',       loginLimiter,   login);
router.post('/logout',      requireAuth,    logout);
router.post('/refresh',     refreshLimiter, refresh);
router.post('/otp/request', otpLimiter,     requestOtp);
router.post('/otp/verify',  otpLimiter,     verifyOtp);
router.put('/password',     requireAuth,  changePassword);

export default router;
