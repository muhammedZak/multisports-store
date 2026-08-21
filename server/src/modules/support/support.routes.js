import { Router } from 'express';

import {
  requireAuth,
  requireCustomer,
} from '../../middleware/auth.middleware.js';

import { requireCsrf } from '../../middleware/csrf.middleware.js';

import {
  createSupportConversation,
  getSupportConversation,
  getSupportMessages,
  markSupportConversationRead,
  sendSupportMessage,
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

router.get(
  '/support/conversation/messages',
  requireAuth,
  requireCustomer,
  getSupportMessages,
);

router.post(
  '/support/conversation/messages',
  requireAuth,
  requireCustomer,
  requireCsrf,
  sendSupportMessage,
);

router.patch(
  '/support/conversation/read',
  requireAuth,
  requireCustomer,
  requireCsrf,
  markSupportConversationRead,
);

export default router;
