import crypto from 'node:crypto';

import { AppError } from '../utils/AppError.js';

export function getOrCreateCsrfToken(req) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }

  return req.session.csrfToken;
}

export function requireCsrf(req, res, next) {
  const submittedToken = req.get('X-CSRF-Token');
  const sessionToken = req.session.csrfToken;

  if (!submittedToken || !sessionToken) {
    return next(new AppError(403, 'CSRF_INVALID', 'Invalid CSRF token'));
  }

  const submittedBuffer = Buffer.from(submittedToken);
  const sessionBuffer = Buffer.from(sessionToken);

  const tokensMatch =
    submittedBuffer.length === sessionBuffer.length &&
    crypto.timingSafeEqual(submittedBuffer, sessionBuffer);

  if (!tokensMatch) {
    return next(new AppError(403, 'CSRF_INVALID', 'Invalid CSRF token'));
  }

  next();
}
