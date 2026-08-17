import { Router } from 'express';

import { requireAuth, requireAdmin } from '../../middleware/auth.middleware.js';

import { requireCsrf } from '../../middleware/csrf.middleware.js';

import {
  getInventoriesForAdmin,
  getInventoryForAdmin,
  createInventoryAdjustmentForAdmin,
  getInventoryAdjustmentsForAdmin,
} from './inventory.controller.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/', getInventoriesForAdmin);

router.get('/:inventoryId/adjustments', getInventoryAdjustmentsForAdmin);

router.post(
  '/:inventoryId/adjustments',
  requireCsrf,
  createInventoryAdjustmentForAdmin,
);

router.get('/:inventoryId', getInventoryForAdmin);

export default router;
