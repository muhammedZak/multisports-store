import { Router } from 'express';

import {
  requireAuth,
  requireCustomer,
} from '../../middleware/auth.middleware.js';

import { requireCsrf } from '../../middleware/csrf.middleware.js';

import {
  createRazorpayOrderForCustomer,
  verifyRazorpayPaymentForCustomerController,
} from './payment.controller.js';

const router = Router();

router.use(requireAuth, requireCustomer);

router.post('/razorpay/orders', requireCsrf, createRazorpayOrderForCustomer);

router.post(
  '/razorpay/verify',
  requireCsrf,
  verifyRazorpayPaymentForCustomerController,
);

export default router;
