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

function assertProviderId(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`A valid Razorpay ${label} is required.`);
  }
}

function logRazorpayFailure(operation, error) {
  console.error(`Razorpay ${operation} failed:`, {
    statusCode: error?.statusCode ?? error?.status ?? null,
    code: error?.error?.code ?? error?.code ?? null,
  });
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
  assertProviderId(providerPaymentId, 'Payment ID');

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

export function verifyRazorpayWebhookSignature({ rawBody, signature }) {
  if (
    !Buffer.isBuffer(rawBody) ||
    typeof signature !== 'string' ||
    !/^[a-fA-F0-9]{64}$/.test(signature)
  ) {
    return false;
  }

  /*
   * Razorpay webhook HMAC:
   *
   * key     = webhook secret
   * message = exact raw HTTP request body
   *
   * Never JSON.parse() / JSON.stringify()
   * before this verification.
   */
  const expectedSignature = crypto
    .createHmac('sha256', env.razorpayWebhookSecret)
    .update(rawBody)
    .digest();

  const receivedSignature = Buffer.from(signature, 'hex');

  if (receivedSignature.length !== expectedSignature.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedSignature, receivedSignature);
}

export async function fetchRazorpayRefund(
  providerPaymentId,
  providerRefundId,
) {
  assertProviderId(providerPaymentId, 'Payment ID');
  assertProviderId(providerRefundId, 'Refund ID');

  try {
    return await razorpay.payments.fetchRefund(
      providerPaymentId,
      providerRefundId,
    );
  } catch (error) {
    logRazorpayFailure('Refund fetch', error);
    throwExternalServiceError();
  }
}

export async function fetchRazorpayRefundsForPayment(providerPaymentId) {
  assertProviderId(providerPaymentId, 'Payment ID');

  const pageSize = 100;
  const refunds = [];

  try {
    for (let skip = 0; ; skip += pageSize) {
      const page = await razorpay.payments.fetchMultipleRefund(
        providerPaymentId,
        {
          count: pageSize,
          skip,
        },
      );

      if (!page || !Array.isArray(page.items)) {
        throw new Error('Razorpay returned an invalid Refund collection.');
      }

      const items = page.items;

      refunds.push(...items);

      if (items.length < pageSize) {
        return refunds;
      }
    }
  } catch (error) {
    logRazorpayFailure('Refund-list fetch', error);
    throwExternalServiceError();
  }
}

export async function createRazorpayRefundIdempotently({
  providerPaymentId,
  body,
  idempotencyKey,
}) {
  assertProviderId(providerPaymentId, 'Payment ID');

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new TypeError('A valid Razorpay Refund body is required.');
  }

  if (typeof idempotencyKey !== 'string' || !idempotencyKey.trim()) {
    throw new TypeError('A valid Razorpay Refund idempotency key is required.');
  }

  try {
    const response = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(providerPaymentId)}/refund`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${env.razorpayKeyId}:${env.razorpayKeySecret}`,
          ).toString('base64')}`,
          'Content-Type': 'application/json',
          'X-Refund-Idempotency': idempotencyKey,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (!response.ok) {
      let providerError;

      try {
        providerError = await response.json();
      } catch {
        providerError = undefined;
      }

      logRazorpayFailure('Refund creation', {
        status: response.status,
        error: providerError?.error,
      });
      throwExternalServiceError();
    }

    return await response.json();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    logRazorpayFailure('Refund creation', error);
    throwExternalServiceError();
  }
}
