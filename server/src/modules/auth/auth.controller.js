import { getOrCreateCsrfToken } from '../../middleware/csrf.middleware.js';
import { getSessionUser } from './auth.service.js';

export function getCsrfToken(req, res) {
  const csrfToken = getOrCreateCsrfToken(req);

  res.status(200).json({
    success: true,
    data: {
      csrfToken,
    },
  });
}

export async function getSession(req, res) {
  if (!req.session.userId) {
    return res.status(200).json({
      success: true,
      data: {
        authenticated: false,
        user: null,
      },
    });
  }

  const user = await getSessionUser(req.session.userId);

  if (!user) {
    delete req.session.userId;

    return res.status(200).json({
      success: true,
      data: {
        authenticated: false,
        user: null,
      },
    });
  }

  res.status(200).json({
    success: true,
    data: {
      authenticated: true,
      user,
    },
  });
}
