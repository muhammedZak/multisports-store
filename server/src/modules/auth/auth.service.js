import * as argon2 from 'argon2';

import { AppError } from '../../utils/AppError.js';
import {
  sendVerificationOtpEmail,
  sendLoginOtpEmail,
} from '../../integrations/resend.js';

import { User } from '../users/user.model.js';
import { AuthChallenge } from './authChallenge.model.js';

import { authConfig } from './auth.config.js';

import {
  EMAIL_VERIFICATION_PURPOSE,
  OTP_LOGIN_PURPOSE,
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
  };
}

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
