import { validateProfileUpdateInput } from './user.validation.js';

import {
  getAuthenticatedCustomerProfile,
  updateAuthenticatedCustomerProfile,
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
