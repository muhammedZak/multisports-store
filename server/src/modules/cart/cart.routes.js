import { Router } from 'express';

import {
  requireAuth,
  requireCustomer,
} from '../../middleware/auth.middleware.js';

import { requireCsrf } from '../../middleware/csrf.middleware.js';

import {
  getCartForCustomer,
  addCartItemForCustomer,
  mergeGuestCartForCustomer,
  updateCartItemQuantityForCustomer,
  removeCartItemForCustomer,
  clearCartForCustomer,
} from './cart.controller.js';

const router = Router();

router.use(requireAuth, requireCustomer);

router.get('/', getCartForCustomer);

router.post('/items', requireCsrf, addCartItemForCustomer);

router.post('/merge', requireCsrf, mergeGuestCartForCustomer);

router.patch(
  '/items/:cartItemId',
  requireCsrf,
  updateCartItemQuantityForCustomer,
);
router.delete('/items', requireCsrf, clearCartForCustomer);
router.delete('/items/:cartItemId', requireCsrf, removeCartItemForCustomer);

export default router;
