import { Router } from 'express';

import {
  requireAuth,
  requireCustomer,
} from '../../middleware/auth.middleware.js';

import { requireCsrf } from '../../middleware/csrf.middleware.js';

import {
  getCartForCustomer,
  addCartItemForCustomer,
  updateCartItemQuantityForCustomer,
} from './cart.controller.js';

const router = Router();

router.use(requireAuth, requireCustomer);

router.get('/', getCartForCustomer);

router.post('/items', requireCsrf, addCartItemForCustomer);

router.patch(
  '/items/:cartItemId',
  requireCsrf,
  updateCartItemQuantityForCustomer,
);

export default router;
