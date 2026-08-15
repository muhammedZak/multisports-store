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
  requestOtpLogin,
  verifyOtpLogin,
  googleAuth,
  forgotPassword,
  verifyForgotPasswordOtp,
  resetPassword,
  changePassword,
} from './auth.controller.js';

import {
  registrationRateLimiter,
  resendVerificationRateLimiter,
  verificationRateLimiter,
  loginRateLimiter,
  passwordChangeRateLimiter,
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

router.post('/google', loginRateLimiter, googleAuth);

router.post('/otp/request', loginRateLimiter, requestOtpLogin);

router.post('/otp/verify', verificationRateLimiter, verifyOtpLogin);

router.post('/password/forgot', loginRateLimiter, forgotPassword);

router.post(
  '/password/forgot/verify',
  verificationRateLimiter,
  verifyForgotPasswordOtp,
);

router.post('/password/reset', loginRateLimiter, resetPassword);

router.patch(
  '/password',
  requireAuth,
  passwordChangeRateLimiter,
  changePassword,
);

router.post('/logout', requireAuth, logout);

export default router;
