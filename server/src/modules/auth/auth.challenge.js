import crypto from 'node:crypto';

import { env } from '../../config/env.js';
import { authConfig } from './auth.config.js';

export const EMAIL_VERIFICATION_PURPOSE = 'email_verification';
export const OTP_LOGIN_PURPOSE = 'otp_login';
export const PASSWORD_RESET_PURPOSE = 'password_reset';

export function generateVerificationOtp() {
  const maxValue = 10 ** authConfig.emailVerification.otpLength;

  return crypto
    .randomInt(0, maxValue)
    .toString()
    .padStart(authConfig.emailVerification.otpLength, '0');
}

function buildChallengeValue({ userId, email, purpose, otp }) {
  return [userId.toString(), email, purpose, otp].join(':');
}

export function hashAuthChallenge({ userId, email, purpose, otp }) {
  return crypto
    .createHmac('sha256', env.authChallengeSecret)
    .update(
      buildChallengeValue({
        userId,
        email,
        purpose,
        otp,
      }),
    )
    .digest('hex');
}

export function verifyAuthChallengeHash({
  userId,
  email,
  purpose,
  otp,
  challengeHash,
}) {
  const submittedHash = hashAuthChallenge({
    userId,
    email,
    purpose,
    otp,
  });

  const submittedBuffer = Buffer.from(submittedHash, 'hex');

  const storedBuffer = Buffer.from(challengeHash, 'hex');

  return (
    submittedBuffer.length === storedBuffer.length &&
    crypto.timingSafeEqual(submittedBuffer, storedBuffer)
  );
}
