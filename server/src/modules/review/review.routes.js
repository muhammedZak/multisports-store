import { Router } from 'express';

import {
  requireAuth,
  requireCustomer,
} from '../../middleware/auth.middleware.js';

import { requireCsrf } from '../../middleware/csrf.middleware.js';

import {
  createReviewForCustomer,
  deleteReviewForCustomer,
  getReviewsForCustomer,
  getReviewsForPublic,
  updateReviewForCustomer,
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

router.get('/reviews/me', requireAuth, requireCustomer, getReviewsForCustomer);

router.patch(
  '/reviews/:reviewId',
  requireAuth,
  requireCustomer,
  requireCsrf,
  updateReviewForCustomer,
);

router.delete(
  '/reviews/:reviewId',
  requireAuth,
  requireCustomer,
  requireCsrf,
  deleteReviewForCustomer,
);

export default router;
