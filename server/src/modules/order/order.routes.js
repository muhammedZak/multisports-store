import { Router } from 'express';

import {
  requireAuth,
  requireCustomer,
} from '../../middleware/auth.middleware.js';

import {
  getOrderForCustomer,
  getOrdersForCustomer,
} from './order.controller.js';

const router = Router();

router.use(requireAuth, requireCustomer);

router.get('/', getOrdersForCustomer);

router.get('/:orderId', getOrderForCustomer);

export default router;
