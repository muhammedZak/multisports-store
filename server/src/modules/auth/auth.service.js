import { User } from '../users/user.model.js';

export async function getSessionUser(userId) {
  if (!userId) {
    return null;
  }

  const user = await User.findById(userId)
    .select('name email role emailVerified')
    .lean();

  if (!user) {
    return null;
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
  };
}
