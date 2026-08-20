import { Router } from 'express';

import {
  requireAdmin,
  requireAuth,
  requireCustomer,
} from '../../middleware/auth.middleware.js';

import { requireCsrf } from '../../middleware/csrf.middleware.js';

import {
  createReviewForCustomer,
  deleteReviewForCustomer,
  getReviewForAdmin,
  getReviewsForAdmin,
  getReviewsForCustomer,
  getReviewsForPublic,
  moderateReviewForAdmin,
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

router.get('/admin/reviews', requireAuth, requireAdmin, getReviewsForAdmin);

router.get(
  '/admin/reviews/:reviewId',
  requireAuth,
  requireAdmin,
  getReviewForAdmin,
);

router.patch(
  '/admin/reviews/:reviewId/moderation',
  requireAuth,
  requireAdmin,
  requireCsrf,
  moderateReviewForAdmin,
);

export default router;
