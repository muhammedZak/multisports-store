import { Router } from 'express';

import {
  requireAuth,
  requireCustomer,
} from '../../middleware/auth.middleware.js';

import { requireCsrf } from '../../middleware/csrf.middleware.js';

import {
  createSupportConversation,
  getSupportConversation,
} from './support.controller.js';

const router = Router();

router.get(
  '/support/conversation',
  requireAuth,
  requireCustomer,
  getSupportConversation,
);

router.post(
  '/support/conversation',
  requireAuth,
  requireCustomer,
  requireCsrf,
  createSupportConversation,
);

export default router;
