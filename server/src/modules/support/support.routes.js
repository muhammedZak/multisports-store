import { Router } from 'express';

import {
  requireAdmin,
  requireAuth,
  requireCustomer,
} from '../../middleware/auth.middleware.js';

import { requireCsrf } from '../../middleware/csrf.middleware.js';

import {
  createSupportConversation,
  getAdminSupportConversation,
  getAdminSupportConversations,
  getAdminSupportMessages,
  getSupportConversation,
  getSupportMessages,
  markAdminSupportRead,
  markSupportConversationRead,
  sendAdminSupportMessage,
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


router.get(
  '/admin/support/conversations',
  requireAuth,
  requireAdmin,
  getAdminSupportConversations,
);

router.get(
  '/admin/support/conversations/:conversationId/messages',
  requireAuth,
  requireAdmin,
  getAdminSupportMessages,
);

router.post(
  '/admin/support/conversations/:conversationId/messages',
  requireAuth,
  requireAdmin,
  requireCsrf,
  sendAdminSupportMessage,
);

router.patch(
  '/admin/support/conversations/:conversationId/read',
  requireAuth,
  requireAdmin,
  requireCsrf,
  markAdminSupportRead,
);

router.get(
  '/admin/support/conversations/:conversationId',
  requireAuth,
  requireAdmin,
  getAdminSupportConversation,
);

export default router;
