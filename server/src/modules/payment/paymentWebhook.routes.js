import express, { Router } from 'express';

import { handleRazorpayWebhook } from './paymentWebhook.controller.js';

const router = Router();

/*
 * CRITICAL:
 *
 * This route must run BEFORE the application's
 * global express.json() middleware.
 *
 * Razorpay signature authentication requires
 * the exact raw bytes sent by Razorpay.
 *
 * No requireAuth.
 * No requireCustomer.
 * No requireCsrf.
 */
router.post(
  '/razorpay',

  express.raw({
    type: 'application/json',
    limit: '1mb',
  }),

  handleRazorpayWebhook,
);

export default router;
