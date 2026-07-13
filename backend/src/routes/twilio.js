import { Router } from 'express';
import {
  handleInbound, handleCallEnded, handleRecordingComplete,
  handleTranscriptionCallback, handleCallbackAnswer,
  handleWaitMusic, getAgentToken
} from '../controllers/twilioController.js';
import { twilioWebhook } from '../middleware/twilioValidate.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/inbound', twilioWebhook, handleInbound);
router.post('/call-ended', twilioWebhook, handleCallEnded);
router.post('/recording-complete', twilioWebhook, handleRecordingComplete);
router.post('/transcription-callback', twilioWebhook, handleTranscriptionCallback);
router.post('/callback-answer', twilioWebhook, handleCallbackAnswer);
router.get('/wait-music', handleWaitMusic);
router.get('/token', requireAuth, getAgentToken);

export default router;
