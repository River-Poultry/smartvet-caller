import { Router } from 'express';
import { listFarmers, getFarmer, getFarmerByPhone, createFarmer, updateFarmer, getDistricts, getUnknownFarmerTemplate } from '../controllers/farmerController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', listFarmers);
router.get('/search', getFarmerByPhone);
router.get('/districts', getDistricts);
router.get('/unknown/template', getUnknownFarmerTemplate);
router.get('/:farmerId', getFarmer);
router.post('/', createFarmer);
router.patch('/:farmerId', updateFarmer);

export default router;
