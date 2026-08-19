import { Router } from 'express';

import { validateCouponForGuest } from './coupon.controller.js';

const router = Router();

/*
 * Public, non-persistent validation endpoint.
 *
 * No requireAuth.
 * No requireAdmin.
 * No requireCsrf.
 *
 * Although POST is used because the Cart identities live in the
 * request body, this operation changes no server-side state.
 */
router.post('/validate', validateCouponForGuest);

export default router;
