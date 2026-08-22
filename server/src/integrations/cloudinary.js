import { v2 as cloudinary } from 'cloudinary';

import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

cloudinary.config({
  cloud_name: env.cloudinaryCloudName,
  api_key: env.cloudinaryApiKey,
  api_secret: env.cloudinaryApiSecret,
  secure: true,
});

const PROFILE_PHOTO_FOLDER = 'multisports-store/profile-photos';
export const PRODUCT_IMAGE_FOLDER = 'multisports-store/product-images';

function createCloudinaryError(message) {
  return new AppError(502, 'EXTERNAL_SERVICE_ERROR', message);
}

export function uploadProfilePhotoAsset(buffer) {
  return new Promise((resolve, reject) => {
    try {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: PROFILE_PHOTO_FOLDER,
          resource_type: 'image',
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary profile photo upload failed:', error);

            return reject(
              createCloudinaryError(
                'Unable to upload the profile photo. Please try again.',
              ),
            );
          }

          if (!result?.public_id || !result?.secure_url) {
            console.error(
              'Cloudinary profile photo upload returned an invalid result.',
            );

            return reject(
              createCloudinaryError(
                'Unable to upload the profile photo. Please try again.',
              ),
            );
          }

          resolve({
            publicId: result.public_id,
            url: result.secure_url,
          });
        },
      );

      uploadStream.end(buffer);
    } catch (error) {
      console.error('Cloudinary profile photo upload failed:', error);

      reject(
        createCloudinaryError(
          'Unable to upload the profile photo. Please try again.',
        ),
      );
    }
  });
}

export async function deleteProfilePhotoAsset(publicId) {
  if (!publicId) {
    return;
  }

  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      invalidate: true,
    });
  } catch (error) {
    console.error('Cloudinary profile photo deletion failed:', error);

    throw createCloudinaryError('Unable to clean up the profile photo asset.');
  }
}

export function uploadProductImageAsset(buffer) {
  return new Promise((resolve, reject) => {
    try {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: PRODUCT_IMAGE_FOLDER,
          resource_type: 'image',
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary product image upload failed:', error);

            return reject(
              createCloudinaryError(
                'Unable to upload the product image. Please try again.',
              ),
            );
          }

          if (!result?.public_id || !result?.secure_url) {
            console.error(
              'Cloudinary product image upload returned an invalid result.',
            );

            return reject(
              createCloudinaryError(
                'Unable to upload the product image. Please try again.',
              ),
            );
          }

          resolve({
            publicId: result.public_id,
            url: result.secure_url,
          });
        },
      );

      uploadStream.end(buffer);
    } catch (error) {
      console.error('Cloudinary product image upload failed:', error);

      reject(
        createCloudinaryError(
          'Unable to upload the product image. Please try again.',
        ),
      );
    }
  });
}

export async function deleteProductImageAsset(publicId) {
  if (!publicId) {
    return;
  }

  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      invalidate: true,
    });
  } catch (error) {
    console.error('Cloudinary product image deletion failed:', error);

    throw createCloudinaryError('Unable to clean up the product image asset.');
  }
}
