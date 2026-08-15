import { AppError } from '../../utils/AppError.js';

import {
  uploadProfilePhotoAsset,
  deleteProfilePhotoAsset,
} from '../../integrations/cloudinary.js';

import { User } from './user.model.js';

function toSafeProfile(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
    phone: user.phone ?? null,

    profilePhoto: user.profilePhoto?.url
      ? {
          url: user.profilePhoto.url,
        }
      : null,
  };
}

function throwAuthenticationRequired() {
  throw new AppError(401, 'AUTH_REQUIRED', 'Authentication is required.');
}

async function cleanupProfilePhotoAsset(publicId, reason) {
  if (!publicId) {
    return;
  }

  try {
    await deleteProfilePhotoAsset(publicId);
  } catch (error) {
    console.error(`Profile photo cleanup failed (${reason}):`, error);
  }
}

export async function getAuthenticatedCustomerProfile(userId) {
  const user = await User.findById(userId).select(
    'name email role emailVerified phone profilePhoto',
  );

  if (!user) {
    throwAuthenticationRequired();
  }

  return toSafeProfile(user);
}

export async function updateAuthenticatedCustomerProfile(userId, changes) {
  const user = await User.findById(userId).select(
    'name email role emailVerified phone profilePhoto',
  );

  if (!user) {
    throwAuthenticationRequired();
  }

  if (Object.prototype.hasOwnProperty.call(changes, 'name')) {
    user.name = changes.name;
  }

  if (Object.prototype.hasOwnProperty.call(changes, 'phone')) {
    if (changes.phone === null) {
      user.phone = undefined;
    } else {
      user.phone = changes.phone;
    }
  }

  await user.save();

  return toSafeProfile(user);
}

export async function replaceAuthenticatedCustomerProfilePhoto(
  userId,
  imageBuffer,
) {
  const user = await User.findById(userId).select(
    'name email role emailVerified phone profilePhoto',
  );

  if (!user) {
    throwAuthenticationRequired();
  }

  const oldPublicId = user.profilePhoto?.publicId ?? null;

  const newPhoto = await uploadProfilePhotoAsset(imageBuffer);

  user.profilePhoto = {
    publicId: newPhoto.publicId,
    url: newPhoto.url,
  };

  try {
    await user.save();
  } catch (error) {
    await cleanupProfilePhotoAsset(
      newPhoto.publicId,
      'new asset after database save failure',
    );

    throw error;
  }

  if (oldPublicId) {
    await cleanupProfilePhotoAsset(
      oldPublicId,
      'old asset after successful replacement',
    );
  }

  return toSafeProfile(user);
}

export async function removeAuthenticatedCustomerProfilePhoto(userId) {
  const user = await User.findById(userId).select('profilePhoto');

  if (!user) {
    throwAuthenticationRequired();
  }

  const oldPublicId = user.profilePhoto?.publicId ?? null;

  if (!oldPublicId) {
    return;
  }

  user.profilePhoto = undefined;

  await user.save();

  await cleanupProfilePhotoAsset(
    oldPublicId,
    'old asset after profile photo removal',
  );
}
