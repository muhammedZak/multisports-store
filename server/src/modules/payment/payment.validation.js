import { AppError } from '../../utils/AppError.js';

const RAZORPAY_VERIFY_FIELDS = [
  'razorpayOrderId',
  'razorpayPaymentId',
  'razorpaySignature',
];

const SHA256_HEX_SIGNATURE_REGEX = /^[a-fA-F0-9]{64}$/;

function throwValidationError(fields) {
  throw new AppError(
    422,
    'VALIDATION_ERROR',
    'Please correct the invalid fields.',
    fields,
  );
}

function validateObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throwValidationError({
      request: 'A valid JSON object is required.',
    });
  }
}

function normalizeProviderId(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateRazorpayVerificationInput(body) {
  validateObject(body);

  const unexpectedFields = Object.keys(body).filter(
    (field) => !RAZORPAY_VERIFY_FIELDS.includes(field),
  );

  if (unexpectedFields.length > 0) {
    throwValidationError({
      request: 'Unsupported payment verification fields were provided.',
    });
  }

  const fields = {};

  const razorpayOrderId = normalizeProviderId(body.razorpayOrderId);
  const razorpayPaymentId = normalizeProviderId(body.razorpayPaymentId);

  const razorpaySignature =
    typeof body.razorpaySignature === 'string'
      ? body.razorpaySignature.trim()
      : '';

  if (!razorpayOrderId || razorpayOrderId.length > 100) {
    fields.razorpayOrderId = 'A valid Razorpay Order ID is required.';
  }

  if (!razorpayPaymentId || razorpayPaymentId.length > 100) {
    fields.razorpayPaymentId = 'A valid Razorpay Payment ID is required.';
  }

  if (!SHA256_HEX_SIGNATURE_REGEX.test(razorpaySignature)) {
    fields.razorpaySignature =
      'A valid Razorpay payment signature is required.';
  }

  if (Object.keys(fields).length > 0) {
    throwValidationError(fields);
  }

  return {
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature: razorpaySignature.toLowerCase(),
  };
}
