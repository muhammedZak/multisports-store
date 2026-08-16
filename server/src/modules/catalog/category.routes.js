import { Router } from 'express';

import { getSports, getCategories } from './category.controller.js';

const router = Router();

router.get('/sports', getSports);

router.get('/categories', getCategories);

export default router;
