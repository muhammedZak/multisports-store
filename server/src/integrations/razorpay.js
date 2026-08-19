import crypto from 'node:crypto';

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
    console.error('Razorpay order creation failed:', {
      statusCode: error?.statusCode ?? null,
      code: error?.error?.code ?? null,
    });

    throwExternalServiceError();
  }
}

export async function fetchRazorpayPayment(providerPaymentId) {
  if (typeof providerPaymentId !== 'string' || !providerPaymentId.trim()) {
    throw new TypeError('A valid Razorpay Payment ID is required.');
  }

  try {
    /*
     * Official Razorpay Node SDK:
     *
     * instance.payments.fetch(paymentId)
     */
    return await razorpay.payments.fetch(providerPaymentId);
  } catch (error) {
    console.error('Razorpay payment fetch failed:', {
      statusCode: error?.statusCode ?? null,
      code: error?.error?.code ?? null,
    });

    /*
     * The browser signature was already verified before this
     * function is called.
     *
     * Therefore an upstream lookup failure must not falsely
     * mutate our local Payment to failed.
     */
    throwExternalServiceError();
  }
}

export function verifyRazorpayPaymentSignature({
  providerOrderId,
  providerPaymentId,
  signature,
}) {
  if (
    typeof providerOrderId !== 'string' ||
    !providerOrderId ||
    typeof providerPaymentId !== 'string' ||
    !providerPaymentId ||
    typeof signature !== 'string' ||
    !/^[a-fA-F0-9]{64}$/.test(signature)
  ) {
    return false;
  }

  const message = `${providerOrderId}|${providerPaymentId}`;

  const expectedSignature = crypto
    .createHmac('sha256', env.razorpayKeySecret)
    .update(message)
    .digest();

  const receivedSignature = Buffer.from(signature, 'hex');

  if (receivedSignature.length !== expectedSignature.length) {
    return false;
  }

  /*
   * Timing-safe comparison avoids leaking partial
   * signature-match information.
   */
  return crypto.timingSafeEqual(expectedSignature, receivedSignature);
}

export function getRazorpayPublicKeyId() {
  return env.razorpayKeyId;
}
