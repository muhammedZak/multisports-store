import multer from 'multer';

import { AppError } from '../../utils/AppError.js';

const PROFILE_PHOTO_MAX_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: PROFILE_PHOTO_MAX_SIZE,
    files: 1,
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

export function uploadSingleProfilePhoto(req, res, next) {
  upload.single('image')(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return next(
          new AppError(
            413,
            'FILE_TOO_LARGE',
            'Profile photo must be 5 MB or smaller.',
          ),
        );
      }

      return next(
        new AppError(
          422,
          'INVALID_IMAGE',
          'Provide exactly one image using the image field.',
        ),
      );
    }

    next(error);
  });
}
