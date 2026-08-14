import { Router } from 'express';

import { requireCsrf } from '../../middleware/csrf.middleware.js';

import {
  getCsrfToken,
  getSession,
  register,
  resendVerificationEmail,
  verifyEmail,
  login,
  logout,
} from './auth.controller.js';

import {
  registrationRateLimiter,
  resendVerificationRateLimiter,
  verificationRateLimiter,
  loginRateLimiter,
} from './auth.rateLimit.js';

import { requireAuth } from '../../middleware/auth.middleware.js';

const router = Router();

router.get('/csrf-token', getCsrfToken);
router.get('/session', getSession);

router.post('/register', registrationRateLimiter, register);

router.post('/email-verification/verify', verificationRateLimiter, verifyEmail);

router.post(
  '/email-verification/resend',
  resendVerificationRateLimiter,
  resendVerificationEmail,
);

// Future browser mutations added below this line
// will require the session-bound CSRF token.
router.use(requireCsrf);

router.post('/login', loginRateLimiter, login);

router.post('/logout', requireAuth, logout);

export default router;
