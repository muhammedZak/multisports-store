import * as argon2 from 'argon2';

import { AppError } from '../../utils/AppError.js';

import {
  sendVerificationOtpEmail,
  sendLoginOtpEmail,
  sendPasswordResetOtpEmail,
  sendEmailChangeOtpEmail,
} from '../../integrations/resend.js';
import { verifyGoogleCredential } from '../../integrations/google.js';

import { User } from '../users/user.model.js';
import { AuthChallenge } from './authChallenge.model.js';

import { authConfig } from './auth.config.js';

import {
  EMAIL_VERIFICATION_PURPOSE,
  OTP_LOGIN_PURPOSE,
  PASSWORD_RESET_PURPOSE,
  EMAIL_CHANGE_PURPOSE,
  generateVerificationOtp,
  hashAuthChallenge,
  verifyAuthChallengeHash,
} from './auth.challenge.js';

function toSafeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
    phone: user.phone ?? null,
  };
}

export async function getSessionUser(userId) {
  if (!userId) {
    return null;
  }

  const user = await User.findById(userId)
    .select('name email role emailVerified phone')
    .lean();

  if (!user) {
    return null;
  }

  return toSafeUser(user);
}

async function issueEmailVerificationChallenge(user) {
  const otp = generateVerificationOtp();

  const now = new Date();

  const expiresAt = new Date(
    now.getTime() + authConfig.emailVerification.otpTtlMs,
  );

  const challengeHash = hashAuthChallenge({
    userId: user._id,
    email: user.email,
    purpose: EMAIL_VERIFICATION_PURPOSE,
    otp,
  });

  await AuthChallenge.findOneAndUpdate(
    {
      userId: user._id,
      purpose: EMAIL_VERIFICATION_PURPOSE,
    },
    {
      $set: {
        targetEmail: user.email,
        challengeHash,
        expiresAt,
        usedAt: null,
        attemptCount: 0,
        lastSentAt: now,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  try {
    await sendVerificationOtpEmail({
      to: user.email,
      otp,
    });
  } catch (error) {
    await AuthChallenge.updateOne(
      {
        userId: user._id,
        purpose: EMAIL_VERIFICATION_PURPOSE,
        challengeHash,
      },
      {
        $set: {
          lastSentAt: null,
        },
      },
    );

    throw error;
  }
}

export async function registerCustomer({ name, email, password }) {
  const existingUser = await User.exists({
    email,
  });

  if (existingUser) {
    throw new AppError(
      409,
      'DUPLICATE_EMAIL',
      'An account with this email already exists.',
    );
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
  });

  let user;

  try {
    user = await User.create({
      name,
      email,

      role: 'customer',
      passwordHash,

      emailVerified: false,
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw new AppError(
        409,
        'DUPLICATE_EMAIL',
        'An account with this email already exists.',
      );
    }

    throw error;
  }

  await issueEmailVerificationChallenge(user);

  return {
    user: toSafeUser(user),
    verificationRequired: true,
  };
}

export async function verifyCustomerEmail({ email, otp }) {
  const user = await User.findOne({
    email,
  });

  if (!user) {
    throw new AppError(422, 'OTP_INVALID', 'The verification code is invalid.');
  }

  if (user.emailVerified) {
    throw new AppError(
      409,
      'OTP_ALREADY_USED',
      'This verification code has already been used.',
    );
  }

  const challenge = await AuthChallenge.findOne({
    userId: user._id,
    targetEmail: email,
    purpose: EMAIL_VERIFICATION_PURPOSE,
  }).select('+challengeHash');

  if (!challenge) {
    throw new AppError(422, 'OTP_INVALID', 'The verification code is invalid.');
  }

  if (challenge.usedAt) {
    throw new AppError(
      409,
      'OTP_ALREADY_USED',
      'This verification code has already been used.',
    );
  }

  if (challenge.expiresAt <= new Date()) {
    throw new AppError(
      422,
      'OTP_EXPIRED',
      'The verification code has expired.',
    );
  }

  if (challenge.attemptCount >= authConfig.emailVerification.maxAttempts) {
    throw new AppError(
      429,
      'RATE_LIMITED',
      'Too many verification attempts. Request a new code.',
    );
  }

  const otpMatches = verifyAuthChallengeHash({
    userId: user._id,
    email,
    purpose: EMAIL_VERIFICATION_PURPOSE,
    otp,
    challengeHash: challenge.challengeHash,
  });

  if (!otpMatches) {
    await AuthChallenge.updateOne(
      {
        _id: challenge._id,
        usedAt: null,
      },
      {
        $inc: {
          attemptCount: 1,
        },
      },
    );

    throw new AppError(422, 'OTP_INVALID', 'The verification code is invalid.');
  }

  const consumedChallenge = await AuthChallenge.findOneAndUpdate(
    {
      _id: challenge._id,
      usedAt: null,
    },
    {
      $set: {
        usedAt: new Date(),
      },
    },
    {
      new: true,
    },
  );

  if (!consumedChallenge) {
    throw new AppError(
      409,
      'OTP_ALREADY_USED',
      'This verification code has already been used.',
    );
  }

  await User.updateOne(
    {
      _id: user._id,
    },
    {
      $set: {
        emailVerified: true,
      },
    },
  );

  return {
    emailVerified: true,
  };
}

export async function resendEmailVerification({ email }) {
  const genericResult = {
    message:
      'If an unverified account exists, a verification code has been sent.',
  };

  const user = await User.findOne({
    email,
  });

  if (!user || user.emailVerified) {
    return genericResult;
  }

  const existingChallenge = await AuthChallenge.findOne({
    userId: user._id,
    purpose: EMAIL_VERIFICATION_PURPOSE,
  }).select('lastSentAt');

  if (existingChallenge?.lastSentAt) {
    const elapsedMs = Date.now() - existingChallenge.lastSentAt.getTime();

    if (elapsedMs < authConfig.emailVerification.resendCooldownMs) {
      return genericResult;
    }
  }

  await issueEmailVerificationChallenge(user);

  return genericResult;
}

function invalidCredentialsError() {
  return new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
}

function accountLinkRequiredError() {
  return new AppError(
    409,
    'ACCOUNT_LINK_REQUIRED',
    'An account with this email already exists. Sign in first to link Google.',
  );
}

function googleIdentityConflictError() {
  return new AppError(
    409,
    'GOOGLE_IDENTITY_CONFLICT',
    'This Google identity cannot be used with this account.',
  );
}

function isSameUser(user, userId) {
  return user._id.toString() === userId?.toString();
}

export async function authenticatePassword({ email, password }) {
  const user = await User.findOne({
    email,
  }).select('+passwordHash');

  if (!user || !user.passwordHash) {
    throw invalidCredentialsError();
  }

  const passwordMatches = await argon2.verify(user.passwordHash, password);

  if (!passwordMatches) {
    throw invalidCredentialsError();
  }

  if (!user.emailVerified) {
    throw new AppError(
      403,
      'EMAIL_NOT_VERIFIED',
      'Please verify your email before logging in.',
    );
  }

  return toSafeUser(user);
}

export async function authenticateGoogle({ credential, currentUserId = null }) {
  const googleIdentity = await verifyGoogleCredential(credential);

  // 1. Google identity is already linked.
  const linkedUser = await User.findOne({
    googleSub: googleIdentity.sub,
  });

  if (linkedUser) {
    if (linkedUser.role !== 'customer') {
      throw googleIdentityConflictError();
    }

    /*
     * Guest:
     * normal returning Google login.
     *
     * Authenticated Customer:
     * only allow this identity if it belongs to the same
     * application User. Never switch an authenticated session
     * to another Customer while attempting account linking.
     */
    if (currentUserId && !isSameUser(linkedUser, currentUserId)) {
      throw googleIdentityConflictError();
    }

    return toSafeUser(linkedUser);
  }

  // 2. Google sub is not linked.
  // Check whether its verified email already belongs to our application.
  const existingEmailUser = await User.findOne({
    email: googleIdentity.email,
  }).select('+googleSub');

  if (existingEmailUser) {
    // Google must never become an Admin authentication/linking path.
    if (existingEmailUser.role !== 'customer') {
      throw googleIdentityConflictError();
    }

    /*
     * The email already owns another Google identity.
     * Since the incoming sub was not found above, this must
     * be a different Google account.
     */
    if (existingEmailUser.googleSub) {
      throw googleIdentityConflictError();
    }

    // Guest has not proved ownership of this existing account.
    if (!currentUserId) {
      throw accountLinkRequiredError();
    }

    /*
     * A trusted application session exists, but it must belong
     * to the exact User that owns the Google email.
     */
    if (!isSameUser(existingEmailUser, currentUserId)) {
      throw googleIdentityConflictError();
    }

    // 3. Safe same-email linking.
    try {
      const linkedCustomer = await User.findOneAndUpdate(
        {
          _id: existingEmailUser._id,
          role: 'customer',
          email: googleIdentity.email,
          $or: [
            {
              googleSub: {
                $exists: false,
              },
            },
            {
              googleSub: null,
            },
          ],
        },
        {
          $set: {
            googleSub: googleIdentity.sub,
          },
        },
        {
          new: true,
          runValidators: true,
        },
      );

      if (linkedCustomer) {
        return toSafeUser(linkedCustomer);
      }

      /*
       * Another request may have completed the same link
       * between our read and update.
       */
      const currentState = await User.findById(existingEmailUser._id).select(
        '+googleSub',
      );

      if (
        currentState &&
        currentState.role === 'customer' &&
        currentState.googleSub === googleIdentity.sub
      ) {
        return toSafeUser(currentState);
      }

      throw googleIdentityConflictError();
    } catch (error) {
      /*
       * The unique googleSub database index is the final
       * race-safe protection if another User obtained this
       * Google identity concurrently.
       */
      if (error?.code === 11000) {
        throw googleIdentityConflictError();
      }

      throw error;
    }
  }

  /*
   * If somebody is already authenticated, reaching here means
   * the Google email does NOT equal their current application email.
   *
   * /auth/google while authenticated exists only to finish safe
   * same-email linking, so do not create another Customer here.
   */
  if (currentUserId) {
    throw googleIdentityConflictError();
  }

  // 4. Guest + completely new Google identity:
  // preserve Step 3.2.2 new-Customer behavior.
  try {
    const user = await User.create({
      name: googleIdentity.name || 'Customer',
      email: googleIdentity.email,
      role: 'customer',
      googleSub: googleIdentity.sub,
      emailVerified: true,
    });

    return toSafeUser(user);
  } catch (error) {
    if (error?.code !== 11000) {
      throw error;
    }

    /*
     * Handle concurrent registration safely.
     */
    const userByGoogleSub = await User.findOne({
      googleSub: googleIdentity.sub,
    });

    if (userByGoogleSub) {
      if (userByGoogleSub.role !== 'customer') {
        throw googleIdentityConflictError();
      }

      return toSafeUser(userByGoogleSub);
    }

    const userByEmail = await User.findOne({
      email: googleIdentity.email,
    }).select('+googleSub');

    if (userByEmail) {
      if (userByEmail.role !== 'customer' || userByEmail.googleSub) {
        throw googleIdentityConflictError();
      }

      throw accountLinkRequiredError();
    }

    throw googleIdentityConflictError();
  }
}

export async function requestLoginOtp({ email }) {
  const genericResult = {
    message: 'If an eligible account exists, a login code will be sent.',
  };

  const user = await User.findOne({
    email,
  });

  if (!user) {
    return genericResult;
  }

  if (user.role !== 'customer') {
    return genericResult;
  }

  if (!user.emailVerified) {
    return genericResult;
  }

  const existingChallenge = await AuthChallenge.findOne({
    userId: user._id,
    purpose: OTP_LOGIN_PURPOSE,
  }).select('lastSentAt');

  if (existingChallenge?.lastSentAt) {
    const elapsedMs = Date.now() - existingChallenge.lastSentAt.getTime();

    if (elapsedMs < authConfig.emailVerification.resendCooldownMs) {
      return genericResult;
    }
  }

  const otp = generateVerificationOtp();

  const now = new Date();

  const expiresAt = new Date(
    now.getTime() + authConfig.emailVerification.otpTtlMs,
  );

  const challengeHash = hashAuthChallenge({
    userId: user._id,
    email: user.email,
    purpose: OTP_LOGIN_PURPOSE,
    otp,
  });

  await AuthChallenge.findOneAndUpdate(
    {
      userId: user._id,
      purpose: OTP_LOGIN_PURPOSE,
    },
    {
      $set: {
        targetEmail: user.email,
        challengeHash,
        expiresAt,
        usedAt: null,
        attemptCount: 0,
        lastSentAt: now,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  try {
    await sendLoginOtpEmail({
      to: user.email,
      otp,
    });
  } catch (error) {
    await AuthChallenge.updateOne(
      {
        userId: user._id,
        purpose: OTP_LOGIN_PURPOSE,
        challengeHash,
      },
      {
        $set: {
          lastSentAt: null,
        },
      },
    );

    throw error;
  }

  return genericResult;
}

export async function verifyLoginOtp({ email, otp }) {
  const user = await User.findOne({
    email,
  });

  if (!user || user.role !== 'customer' || !user.emailVerified) {
    throw new AppError(422, 'OTP_INVALID', 'The login code is invalid.');
  }

  const challenge = await AuthChallenge.findOne({
    userId: user._id,
    targetEmail: email,
    purpose: OTP_LOGIN_PURPOSE,
  }).select('+challengeHash');

  if (!challenge) {
    throw new AppError(422, 'OTP_INVALID', 'The login code is invalid.');
  }

  if (challenge.usedAt) {
    throw new AppError(
      409,
      'OTP_ALREADY_USED',
      'This login code has already been used.',
    );
  }

  if (challenge.expiresAt <= new Date()) {
    throw new AppError(422, 'OTP_EXPIRED', 'The login code has expired.');
  }

  if (challenge.attemptCount >= authConfig.emailVerification.maxAttempts) {
    throw new AppError(
      429,
      'RATE_LIMITED',
      'Too many verification attempts. Request a new login code.',
    );
  }

  const otpMatches = verifyAuthChallengeHash({
    userId: user._id,
    email,
    purpose: OTP_LOGIN_PURPOSE,
    otp,
    challengeHash: challenge.challengeHash,
  });

  if (!otpMatches) {
    await AuthChallenge.updateOne(
      {
        _id: challenge._id,
        usedAt: null,
      },
      {
        $inc: {
          attemptCount: 1,
        },
      },
    );

    throw new AppError(422, 'OTP_INVALID', 'The login code is invalid.');
  }

  const consumedChallenge = await AuthChallenge.findOneAndUpdate(
    {
      _id: challenge._id,
      usedAt: null,
    },
    {
      $set: {
        usedAt: new Date(),
      },
    },
    {
      new: true,
    },
  );

  if (!consumedChallenge) {
    throw new AppError(
      409,
      'OTP_ALREADY_USED',
      'This login code has already been used.',
    );
  }

  return toSafeUser(user);
}

export async function requestPasswordReset({ email }) {
  const genericResult = {
    message:
      'If an eligible account exists, a password reset code will be sent.',
  };

  const user = await User.findOne({
    email,
  }).select('+passwordHash');

  if (!user) {
    return genericResult;
  }

  if (user.role !== 'customer') {
    return genericResult;
  }

  if (!user.passwordHash) {
    return genericResult;
  }

  if (!user.emailVerified) {
    return genericResult;
  }

  const existingChallenge = await AuthChallenge.findOne({
    userId: user._id,
    purpose: PASSWORD_RESET_PURPOSE,
  }).select('lastSentAt');

  if (existingChallenge?.lastSentAt) {
    const elapsedMs = Date.now() - existingChallenge.lastSentAt.getTime();

    if (elapsedMs < authConfig.emailVerification.resendCooldownMs) {
      return genericResult;
    }
  }

  const otp = generateVerificationOtp();

  const now = new Date();

  const expiresAt = new Date(
    now.getTime() + authConfig.emailVerification.otpTtlMs,
  );

  const challengeHash = hashAuthChallenge({
    userId: user._id,
    email: user.email,
    purpose: PASSWORD_RESET_PURPOSE,
    otp,
  });

  await AuthChallenge.findOneAndUpdate(
    {
      userId: user._id,
      purpose: PASSWORD_RESET_PURPOSE,
    },
    {
      $set: {
        targetEmail: user.email,
        challengeHash,
        expiresAt,
        usedAt: null,
        attemptCount: 0,
        lastSentAt: now,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  try {
    await sendPasswordResetOtpEmail({
      to: user.email,
      otp,
    });
  } catch (error) {
    await AuthChallenge.updateOne(
      {
        userId: user._id,
        purpose: PASSWORD_RESET_PURPOSE,
        challengeHash,
      },
      {
        $set: {
          lastSentAt: null,
        },
      },
    );

    throw error;
  }

  return genericResult;
}

export async function verifyPasswordResetOtp({ email, otp }) {
  const user = await User.findOne({
    email,
  }).select('+passwordHash');

  if (
    !user ||
    user.role !== 'customer' ||
    !user.emailVerified ||
    !user.passwordHash
  ) {
    throw new AppError(422, 'OTP_INVALID', 'The recovery code is invalid.');
  }

  const challenge = await AuthChallenge.findOne({
    userId: user._id,
    targetEmail: email,
    purpose: PASSWORD_RESET_PURPOSE,
  }).select('+challengeHash');

  if (!challenge) {
    throw new AppError(422, 'OTP_INVALID', 'The recovery code is invalid.');
  }

  if (challenge.usedAt) {
    throw new AppError(
      409,
      'OTP_ALREADY_USED',
      'This recovery code has already been used.',
    );
  }

  if (challenge.expiresAt <= new Date()) {
    throw new AppError(422, 'OTP_EXPIRED', 'The recovery code has expired.');
  }

  if (challenge.attemptCount >= authConfig.emailVerification.maxAttempts) {
    throw new AppError(
      429,
      'RATE_LIMITED',
      'Too many verification attempts. Request a new recovery code.',
    );
  }

  const otpMatches = verifyAuthChallengeHash({
    userId: user._id,
    email,
    purpose: PASSWORD_RESET_PURPOSE,
    otp,
    challengeHash: challenge.challengeHash,
  });

  if (!otpMatches) {
    await AuthChallenge.updateOne(
      {
        _id: challenge._id,
        usedAt: null,
      },
      {
        $inc: {
          attemptCount: 1,
        },
      },
    );

    throw new AppError(422, 'OTP_INVALID', 'The recovery code is invalid.');
  }

  const consumedChallenge = await AuthChallenge.findOneAndUpdate(
    {
      _id: challenge._id,
      usedAt: null,
    },
    {
      $set: {
        usedAt: new Date(),
      },
    },
    {
      new: true,
    },
  );

  if (!consumedChallenge) {
    throw new AppError(
      409,
      'OTP_ALREADY_USED',
      'This recovery code has already been used.',
    );
  }

  return {
    userId: user._id.toString(),
  };
}

export async function resetCustomerPassword({ userId, newPassword }) {
  const user = await User.findOne({
    _id: userId,
    role: 'customer',
  }).select('+passwordHash');

  if (!user || !user.passwordHash) {
    throw new AppError(
      403,
      'RECOVERY_NOT_AUTHORIZED',
      'Password reset is not authorized.',
    );
  }

  const passwordHash = await argon2.hash(newPassword, {
    type: argon2.argon2id,
  });

  const result = await User.updateOne(
    {
      _id: user._id,
      role: 'customer',
    },
    {
      $set: {
        passwordHash,
      },
    },
  );

  if (result.matchedCount !== 1) {
    throw new AppError(
      403,
      'RECOVERY_NOT_AUTHORIZED',
      'Password reset is not authorized.',
    );
  }

  await AuthChallenge.deleteOne({
    userId: user._id,
    purpose: PASSWORD_RESET_PURPOSE,
  });

  return {
    passwordReset: true,
  };
}

export async function changeAuthenticatedPassword({
  userId,
  currentPassword,
  newPassword,
}) {
  const user = await User.findById(userId).select('+passwordHash');

  if (!user) {
    throw new AppError(401, 'AUTH_REQUIRED', 'Authentication is required.');
  }

  if (!user.passwordHash) {
    throw new AppError(
      409,
      'PASSWORD_NOT_SET',
      'This account does not have a password.',
    );
  }

  const currentPasswordMatches = await argon2.verify(
    user.passwordHash,
    currentPassword,
  );

  if (!currentPasswordMatches) {
    throw new AppError(
      401,
      'CURRENT_PASSWORD_INVALID',
      'Current password is incorrect.',
    );
  }

  if (currentPassword === newPassword) {
    throw new AppError(
      409,
      'PASSWORD_REUSE_NOT_ALLOWED',
      'New password must be different from your current password.',
    );
  }

  const passwordHash = await argon2.hash(newPassword, {
    type: argon2.argon2id,
  });

  await User.updateOne(
    {
      _id: user._id,
    },
    {
      $set: {
        passwordHash,
      },
    },
  );

  return {
    passwordChanged: true,
  };
}

export async function requestAuthenticationEmailChange({ userId, newEmail }) {
  const user = await User.findOne({
    _id: userId,
    role: 'customer',
  });

  if (!user) {
    throw new AppError(403, 'FORBIDDEN', 'Customer access is required.');
  }

  if (user.email === newEmail) {
    throw new AppError(
      409,
      'EMAIL_UNCHANGED',
      'New email must be different from your current email.',
    );
  }

  const emailOwner = await User.exists({
    email: newEmail,
    _id: {
      $ne: user._id,
    },
  });

  if (emailOwner) {
    throw new AppError(
      409,
      'EMAIL_ALREADY_IN_USE',
      'This email address is already in use.',
    );
  }

  const existingChallenge = await AuthChallenge.findOne({
    userId: user._id,
    purpose: EMAIL_CHANGE_PURPOSE,
  }).select('lastSentAt');

  if (existingChallenge?.lastSentAt) {
    const elapsedMs = Date.now() - existingChallenge.lastSentAt.getTime();

    if (elapsedMs < authConfig.emailVerification.resendCooldownMs) {
      throw new AppError(
        429,
        'RATE_LIMITED',
        'Please wait before requesting another email change code.',
      );
    }
  }

  const otp = generateVerificationOtp();

  const now = new Date();

  const expiresAt = new Date(
    now.getTime() + authConfig.emailVerification.otpTtlMs,
  );

  const challengeHash = hashAuthChallenge({
    userId: user._id,
    email: newEmail,
    purpose: EMAIL_CHANGE_PURPOSE,
    otp,
  });

  await AuthChallenge.findOneAndUpdate(
    {
      userId: user._id,
      purpose: EMAIL_CHANGE_PURPOSE,
    },
    {
      $set: {
        targetEmail: newEmail,
        challengeHash,
        expiresAt,
        usedAt: null,
        attemptCount: 0,
        lastSentAt: now,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  try {
    await sendEmailChangeOtpEmail({
      to: newEmail,
      otp,
    });
  } catch (error) {
    await AuthChallenge.updateOne(
      {
        userId: user._id,
        purpose: EMAIL_CHANGE_PURPOSE,
        challengeHash,
      },
      {
        $set: {
          lastSentAt: null,
        },
      },
    );

    throw error;
  }

  return {
    verificationRequired: true,
    newEmail,
  };
}

export async function verifyAuthenticationEmailChange({ userId, otp }) {
  const user = await User.findOne({
    _id: userId,
    role: 'customer',
  });

  if (!user) {
    throw new AppError(403, 'FORBIDDEN', 'Customer access is required.');
  }

  const challenge = await AuthChallenge.findOne({
    userId: user._id,
    purpose: EMAIL_CHANGE_PURPOSE,
  }).select('+challengeHash');

  if (!challenge) {
    throw new AppError(
      422,
      'OTP_INVALID',
      'The email verification code is invalid.',
    );
  }

  if (challenge.usedAt) {
    throw new AppError(
      409,
      'OTP_ALREADY_USED',
      'This email verification code has already been used.',
    );
  }

  if (challenge.expiresAt <= new Date()) {
    throw new AppError(
      422,
      'OTP_EXPIRED',
      'The email verification code has expired.',
    );
  }

  if (challenge.attemptCount >= authConfig.emailVerification.maxAttempts) {
    throw new AppError(
      429,
      'RATE_LIMITED',
      'Too many verification attempts. Request a new code.',
    );
  }

  const targetEmail = challenge.targetEmail;

  const otpMatches = verifyAuthChallengeHash({
    userId: user._id,
    email: targetEmail,
    purpose: EMAIL_CHANGE_PURPOSE,
    otp,
    challengeHash: challenge.challengeHash,
  });

  if (!otpMatches) {
    await AuthChallenge.updateOne(
      {
        _id: challenge._id,
        usedAt: null,
      },
      {
        $inc: {
          attemptCount: 1,
        },
      },
    );

    throw new AppError(
      422,
      'OTP_INVALID',
      'The email verification code is invalid.',
    );
  }

  /*
   * Recheck uniqueness immediately before changing User.email.
   *
   * Another Customer could theoretically claim this email
   * after the OTP was requested but before it was verified.
   */
  const existingEmailOwner = await User.exists({
    email: targetEmail,
    _id: {
      $ne: user._id,
    },
  });

  if (existingEmailOwner) {
    throw new AppError(
      409,
      'EMAIL_ALREADY_IN_USE',
      'This email address is already in use.',
    );
  }

  let updatedUser;

  try {
    updatedUser = await User.findOneAndUpdate(
      {
        _id: user._id,
        role: 'customer',
      },
      {
        $set: {
          email: targetEmail,
          emailVerified: true,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );
  } catch (error) {
    /*
     * The unique User.email database index is the final
     * race-safe protection.
     */
    if (error?.code === 11000) {
      throw new AppError(
        409,
        'EMAIL_ALREADY_IN_USE',
        'This email address is already in use.',
      );
    }

    throw error;
  }

  if (!updatedUser) {
    throw new AppError(403, 'FORBIDDEN', 'Customer access is required.');
  }

  const consumedChallenge = await AuthChallenge.findOneAndUpdate(
    {
      _id: challenge._id,
      usedAt: null,
    },
    {
      $set: {
        usedAt: new Date(),
      },
    },
    {
      new: true,
    },
  );

  if (!consumedChallenge) {
    throw new AppError(
      409,
      'OTP_ALREADY_USED',
      'This email verification code has already been used.',
    );
  }

  return {
    emailChanged: true,
    email: updatedUser.email,
  };
}
