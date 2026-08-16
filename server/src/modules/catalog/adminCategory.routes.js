import { Router } from 'express';

import { requireAuth, requireAdmin } from '../../middleware/auth.middleware.js';

import { requireCsrf } from '../../middleware/csrf.middleware.js';

import {
  getCategoriesForAdmin,
  createCategoryForAdmin,
  updateCategoryForAdmin,
  updateCategoryStatusForAdmin,
} from './category.controller.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/', getCategoriesForAdmin);

router.post('/', requireCsrf, createCategoryForAdmin);

router.patch('/:categoryId', requireCsrf, updateCategoryForAdmin);

router.patch('/:categoryId/status', requireCsrf, updateCategoryStatusForAdmin);

export default router;
