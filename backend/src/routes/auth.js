import { Router } from 'express';
import { login, logout, changePassword } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.post('/logout', requireAuth, logout);
router.put('/password', requireAuth, changePassword);

export default router;
