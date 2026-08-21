import { Router } from 'express';

import { requireAdmin, requireAuth } from '../../middleware/auth.middleware.js';

import { getAdminDashboardController } from './dashboard.controller.js';

import { getAdminAnalyticsController } from './analytics.controller.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/dashboard', getAdminDashboardController);

router.get('/analytics', getAdminAnalyticsController);

export default router;
