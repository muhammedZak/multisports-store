import { getOrCreateCsrfToken } from '../../middleware/csrf.middleware.js';
import { AppError } from '../../utils/AppError.js';
import { authConfig } from './auth.config.js';

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

export async function createAuthenticatedSession(req, userId) {
  await regenerateSession(req);

  req.session.userId = userId;

  const csrfToken = getOrCreateCsrfToken(req);

  await saveSession(req);

  return csrfToken;
}

export async function createAnonymousSession(req) {
  await regenerateSession(req);

  const csrfToken = getOrCreateCsrfToken(req);

  await saveSession(req);

  return csrfToken;
}

export async function createPasswordResetAuthorization(req, userId) {
  req.session.passwordReset = {
    userId: userId.toString(),
    expiresAt: Date.now() + authConfig.passwordRecovery.resetAuthorizationTtlMs,
  };

  await saveSession(req);
}

export async function getPasswordResetAuthorization(req) {
  const authorization = req.session.passwordReset;

  if (!authorization?.userId) {
    throw new AppError(
      403,
      'RECOVERY_NOT_AUTHORIZED',
      'Password reset is not authorized.',
    );
  }

  if (!authorization.expiresAt || Date.now() >= authorization.expiresAt) {
    delete req.session.passwordReset;

    await saveSession(req);

    throw new AppError(
      403,
      'RECOVERY_AUTHORIZATION_EXPIRED',
      'Password reset authorization has expired.',
    );
  }

  return {
    userId: authorization.userId,
  };
}

export async function consumePasswordResetAuthorization(req) {
  delete req.session.passwordReset;

  // Password reset must not authenticate the Customer.
  // If this workflow was somehow used from an authenticated
  // browser session, ensure it finishes logged out.
  delete req.session.userId;

  await saveSession(req);
}
