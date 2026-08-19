import { AppError } from '../../utils/AppError.js';

import { verifyRazorpayWebhookSignature } from '../../integrations/razorpay.js';

import { Payment } from './payment.model.js';

import {
  RazorpayWebhookEvent,
  RAZORPAY_WEBHOOK_EVENT_STATUSES,
} from './razorpayWebhookEvent.model.js';

import { completeCapturedRazorpayPaymentCommerce } from './payment.service.js';

const SUPPORTED_CAPTURE_EVENTS = new Set(['payment.captured', 'order.paid']);

const TERMINAL_RECONCILIATION_ERRORS = new Set([
  'PAYMENT_AMOUNT_MISMATCH',
  'PAYMENT_VERIFICATION_FAILED',
  'PAYMENT_ALREADY_PROCESSED',
  'ORDER_FINALIZATION_FAILED',
]);

function throwWebhookSignatureInvalid() {
  throw new AppError(
    400,
    'WEBHOOK_SIGNATURE_INVALID',
    'Invalid Razorpay webhook signature.',
  );
}

function throwInvalidWebhookPayload(
  message = 'Invalid Razorpay webhook payload.',
) {
  throw new AppError(400, 'VALIDATION_ERROR', message);
}

function isDuplicateKeyError(error) {
  return error?.code === 11000;
}

function parseWebhookPayload(rawBody) {
  if (!Buffer.isBuffer(rawBody)) {
    throwInvalidWebhookPayload();
  }

  try {
    const payload = JSON.parse(rawBody.toString('utf8'));

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throwInvalidWebhookPayload();
    }

    if (typeof payload.event !== 'string' || !payload.event.trim()) {
      throwInvalidWebhookPayload('Razorpay webhook event type is missing.');
    }

    return payload;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throwInvalidWebhookPayload(
      'Razorpay webhook body must contain valid JSON.',
    );
  }
}

function getProviderCreatedAt(payload) {
  if (Number.isSafeInteger(payload.created_at) && payload.created_at >= 0) {
    return new Date(payload.created_at * 1000);
  }

  return undefined;
}

function getWebhookPaymentEntity(payload) {
  return payload?.payload?.payment?.entity ?? null;
}

function assertCapturedPaymentEntity(providerPayment) {
  if (
    !providerPayment ||
    typeof providerPayment !== 'object' ||
    providerPayment.entity !== 'payment' ||
    typeof providerPayment.id !== 'string' ||
    !providerPayment.id ||
    typeof providerPayment.order_id !== 'string' ||
    !providerPayment.order_id
  ) {
    throwInvalidWebhookPayload('Razorpay captured-payment data is missing.');
  }
}

async function claimWebhookEvent({
  eventId,
  eventType,
  providerPayment,
  providerCreatedAt,
}) {
  try {
    const event = await RazorpayWebhookEvent.create({
      eventId,

      eventType,

      providerPaymentId: providerPayment?.id,

      providerOrderId: providerPayment?.order_id,

      providerCreatedAt,

      status: RAZORPAY_WEBHOOK_EVENT_STATUSES.PROCESSING,
    });

    return {
      event,
      duplicate: false,
      shouldProcess: true,
    };
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }
  }

  const existingEvent = await RazorpayWebhookEvent.findOne({
    eventId,
  });

  if (!existingEvent) {
    /*
     * Extremely unusual race:
     * unique-index conflict existed but the
     * matching document cannot now be read.
     */
    throw new AppError(
      500,
      'INTERNAL_ERROR',
      'Webhook deduplication state could not be resolved.',
    );
  }

  /*
   * Fully handled duplicates stop here.
   */
  if (
    existingEvent.status === RAZORPAY_WEBHOOK_EVENT_STATUSES.PROCESSED ||
    existingEvent.status === RAZORPAY_WEBHOOK_EVENT_STATUSES.IGNORED
  ) {
    return {
      event: existingEvent,

      duplicate: true,

      shouldProcess: false,
    };
  }

  /*
   * FAILED events are intentionally retryable.
   *
   * PROCESSING duplicates may also safely
   * converge through the lower-level
   * Payment/Order/Cart idempotency guards.
   */
  await RazorpayWebhookEvent.updateOne(
    {
      _id: existingEvent._id,
    },

    {
      $set: {
        status: RAZORPAY_WEBHOOK_EVENT_STATUSES.PROCESSING,
      },

      $unset: {
        failureCode: '',
        failureMessage: '',
        processedAt: '',
      },
    },
  );

  return {
    event: existingEvent,

    duplicate: true,

    shouldProcess: true,
  };
}

async function markWebhookIgnored({ eventId, result, paymentId }) {
  await RazorpayWebhookEvent.updateOne(
    {
      eventId,
    },

    {
      $set: {
        status: RAZORPAY_WEBHOOK_EVENT_STATUSES.IGNORED,

        result,

        processedAt: new Date(),

        ...(paymentId
          ? {
              paymentId,
            }
          : {}),
      },

      $unset: {
        failureCode: '',
        failureMessage: '',
      },
    },
  );
}

