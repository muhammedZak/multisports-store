import { AppError } from '../utils/AppError.js';

import { getSessionUser } from '../modules/auth/auth.service.js';
import { authConfig } from '../modules/auth/auth.config.js';

export async function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return next(
      new AppError(401, 'AUTH_REQUIRED', 'Authentication is required.'),
    );
  }

  const user = await getSessionUser(req.session.userId);

  if (!user) {
    delete req.session.userId;
    delete req.session.authenticatedAt;

    return next(
      new AppError(401, 'AUTH_REQUIRED', 'Authentication is required.'),
    );
  }

  req.user = user;

  next();
}

export function requireCustomer(req, res, next) {
  if (!req.user || req.user.role !== 'customer') {
    return next(new AppError(403, 'FORBIDDEN', 'Customer access is required.'));
  }

  next();
}

export function requireRecentAuthentication(req, res, next) {
  const authenticatedAt = Number(req.session.authenticatedAt);

  if (!Number.isFinite(authenticatedAt)) {
    return next(
      new AppError(
        403,
        'REAUTH_REQUIRED',
        'Please authenticate again before changing your email.',
      ),
    );
  }

  const authenticationAge = Date.now() - authenticatedAt;

  const authenticationIsInvalid =
    authenticationAge < 0 ||
    authenticationAge > authConfig.emailChange.recentAuthenticationMaxAgeMs;

  if (authenticationIsInvalid) {
    return next(
      new AppError(
        403,
        'REAUTH_REQUIRED',
        'Please authenticate again before changing your email.',
      ),
    );
  }

  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return next(new AppError(403, 'FORBIDDEN', 'Admin access is required.'));
  }

  next();
}
