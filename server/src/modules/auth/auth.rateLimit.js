import { rateLimit } from 'express-rate-limit';

import { authConfig } from './auth.config.js';

function createAuthRateLimiter(config) {
  return rateLimit({
    windowMs: config.windowMs,
    limit: config.limit,

    standardHeaders: 'draft-8',
    legacyHeaders: false,

    handler(req, res) {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many authentication requests. Please try again later.',
        },
      });
    },
  });
}

export const registrationRateLimiter = createAuthRateLimiter(
  authConfig.rateLimits.registration,
);

export const verificationRateLimiter = createAuthRateLimiter(
  authConfig.rateLimits.verification,
);

export const resendVerificationRateLimiter = createAuthRateLimiter(
  authConfig.rateLimits.resend,
);

export const loginRateLimiter = createAuthRateLimiter(
  authConfig.rateLimits.login,
);

export const passwordChangeRateLimiter = createAuthRateLimiter(
  authConfig.rateLimits.passwordChange,
);