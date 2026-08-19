import { Router } from 'express';

import { requireAdmin, requireAuth } from '../../middleware/auth.middleware.js';

import { requireCsrf } from '../../middleware/csrf.middleware.js';

import {
  getOrderForAdmin,
  getOrdersForAdmin,
  updateOrderStatusForAdmin,
} from './order.controller.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/', getOrdersForAdmin);

router.patch('/:orderId/status', requireCsrf, updateOrderStatusForAdmin);

router.get('/:orderId', getOrderForAdmin);

export default router;
