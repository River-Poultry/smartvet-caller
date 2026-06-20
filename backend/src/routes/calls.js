import { Router } from 'express';
import {
  getActiveCall, getCallSuggestions, submitPostCall,
  listCalls, getCallDetail, triggerSuggestions, startDemoCall, endDemoCall
} from '../controllers/callController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', listCalls);
router.get('/active', getActiveCall);
router.post('/demo/start', startDemoCall);
router.post('/demo/end', endDemoCall);
router.get('/:callId', getCallDetail);
router.get('/:callId/suggestions', getCallSuggestions);
router.post('/:callId/suggestions', triggerSuggestions);
router.post('/:callId/post-call', submitPostCall);

export default router;
