import { Router } from 'express';

import {
  requireAuth,
  requireCustomer,
} from '../../middleware/auth.middleware.js';

import { requireCsrf } from '../../middleware/csrf.middleware.js';

import { previewCheckoutForCustomer } from './checkout.controller.js';

const router = Router();

router.use(requireAuth, requireCustomer);

router.post('/preview', requireCsrf, previewCheckoutForCustomer);

export default router;
