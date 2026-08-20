import { Router } from 'express';

import {
  requireAuth,
  requireCustomer,
} from '../../middleware/auth.middleware.js';

import { requireCsrf } from '../../middleware/csrf.middleware.js';

import {
  createReviewForCustomer,
  getReviewsForPublic,
} from './review.controller.js';

const router = Router();

router.get('/products/:productId/reviews', getReviewsForPublic);

router.post(
  '/products/:productId/reviews',
  requireAuth,
  requireCustomer,
  requireCsrf,
  createReviewForCustomer,
);

export default router;
