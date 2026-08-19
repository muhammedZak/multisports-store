import { Router } from 'express';

import { requireAuth, requireAdmin } from '../../middleware/auth.middleware.js';

import { requireCsrf } from '../../middleware/csrf.middleware.js';

import {
  getCouponsForAdmin,
  getCouponForAdmin,
  createCouponForAdmin,
  updateCouponForAdmin,
  updateCouponStatusForAdmin,
} from './coupon.controller.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/', getCouponsForAdmin);

router.get('/:couponId', getCouponForAdmin);

router.post('/', requireCsrf, createCouponForAdmin);

router.patch('/:couponId/status', requireCsrf, updateCouponStatusForAdmin);

router.patch('/:couponId', requireCsrf, updateCouponForAdmin);

export default router;
