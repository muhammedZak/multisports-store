import { AppError } from '../../utils/AppError.js';

import { validateProfileUpdateInput } from './user.validation.js';

import {
  getAuthenticatedCustomerProfile,
  updateAuthenticatedCustomerProfile,
  replaceAuthenticatedCustomerProfilePhoto,
  removeAuthenticatedCustomerProfilePhoto,
} from './user.service.js';

export async function getMyProfile(req, res) {
  const user = await getAuthenticatedCustomerProfile(req.session.userId);

  res.status(200).json({
    success: true,
    data: {
      user,
    },
  });
}

export async function updateMyProfile(req, res) {
  const input = validateProfileUpdateInput(req.body);

  const user = await updateAuthenticatedCustomerProfile(
    req.session.userId,
    input,
  );

  res.status(200).json({
    success: true,
    data: {
      user,
    },
  });
}

export async function updateMyProfilePhoto(req, res) {
  if (!req.file?.buffer) {
    throw new AppError(422, 'INVALID_IMAGE', 'Select an image to upload.');
  }

  const user = await replaceAuthenticatedCustomerProfilePhoto(
    req.session.userId,
    req.file.buffer,
  );

  res.status(200).json({
    success: true,
    data: {
      user,
    },
  });
}

export async function deleteMyProfilePhoto(req, res) {
  await removeAuthenticatedCustomerProfilePhoto(req.session.userId);

  res.status(204).send();
}
