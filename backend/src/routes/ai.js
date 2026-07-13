import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { queryAIModel, isExternalModelConfigured } from '../services/aiModel.js';

const router = Router();

/**
 * POST /api/ai/ask
 * Send a free-text question OR symptoms to the AI model.
 * Body: { question?, symptoms?, bird_type?, context? }
 */
router.post('/ask', requireAuth, async (req, res) => {
  const { question = '', symptoms = [], bird_type = 'chicken', context = '' } = req.body;
  if (!question && !symptoms.length) {
    return res.status(400).json({ error: 'question or symptoms required' });
  }

  const result = await queryAIModel({ question, symptoms, bird_type, context });
  res.json({
    ...result,
    external_model_configured: isExternalModelConfigured(),
  });
});

/** GET /api/ai/status — tells frontend if external model is live */
router.get('/status', requireAuth, (req, res) => {
  res.json({
    external_model_configured: isExternalModelConfigured(),
    model_url: process.env.AI_MODEL_URL ? '(configured)' : null,
    local_engine: 'SmartVet Local Prescription Engine v1',
  });
});

export default router;
