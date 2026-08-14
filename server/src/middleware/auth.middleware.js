import { AppError } from '../utils/AppError.js';

import { getSessionUser } from '../modules/auth/auth.service.js';

export async function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return next(
      new AppError(401, 'AUTH_REQUIRED', 'Authentication is required.'),
    );
  }

  const user = await getSessionUser(req.session.userId);

  if (!user) {
    delete req.session.userId;

    return next(
      new AppError(401, 'AUTH_REQUIRED', 'Authentication is required.'),
    );
  }

  req.user = user;

  next();
}
