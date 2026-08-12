import { env } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';

  if (status >= 500) {
    console.error(err);
  }

  const message =
    status === 500 && env.nodeEnv === 'production'
      ? 'An unexpected server error occurred.'
      : err.message;

  res.status(status).json({
    success: false,
    error: {
      code,
      message,
    },
  });
}
