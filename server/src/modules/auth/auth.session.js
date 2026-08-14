import { getOrCreateCsrfToken } from '../../middleware/csrf.middleware.js';

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
