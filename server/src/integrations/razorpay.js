import Razorpay from 'razorpay';

import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const razorpay = new Razorpay({
  key_id: env.razorpayKeyId,
  key_secret: env.razorpayKeySecret,
});

function throwExternalServiceError() {
  throw new AppError(
    502,
    'EXTERNAL_SERVICE_ERROR',
    'The payment provider is temporarily unavailable. Please try again.',
  );
}

export async function createRazorpayOrder({ amount, receipt, notes = {} }) {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new TypeError('Razorpay order amount must be a positive integer.');
  }

  if (typeof receipt !== 'string' || !receipt.trim() || receipt.length > 40) {
    throw new TypeError(
      'Razorpay receipt must be a non-empty string up to 40 characters.',
    );
  }

  try {
    return await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt,
      notes,
      partial_payment: false,
    });
  } catch (error) {
    /*
     * Do not expose provider internals or credentials
     * through the public API.
     */
    console.error('Razorpay order creation failed:', {
      statusCode: error?.statusCode ?? null,
      code: error?.error?.code ?? null,
    });

    throwExternalServiceError();
  }
}

export function getRazorpayPublicKeyId() {
  return env.razorpayKeyId;
}
