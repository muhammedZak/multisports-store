import { Router } from 'express';

import {
  getProductsForPublic,
  getCatalogFilterOptionsForPublic,
} from './product.controller.js';

const router = Router();

router.get('/products', getProductsForPublic);

router.get('/catalog/filter-options', getCatalogFilterOptionsForPublic);

export default router;
