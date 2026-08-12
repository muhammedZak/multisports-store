import { AppError } from '../utils/AppError.js';

export function notFoundHandler(req, res, next) {
  next(
    new AppError(
      404,
      'NOT_FOUND',
      `Route not found: ${req.method} ${req.originalUrl}`,
    ),
  );
}
