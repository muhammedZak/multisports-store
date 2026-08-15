import { getOrCreateCsrfToken } from '../../middleware/csrf.middleware.js';
import { getSessionUser, resetCustomerPassword } from './auth.service.js';

import {
  validateEmailVerificationInput,
  validateRegistrationInput,
  validateVerificationResendInput,
  validateLoginInput,
  validateOtpRequestInput,
  validateOtpLoginVerificationInput,
  validateGoogleAuthenticationInput,
  validatePasswordRecoveryRequestInput,
  validatePasswordRecoveryVerificationInput,
  validatePasswordResetInput,
} from './auth.validation.js';

import {
  registerCustomer,
  resendEmailVerification,
  verifyCustomerEmail,
  authenticatePassword,
  requestLoginOtp,
  verifyLoginOtp,
  authenticateGoogle,
  requestPasswordReset,
  verifyPasswordResetOtp,
} from './auth.service.js';

import {
  consumePasswordResetAuthorization,
  createAnonymousSession,
  createAuthenticatedSession,
  createPasswordResetAuthorization,
  getPasswordResetAuthorization,
} from './auth.session.js';

export function getCsrfToken(req, res) {
  const csrfToken = getOrCreateCsrfToken(req);

  res.status(200).json({
    success: true,
    data: {
      csrfToken,
    },
  });
}

export async function getSession(req, res) {
  if (!req.session.userId) {
    return res.status(200).json({
      success: true,
      data: {
        authenticated: false,
        user: null,
      },
    });
  }

  const user = await getSessionUser(req.session.userId);

  if (!user) {
    delete req.session.userId;

    return res.status(200).json({
      success: true,
      data: {
        authenticated: false,
        user: null,
      },
    });
  }

  res.status(200).json({
    success: true,
    data: {
      authenticated: true,
      user,
    },
  });
}

export async function register(req, res) {
  const input = validateRegistrationInput(req.body);

  const result = await registerCustomer(input);

  res.status(201).json({
    success: true,
    data: result,
  });
}

export async function verifyEmail(req, res) {
  const input = validateEmailVerificationInput(req.body);

  const result = await verifyCustomerEmail(input);

  res.status(200).json({
    success: true,
    data: result,
  });
}

export async function resendVerificationEmail(req, res) {
  const input = validateVerificationResendInput(req.body);

  const result = await resendEmailVerification(input);

  res.status(200).json({
    success: true,
    data: result,
  });
}

export async function login(req, res) {
  const input = validateLoginInput(req.body);

  const user = await authenticatePassword(input);

  const csrfToken = await createAuthenticatedSession(req, user.id);

  res.status(200).json({
    success: true,
    data: {
      user,
      csrfToken,
    },
  });
}

export async function requestOtpLogin(req, res) {
  const input = validateOtpRequestInput(req.body);

  const result = await requestLoginOtp(input);

  res.status(200).json({
    success: true,
    data: result,
  });
}

export async function verifyOtpLogin(req, res) {
  const input = validateOtpLoginVerificationInput(req.body);

  const user = await verifyLoginOtp(input);

  const csrfToken = await createAuthenticatedSession(req, user.id);

  res.status(200).json({
    success: true,
    data: {
      user,
      csrfToken,
    },
  });
}

export async function googleAuth(req, res) {
  const input = validateGoogleAuthenticationInput(req.body);

  const user = await authenticateGoogle({
    credential: input.credential,
    currentUserId: req.session.userId || null,
  });

  const csrfToken = await createAuthenticatedSession(req, user.id);

  res.status(200).json({
    success: true,
    data: {
      user,
      csrfToken,
    },
  });
}

export async function logout(req, res) {
  const csrfToken = await createAnonymousSession(req);

  res.status(200).json({
    success: true,
    data: {
      authenticated: false,
      csrfToken,
    },
  });
}

export async function forgotPassword(req, res) {
  const input = validatePasswordRecoveryRequestInput(req.body);

  const result = await requestPasswordReset(input);

  res.status(200).json({
    success: true,
    data: result,
  });
}

export async function verifyForgotPasswordOtp(req, res) {
  const input = validatePasswordRecoveryVerificationInput(req.body);

  const result = await verifyPasswordResetOtp(input);

  await createPasswordResetAuthorization(req, result.userId);

  res.status(200).json({
    success: true,
    data: {
      resetAuthorized: true,
    },
  });
}

export async function resetPassword(req, res) {
  const input = validatePasswordResetInput(req.body);

  const authorization = await getPasswordResetAuthorization(req);

  const result = await resetCustomerPassword({
    userId: authorization.userId,
    newPassword: input.newPassword,
  });

  await consumePasswordResetAuthorization(req);

  res.status(200).json({
    success: true,
    data: result,
  });
}
