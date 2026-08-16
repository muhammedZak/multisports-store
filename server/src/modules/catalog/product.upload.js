import multer from 'multer';

import { AppError } from '../../utils/AppError.js';

const PRODUCT_IMAGE_MAX_SIZE = 5 * 1024 * 1024;

const MAX_IMAGES_PER_CREATE_REQUEST = 5;

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: PRODUCT_IMAGE_MAX_SIZE,
    files: MAX_IMAGES_PER_CREATE_REQUEST,
  },

  fileFilter(req, file, callback) {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      return callback(
        new AppError(
          422,
          'INVALID_IMAGE',
          'Only JPEG, PNG, and WebP images are allowed.',
        ),
      );
    }

    callback(null, true);
  },
});

export function uploadInitialProductImages(req, res, next) {
  upload.array('images', MAX_IMAGES_PER_CREATE_REQUEST)(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return next(
          new AppError(
            413,
            'FILE_TOO_LARGE',
            'Each product image must be 5 MB or smaller.',
          ),
        );
      }

      if (
        error.code === 'LIMIT_FILE_COUNT' ||
        error.code === 'LIMIT_UNEXPECTED_FILE'
      ) {
        return next(
          new AppError(
            422,
            'INVALID_IMAGE',
            'Upload between 1 and 5 images using the images field.',
          ),
        );
      }

      return next(
        new AppError(422, 'INVALID_IMAGE', 'Invalid product image upload.'),
      );
    }

    next(error);
  });
}