async function markWebhookProcessed({
  eventId,
  result,
  paymentId,
  orderId,
  failureCode,
  failureMessage,
}) {
  await RazorpayWebhookEvent.updateOne(
    {
      eventId,
    },

    {
      $set: {
        status: RAZORPAY_WEBHOOK_EVENT_STATUSES.PROCESSED,

        result,

        processedAt: new Date(),

        ...(paymentId
          ? {
              paymentId,
            }
          : {}),

        ...(orderId
          ? {
              orderId,
            }
          : {}),

        ...(failureCode
          ? {
              failureCode,
            }
          : {}),

        ...(failureMessage
          ? {
              failureMessage,
            }
          : {}),
      },
    },
  );
}

async function markWebhookFailed({ eventId, error }) {
  await RazorpayWebhookEvent.updateOne(
    {
      eventId,
    },

    {
      $set: {
        status: RAZORPAY_WEBHOOK_EVENT_STATUSES.FAILED,

        failureCode: error?.code ?? 'INTERNAL_ERROR',

        failureMessage:
          error?.message ?? 'Unexpected webhook processing failure.',
      },
    },
  );
}

export async function processRazorpayWebhook({ rawBody, signature, eventId }) {
  /*
   * Authenticate BEFORE parsing.
   */
  const signatureIsValid = verifyRazorpayWebhookSignature({
    rawBody,
    signature,
  });

  if (!signatureIsValid) {
    throwWebhookSignatureInvalid();
  }

  if (typeof eventId !== 'string' || !eventId.trim()) {
    throwInvalidWebhookPayload('Razorpay webhook event ID is missing.');
  }

  const normalizedEventId = eventId.trim();

  const payload = parseWebhookPayload(rawBody);

  const eventType = payload.event.trim();

  const providerPayment = getWebhookPaymentEntity(payload);

  const providerCreatedAt = getProviderCreatedAt(payload);

  const claim = await claimWebhookEvent({
    eventId: normalizedEventId,

    eventType,

    providerPayment,

    providerCreatedAt,
  });

  /*
   * Same Razorpay event already completed.
   */
  if (!claim.shouldProcess) {
    return {
      result: 'duplicate_ignored',

      eventId: normalizedEventId,
    };
  }

  /*
   * We deliberately do not let older
   * payment.authorized/payment.failed events
   * regress successful commerce state.
   *
   * Only captured-payment authority can
   * advance this purchase.
   */
  if (!SUPPORTED_CAPTURE_EVENTS.has(eventType)) {
    await markWebhookIgnored({
      eventId: normalizedEventId,

      result: 'event_not_actionable',
    });

    return {
      result: 'event_ignored',

      eventType,
    };
  }

  assertCapturedPaymentEntity(providerPayment);

  /*
   * Local Payment is resolved by provider
   * Order identity.
   *
   * The webhook does not know or submit
   * Customer ownership.
   */
  const payment = await Payment.findOne({
    providerOrderId: providerPayment.order_id,
  });

  if (!payment) {
    /*
     * A Customer cannot normally pay before
     * Task 8.3 has persisted Payment.
     *
     * Unknown provider Orders therefore cannot
     * be safely turned into application Orders.
     */
    await markWebhookIgnored({
      eventId: normalizedEventId,

      result: 'payment_not_found',
    });

    return {
      result: 'payment_not_found',
    };
  }

  try {
    const {
      payment: reconciledPayment,

      order,
    } = await completeCapturedRazorpayPaymentCommerce({
      payment,

      providerPaymentId: providerPayment.id,

      /*
       * Already authenticated by the
       * webhook raw-body HMAC.
       *
       * No second Razorpay HTTP lookup.
       */
      providerPayment,
    });

    await markWebhookProcessed({
      eventId: normalizedEventId,

      result: 'order_placed',

      paymentId: reconciledPayment._id,

      orderId: order.id,
    });

    return {
      result: 'order_placed',

      orderId: order.id,
    };
  } catch (error) {
    /*
     * These errors represent a final,
     * safely-known reconciliation outcome.
     *
     * Repeated provider delivery must not
     * repeatedly try to deduct stock or
     * mutate commerce state forever.
     */
    if (
      error instanceof AppError &&
      TERMINAL_RECONCILIATION_ERRORS.has(error.code)
    ) {
      const result =
        error.code === 'ORDER_FINALIZATION_FAILED'
          ? 'payment_succeeded_order_pending'
          : 'reconciliation_rejected';

      await markWebhookProcessed({
        eventId: normalizedEventId,

        result,

        paymentId: payment._id,

        failureCode: error.code,

        failureMessage: error.message,
      });

      console.error(
        'Razorpay webhook reached a terminal reconciliation state:',
        {
          eventId: normalizedEventId,

          providerOrderId: providerPayment.order_id,

          providerPaymentId: providerPayment.id,

          paymentId: payment._id.toString(),

          code: error.code,
        },
      );

      /*
       * Payment provider truth remains intact.
       *
       * Automatic compensation/refund remains
       * outside this Task 8 slice.
       */
      return {
        result,
      };
    }

    /*
     * Unexpected database/system failures remain
     * retryable.
     *
     * Returning an error lets Razorpay retry
     * according to its webhook delivery policy.
     */
    await markWebhookFailed({
      eventId: normalizedEventId,

      error,
    });

    throw error;
  }
}
