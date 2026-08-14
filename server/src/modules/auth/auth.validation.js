import { AppError } from '../../utils/AppError.js';
import { authConfig } from './auth.config.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LETTER_REGEX = /[A-Za-z]/;
const NUMBER_REGEX = /\d/;

function throwValidationError(fields) {
  throw new AppError(
    422,
    'VALIDATION_ERROR',
    'Please correct the invalid fields.',
    fields,
  );
}

function validateObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throwValidationError({
      request: 'A valid JSON object is required.',
    });
  }
}

function rejectUnexpectedFields(body, allowedFields) {
  const unexpectedFields = Object.keys(body).filter(
    (key) => !allowedFields.includes(key),
  );

  if (unexpectedFields.length > 0) {
    throwValidationError({
      request: 'Unsupported fields were provided.',
    });
  }
}

export function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function validateRegistrationInput(body) {
  validateObject(body);

  rejectUnexpectedFields(body, [
    'name',
    'email',
    'password',
    'confirmPassword',
  ]);

  const name = typeof body.name === 'string' ? body.name.trim() : '';

  const email = normalizeEmail(body.email);

  const password = typeof body.password === 'string' ? body.password : '';

  const confirmPassword =
    typeof body.confirmPassword === 'string' ? body.confirmPassword : '';

  const fields = {};

  if (!name) {
    fields.name = 'Name is required.';
  }

  if (!EMAIL_REGEX.test(email)) {
    fields.email = 'Enter a valid email address.';
  }

  if (
    password.length < authConfig.password.minLength ||
    password.length > authConfig.password.maxLength
  ) {
    fields.password =
      `Password must be between ${authConfig.password.minLength} and ` +
      `${authConfig.password.maxLength} characters.`;
  } else if (!LETTER_REGEX.test(password) || !NUMBER_REGEX.test(password)) {
    fields.password =
      'Password must contain at least one letter and one number.';
  }

  if (confirmPassword !== password) {
    fields.confirmPassword = 'Passwords do not match.';
  }

  if (Object.keys(fields).length > 0) {
    throwValidationError(fields);
  }

  return {
    name,
    email,
    password,
  };
}

export function validateEmailVerificationInput(body) {
  validateObject(body);

  rejectUnexpectedFields(body, ['email', 'otp']);

  const email = normalizeEmail(body.email);

  const otp = typeof body.otp === 'string' ? body.otp.trim() : '';

  const fields = {};

  if (!EMAIL_REGEX.test(email)) {
    fields.email = 'Enter a valid email address.';
  }

  const otpPattern = new RegExp(
    `^\\d{${authConfig.emailVerification.otpLength}}$`,
  );

  if (!otpPattern.test(otp)) {
    fields.otp =
      `Verification code must contain ` +
      `${authConfig.emailVerification.otpLength} digits.`;
  }

  if (Object.keys(fields).length > 0) {
    throwValidationError(fields);
  }

  return {
    email,
    otp,
  };
}

export function validateVerificationResendInput(body) {
  validateObject(body);

  rejectUnexpectedFields(body, ['email']);

  const email = normalizeEmail(body.email);

  if (!EMAIL_REGEX.test(email)) {
    throwValidationError({
      email: 'Enter a valid email address.',
    });
  }

  return {
    email,
  };
}

export function validateLoginInput(body) {
  validateObject(body);

  rejectUnexpectedFields(body, ['email', 'password']);

  const email = normalizeEmail(body.email);

  const password = typeof body.password === 'string' ? body.password : '';

  const fields = {};

  if (!EMAIL_REGEX.test(email)) {
    fields.email = 'Enter a valid email address.';
  }

  if (!password) {
    fields.password = 'Password is required.';
  } else if (password.length > authConfig.password.maxLength) {
    fields.password = 'Password is too long.';
  }

  if (Object.keys(fields).length > 0) {
    throwValidationError(fields);
  }

  return {
    email,
    password,
  };
}

export function validateOtpRequestInput(body) {
  validateObject(body);

  rejectUnexpectedFields(body, ['email']);

  const email = normalizeEmail(body.email);

  if (!EMAIL_REGEX.test(email)) {
    throwValidationError({
      email: 'Enter a valid email address.',
    });
  }

  return {
    email,
  };
}

export function validateOtpLoginVerificationInput(body) {
  validateObject(body);

  rejectUnexpectedFields(body, ['email', 'otp']);

  const email = normalizeEmail(body.email);

  const otp = typeof body.otp === 'string' ? body.otp.trim() : '';

  const fields = {};

  if (!EMAIL_REGEX.test(email)) {
    fields.email = 'Enter a valid email address.';
  }

  const otpPattern = new RegExp(
    `^\\d{${authConfig.emailVerification.otpLength}}$`,
  );

  if (!otpPattern.test(otp)) {
    fields.otp =
      `Login code must contain ` +
      `${authConfig.emailVerification.otpLength} digits.`;
  }

  if (Object.keys(fields).length > 0) {
    throwValidationError(fields);
  }

  return {
    email,
    otp,
  };
}

export function validateGoogleAuthenticationInput(body) {
  validateObject(body);

  rejectUnexpectedFields(body, ['credential']);

  const credential =
    typeof body.credential === 'string' ? body.credential.trim() : '';

  if (!credential) {
    throwValidationError({
      credential: 'Google credential is required.',
    });
  }

  return {
    credential,
  };
}
