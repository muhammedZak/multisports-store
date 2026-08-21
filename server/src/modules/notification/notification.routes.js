import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';

import { requireCsrf } from '../../middleware/csrf.middleware.js';

import {
  getNotifications,
  markNotificationRead,
} from './notification.controller.js';

const router = Router();

router.get('/notifications', requireAuth, getNotifications);

router.patch(
  '/notifications/:notificationId/read',
  requireAuth,
  requireCsrf,
  markNotificationRead,
);

export default router;
