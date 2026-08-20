import { Router } from 'express';

import {
  requireAuth,
  requireCustomer,
} from '../../middleware/auth.middleware.js';

import { requireCsrf } from '../../middleware/csrf.middleware.js';

import { createReviewForCustomer } from './review.controller.js';

const router = Router();

router.post(
  '/products/:productId/reviews',
  requireAuth,
  requireCustomer,
  requireCsrf,
  createReviewForCustomer,
);

export default router;
