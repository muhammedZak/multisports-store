import { Router } from 'express';

import {
  requireAdmin,
  requireAuth,
  requireCustomer,
} from '../../middleware/auth.middleware.js';

import { requireCsrf } from '../../middleware/csrf.middleware.js';

import {
  createRefundForCustomer,
  decideRefundForAdmin,
  getRefundForAdmin,
  getRefundForCustomer,
  getRefundsForAdmin,
  getRefundsForCustomer,
} from './refund.controller.js';

const router = Router();

router.get('/refunds', requireAuth, requireCustomer, getRefundsForCustomer);

router.get(
  '/refunds/:refundId',
  requireAuth,
  requireCustomer,
  getRefundForCustomer,
);

router.post(
  '/orders/:orderId/refunds',
  requireAuth,
  requireCustomer,
  requireCsrf,
  createRefundForCustomer,
);

router.get('/admin/refunds', requireAuth, requireAdmin, getRefundsForAdmin);

router.patch(
  '/admin/refunds/:refundId/decision',
  requireAuth,
  requireAdmin,
  requireCsrf,
  decideRefundForAdmin,
);

router.get(
  '/admin/refunds/:refundId',
  requireAuth,
  requireAdmin,
  getRefundForAdmin,
);

export default router;
