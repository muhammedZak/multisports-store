import { Router } from 'express';

import { requireAuth, requireAdmin } from '../../middleware/auth.middleware.js';

import {
  getInventoriesForAdmin,
  getInventoryForAdmin,
} from './inventory.controller.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/', getInventoriesForAdmin);

router.get('/:inventoryId', getInventoryForAdmin);

export default router;
