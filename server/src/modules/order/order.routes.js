import { Router } from 'express';

import {
  requireAuth,
  requireCustomer,
} from '../../middleware/auth.middleware.js';

import {
  cancelOrderForCustomer,
  getOrderForCustomer,
  getOrdersForCustomer,
} from './order.controller.js';

import { requireCsrf } from '../../middleware/csrf.middleware.js';

const router = Router();

router.use(requireAuth, requireCustomer);

router.get('/', getOrdersForCustomer);

router.post('/:orderId/cancel', requireCsrf, cancelOrderForCustomer);

router.get('/:orderId', getOrderForCustomer);

export default router;
