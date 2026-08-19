import { Router } from 'express';

import { requireAdmin, requireAuth } from '../../middleware/auth.middleware.js';

import { getOrderForAdmin, getOrdersForAdmin } from './order.controller.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/', getOrdersForAdmin);

router.get('/:orderId', getOrderForAdmin);

export default router;
