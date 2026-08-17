import { Router } from 'express';

import {
  getProductsForPublic,
  getProductForPublic,
  getCatalogFilterOptionsForPublic,
} from './product.controller.js';

const router = Router();

router.get('/products', getProductsForPublic);

router.get('/products/:productId', getProductForPublic);

router.get('/catalog/filter-options', getCatalogFilterOptionsForPublic);

export default router;
