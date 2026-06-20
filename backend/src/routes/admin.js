import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { syncFromVetaplay } from '../services/vetaplaySync.js';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get('/sync-vetaplay', async (req, res) => {
  try {
    const result = await syncFromVetaplay();
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
