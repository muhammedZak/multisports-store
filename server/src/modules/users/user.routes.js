import { Router } from 'express';

import {
  requireAuth,
  requireCustomer,
} from '../../middleware/auth.middleware.js';

import { requireCsrf } from '../../middleware/csrf.middleware.js';

import { getMyProfile, updateMyProfile } from './user.controller.js';

const router = Router();

router.get('/me', requireAuth, requireCustomer, getMyProfile);

router.patch('/me', requireAuth, requireCustomer, requireCsrf, updateMyProfile);

export default router;
