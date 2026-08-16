import { Router } from 'express';

import { requireAuth, requireAdmin } from '../../middleware/auth.middleware.js';

import { requireCsrf } from '../../middleware/csrf.middleware.js';

import {
  uploadInitialProductImages,
  uploadAdditionalProductImages,
} from './product.upload.js';

import {
  getProductsForAdmin,
  getProductForAdmin,
  createProductForAdmin,
  updateProductForAdmin,
  updateProductStatusForAdmin,
  addProductImagesForAdmin,
  updateProductImageForAdmin,
  deleteProductImageForAdmin,
  addProductVariantForAdmin,
  updateProductVariantForAdmin,
  updateProductVariantStatusForAdmin,
} from './product.controller.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/', getProductsForAdmin);

router.get('/:productId', getProductForAdmin);

router.post(
  '/',
  requireCsrf,
  uploadInitialProductImages,
  createProductForAdmin,
);

router.post(
  '/:productId/images',
  requireCsrf,
  uploadAdditionalProductImages,
  addProductImagesForAdmin,
);

router.patch(
  '/:productId/images/:imageId',
  requireCsrf,
  updateProductImageForAdmin,
);

router.delete(
  '/:productId/images/:imageId',
  requireCsrf,
  deleteProductImageForAdmin,
);

router.post('/:productId/variants', requireCsrf, addProductVariantForAdmin);

router.patch(
  '/:productId/variants/:variantId/status',
  requireCsrf,
  updateProductVariantStatusForAdmin,
);

router.patch(
  '/:productId/variants/:variantId',
  requireCsrf,
  updateProductVariantForAdmin,
);

router.patch('/:productId/status', requireCsrf, updateProductStatusForAdmin);

router.patch('/:productId', requireCsrf, updateProductForAdmin);

export default router;
