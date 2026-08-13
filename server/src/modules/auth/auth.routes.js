import { Router } from 'express';

import { getCsrfToken, getSession } from './auth.controller.js';

import { requireCsrf } from '../../middleware/csrf.middleware.js';

const router = Router();

router.get('/csrf-token', getCsrfToken);
router.get('/session', getSession);

// Future browser mutations added below this line
// will require the session-bound CSRF token.
router.use(requireCsrf);

export default router;
