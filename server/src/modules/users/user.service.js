import { AppError } from '../../utils/AppError.js';

import { User } from './user.model.js';

function toSafeProfile(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
    phone: user.phone ?? null,
  };
}

export async function getAuthenticatedCustomerProfile(userId) {
  const user = await User.findById(userId).select(
    'name email role emailVerified phone',
  );

  if (!user) {
    throw new AppError(401, 'AUTH_REQUIRED', 'Authentication is required.');
  }

  return toSafeProfile(user);
}

export async function updateAuthenticatedCustomerProfile(userId, changes) {
  const user = await User.findById(userId).select(
    'name email role emailVerified phone',
  );

  if (!user) {
    throw new AppError(401, 'AUTH_REQUIRED', 'Authentication is required.');
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
