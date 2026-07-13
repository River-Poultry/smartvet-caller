import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  getInventory, getDrugSuggestions, upsertInventoryItem, adjustStock, vetUpdateStock,
  getWarehouse, updateWarehouseStock, allocateToVet, getAllocationHistory,
} from '../controllers/inventoryController.js';

const router = Router();

router.get('/',              requireAuth,  getInventory);
router.get('/suggestions',   requireAuth,  getDrugSuggestions);
router.post('/',             requireAdmin, upsertInventoryItem);
router.patch('/:id/stock',   requireAdmin, adjustStock);
router.patch('/:id/vet-stock', requireAuth, vetUpdateStock);

router.get('/warehouse',              requireAuth,  getWarehouse);
router.patch('/warehouse/:id/stock',  requireAdmin, updateWarehouseStock);
router.post('/warehouse/allocate',    requireAdmin, allocateToVet);
router.get('/warehouse/allocations',  requireAdmin, getAllocationHistory);

export default router;
