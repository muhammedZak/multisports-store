import { Router } from 'express';

import {
  requireAuth,
  requireCustomer,
} from '../../middleware/auth.middleware.js';

import { requireCsrf } from '../../middleware/csrf.middleware.js';

import {
  createRefundForCustomer,
  getRefundForCustomer,
  getRefundsForCustomer,
} from './refund.controller.js';

const router = Router();

router.use(requireAuth, requireCustomer);

router.get('/refunds', getRefundsForCustomer);

router.get('/refunds/:refundId', getRefundForCustomer);

router.post(
  '/orders/:orderId/refunds',
  requireCsrf,
  createRefundForCustomer,
);

export default router;
