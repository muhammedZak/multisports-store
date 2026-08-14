import { Resend } from 'resend';

import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { authConfig } from '../modules/auth/auth.config.js';

const resend = new Resend(env.resendApiKey);

export async function sendVerificationOtpEmail({ to, otp }) {
  try {
    const { error } = await resend.emails.send({
      from: env.resendFromEmail,
      to,
      subject: 'Verify your MultiSports Store email',
      text:
        `Your MultiSports Store verification code is ${otp}. ` +
        `It expires in ${
          authConfig.emailVerification.otpTtlMs / (60 * 1000)
        } minutes.`,
    });

    if (error) {
      throw new AppError(
        502,
        'EXTERNAL_SERVICE_ERROR',
        'Verification email could not be sent. Please try again.',
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      502,
      'EXTERNAL_SERVICE_ERROR',
      'Verification email could not be sent. Please try again.',
    );
  }
}
