import { Router } from 'express';

import { requireAdmin, requireAuth } from '../../middleware/auth.middleware.js';

import { getAdminDashboardController } from './dashboard.controller.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/dashboard', getAdminDashboardController);

export default router;
