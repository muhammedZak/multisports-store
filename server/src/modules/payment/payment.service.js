import mongoose from 'mongoose';

import { AppError } from '../../utils/AppError.js';

import {
  createRazorpayOrder,
  fetchRazorpayPayment,
  getRazorpayPublicKeyId,
  verifyRazorpayPaymentSignature,
} from '../../integrations/razorpay.js';
import { reconcileCustomerCartAfterPlacedOrder } from '../cart/cart.service.js';
import { resolveCheckoutForCustomer } from '../checkout/checkout.service.js';
import { finalizeOrderForSucceededPayment } from '../order/order.service.js';
import { processApprovedRazorpayRefund } from '../refund/refundProvider.service.js';
import {
  ensureSystemCompensationRefund,
  findSystemCompensationRefund,
} from '../refund/refundSystem.service.js';

import { Payment, PAYMENT_STATUSES } from './payment.model.js';
import { notifyCustomerPaymentSucceeded } from '../notification/notificationEvent.service.js';
function throwCheckoutNotReady(preview) {
  const firstIssue = preview?.issues?.[0];

  /*
   * Preserve useful Checkout domain errors:
   *
   * CART_EMPTY
   * CART_ITEM_UNAVAILABLE
   * OUT_OF_STOCK
   * COUPON_EXPIRED
   * ZERO_VALUE_CHECKOUT_UNSUPPORTED
   * etc.
   */
  if (firstIssue?.code && firstIssue?.message) {
    throw new AppError(409, firstIssue.code, firstIssue.message);
  }

  throw new AppError(
    409,
    'CHECKOUT_NOT_READY',
    'Checkout is not ready for payment.',
  );
}

function throwExternalServiceError() {
  throw new AppError(
    502,
    'EXTERNAL_SERVICE_ERROR',
    'The payment provider returned an invalid order response. Please try again.',
  );
}

function assertCreatedRazorpayOrder(order, expectedAmount) {
  const hasValidOrderId =
    typeof order?.id === 'string' && order.id.trim().length > 0;

  if (
    !hasValidOrderId ||
    order.amount !== expectedAmount ||
    order.currency !== 'INR' ||
    order.status !== 'created'
  ) {
    throwExternalServiceError();
  }
}

function toPaymentCreationResource(payment) {
  return {
    id: payment._id.toString(),
    status: payment.status,
  };
}

function throwPaymentNotFound() {
  throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Payment not found.');
}

function throwPaymentVerificationFailed(
  message = 'Payment verification failed.',
) {
  throw new AppError(409, 'PAYMENT_VERIFICATION_FAILED', message);
}

function throwPaymentAmountMismatch() {
  throw new AppError(
    409,
    'PAYMENT_AMOUNT_MISMATCH',
    'The Razorpay payment amount does not match the approved Checkout amount.',
  );
}

function throwPaymentAlreadyProcessed() {
  throw new AppError(
    409,
    'PAYMENT_ALREADY_PROCESSED',
    'This Payment has already been processed with another provider Payment.',
  );
}

function isDuplicateKeyError(error) {
  return error?.code === 11000;
}

function toPaymentVerificationResource(payment) {
  return {
    id: payment._id.toString(),

    status: payment.status,

    providerOrderId: payment.providerOrderId,

    providerPaymentId: payment.providerPaymentId,

    amount: payment.amount,

    currency: payment.currency,

    verifiedAt: payment.verifiedAt,
  };
}

function assertRazorpayPaymentMatches({
  payment,
  providerPayment,
  providerPaymentId,
}) {
  if (
    !providerPayment ||
    providerPayment.entity !== 'payment' ||
    providerPayment.id !== providerPaymentId
  ) {
    throwPaymentVerificationFailed(
      'Razorpay returned an unexpected Payment identity.',
    );
  }

  if (providerPayment.order_id !== payment.providerOrderId) {
    throwPaymentVerificationFailed(
      'The Razorpay Payment does not belong to this payment order.',
    );
  }

  if (providerPayment.amount !== payment.amount) {
    throwPaymentAmountMismatch();
  }

  if (providerPayment.currency !== payment.currency) {
    throwPaymentVerificationFailed(
      'The Razorpay Payment currency does not match the approved Checkout currency.',
    );
  }

  /*
   * Signature authenticity alone is not enough.
   *
   * Commerce succeeds only when Razorpay confirms
   * the payment is actually captured.
   */
  if (
    providerPayment.status !== 'captured' ||
    providerPayment.captured !== true
  ) {
    throwPaymentVerificationFailed(
      'The Razorpay Payment has not been captured.',
    );
  }

  /*
   * Razorpay exposes amount_captured separately.
   *
   * If present, require the full Checkout amount.
   */
  if (
    providerPayment.amount_captured !== undefined &&
    providerPayment.amount_captured !== null &&
    providerPayment.amount_captured !== payment.amount
  ) {
    throwPaymentAmountMismatch();
  }
}

export async function createRazorpayPaymentOrderForCustomer({
  customerId,
  shippingAddressId,
  shippingAddress,
}) {
  if (!mongoose.isValidObjectId(customerId)) {
    throw new TypeError('A valid Customer ID is required.');
  }

  /*
   * Task 8.2 remains the single Checkout authority.
   *
   * This revalidates:
   * Cart
   * Product
   * Variant
   * Inventory
   * Product pricing
   * Coupon
   * shipping address
   */
  const { preview, checkoutSnapshot } = await resolveCheckoutForCustomer({
    customerId,
    shippingAddressId,
    shippingAddress,
  });

  if (!preview.canProceed || !checkoutSnapshot) {
    throwCheckoutNotReady(preview);
  }

  /*
   * Browser never submits this amount.
   *
   * Payment amount comes only from the authoritative
   * checkout snapshot.
   */
  const amount = checkoutSnapshot.totalAmount;

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new AppError(
      409,
      'ZERO_VALUE_CHECKOUT_UNSUPPORTED',
      'Zero-value Checkout is not supported.',
    );
  }

  /*
   * Create the MongoDB Payment ID before calling Razorpay.
   *
   * This gives the external Order a stable application
   * trace identifier through receipt/notes.
   */
  const paymentId = new mongoose.Types.ObjectId();

  const receipt = `payment_${paymentId.toString()}`;

  const razorpayOrder = await createRazorpayOrder({
    amount,

    receipt,

    notes: {
      paymentId: paymentId.toString(),
    },
  });

  /*
   * Never blindly trust even the provider response.
   */
  assertCreatedRazorpayOrder(razorpayOrder, amount);

  let payment;

  try {
    /*
     * Persist provider-confirmed Order creation together
     * with the immutable Checkout intent.
     *
     * Payment schema already verifies:
     *
     * amount === checkoutSnapshot.totalAmount
     * providerOrderId uniqueness
     * integer paise
     * INR currency
     */
    payment = await Payment.create({
      _id: paymentId,

      customerId,

      provider: 'razorpay',

      providerOrderId: razorpayOrder.id,

      amount,

      currency: 'INR',

      status: PAYMENT_STATUSES.CREATED,

      checkoutSnapshot,
    });
  } catch (error) {
    /*
     * Razorpay exists outside MongoDB, so its Order cannot
     * participate in our database transaction.
     *
     * Most importantly: do NOT return that provider Order
     * to the browser when our local Payment failed to persist.
     */
    console.error('Payment persistence failed after Razorpay order creation:', {
      paymentId: paymentId.toString(),
      providerOrderId: razorpayOrder.id,
    });

    throw error;
  }

  return {
    payment: toPaymentCreationResource(payment),

    razorpay: {
      orderId: razorpayOrder.id,

      amount: payment.amount,

      currency: payment.currency,

      /*
       * Public Razorpay identifier only.
       *
       * key secret never leaves the server.
       */
      keyId: getRazorpayPublicKeyId(),
    },
  };
}

export async function reconcileCapturedRazorpayPayment({
  payment,
  providerPaymentId,
  providerPayment = null,
}) {
  if (!payment?._id) {
    throw new TypeError(
      'A persisted Payment is required for Razorpay reconciliation.',
    );
  }

  if (typeof providerPaymentId !== 'string' || !providerPaymentId) {
    throw new TypeError('A valid Razorpay Payment ID is required.');
  }

  /*
   * Idempotent success:
   *
   * The same Payment + providerPaymentId was already
   * reconciled successfully.
   */
  if (payment.status === PAYMENT_STATUSES.SUCCEEDED) {
    if (payment.providerPaymentId === providerPaymentId) {
      return payment;
    }

    throwPaymentAlreadyProcessed();
  }

  /*
   * Once providerPaymentId is attached, never allow another
   * provider Payment to silently replace it.
   */
  if (
    payment.providerPaymentId &&
    payment.providerPaymentId !== providerPaymentId
  ) {
    throwPaymentAlreadyProcessed();
  }

  /*
   * Browser verification:
   * fetch current provider authority.
   *
   * Webhook:
   * the provider Payment came from an already
   * authenticated raw Razorpay event.
   */
  const authoritativeProviderPayment =
    providerPayment ?? (await fetchRazorpayPayment(providerPaymentId));

  assertRazorpayPaymentMatches({
    payment,

    providerPayment: authoritativeProviderPayment,

    providerPaymentId,
  });

  const verifiedAt = new Date();

  let reconciledPayment;

  try {
    /*
     * Atomic compare-and-set.
     *
     * Two browser retries, or later browser/webhook races,
     * must not attach different provider payments.
     */
    reconciledPayment = await Payment.findOneAndUpdate(
      {
        _id: payment._id,

        providerOrderId: payment.providerOrderId,

        status: {
          $ne: PAYMENT_STATUSES.SUCCEEDED,
        },

        $or: [
          {
            providerPaymentId: null,
          },
          {
            providerPaymentId,
          },
        ],
      },

      {
        $set: {
          providerPaymentId,

          status: PAYMENT_STATUSES.SUCCEEDED,

          verifiedAt,
        },

        $unset: {
          failureCode: '',
          failureMessage: '',
        },
      },

      {
        returnDocument: 'after',
        runValidators: true,
      },
    );
  } catch (error) {
    /*
     * providerPaymentId has a unique partial index from Task 8.1.
     *
     * Another Payment already owning this provider Payment
     * must never be silently accepted.
     */
    if (isDuplicateKeyError(error)) {
      throwPaymentAlreadyProcessed();
    }

    throw error;
  }

  if (reconciledPayment) {
    /*
     * This branch means THIS request won the atomic
     * transition into PAYMENT_STATUSES.SUCCEEDED.
     *
     * Replay/concurrent requests that merely observe an
     * already-succeeded Payment do not enter this branch.
     */
    await notifyCustomerPaymentSucceeded({
      customerId: reconciledPayment.customerId,

      paymentId: reconciledPayment._id,
    });

    return reconciledPayment;
  }

  /*
   * Another concurrent request may have completed the exact
   * same reconciliation between our read and atomic update.
   */
  const currentPayment = await Payment.findById(payment._id);

  if (
    currentPayment?.status === PAYMENT_STATUSES.SUCCEEDED &&
    currentPayment.providerPaymentId === providerPaymentId
  ) {
    return currentPayment;
  }

  throwPaymentAlreadyProcessed();
}

export async function completeCapturedRazorpayPaymentCommerce({
  payment,
  providerPaymentId,
  providerPayment = null,
}, {
  finalizeOrder = finalizeOrderForSucceededPayment,
  findCompensation = findSystemCompensationRefund,
  ensureCompensation = ensureSystemCompensationRefund,
  processProviderRefund = processApprovedRazorpayRefund,
} = {}) {
  /*
   * Shared authority path:
   *
   * browser /verify
   *        OR
   * authenticated Razorpay webhook
   *             ↓
   * Payment reconciliation
   *             ↓
   * Order finalization
   *             ↓
   * post-commit Cart reconciliation
   */

  const reconciledPayment = await reconcileCapturedRazorpayPayment({
    payment,

    providerPaymentId,

    providerPayment,
  });

  let compensationRefund = await findCompensation(reconciledPayment._id);
  let order = null;

  if (!compensationRefund) {
    try {
      /*
       * Task 8.5:
       *
       * Idempotent transactional commerce effects.
       */
      order = await finalizeOrder({
        paymentId: reconciledPayment._id,
      });
    } catch (error) {
      if (!(error instanceof AppError) || error.code !== 'ORDER_FINALIZATION_FAILED') {
        throw error;
      }

      const compensationResolution = await ensureCompensation(
        reconciledPayment._id,
      );

      if (compensationResolution.orderId) {
        order = await finalizeOrder({
          paymentId: reconciledPayment._id,
        });
      } else {
        compensationRefund = compensationResolution.refund;
      }
    }
  }

  if (compensationRefund) {
    const reconciledCompensation = await processProviderRefund({
      refundId: compensationRefund._id,
    });

    return {
      payment: reconciledPayment,
      order: null,
      compensationRefund: reconciledCompensation,
    };
  }

  /*
   * Task 8.6:
   *
   * Post-commit Cart reconciliation remains
   * non-fatal to the valid Order.
   */
  try {
    await reconcileCustomerCartAfterPlacedOrder({
      orderId: order.id,
    });
  } catch (error) {
    console.error('Post-commit Cart reconciliation failed:', {
      orderId: order.id,

      paymentId: reconciledPayment._id.toString(),

      message: error?.message ?? null,
    });
  }

  return {
    payment: reconciledPayment,

    order,

    compensationRefund: null,
  };
}

export async function verifyRazorpayPaymentForCustomer({
  customerId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}) {
  if (!mongoose.isValidObjectId(customerId)) {
    throw new TypeError('A valid Customer ID is required.');
  }

  /*
   * Ownership-safe Payment resolution.
   */
  const payment = await Payment.findOne({
    customerId,
    providerOrderId: razorpayOrderId,
  });

  if (!payment) {
    throwPaymentNotFound();
  }

  /*
   * Continue using the provider Order ID
   * stored in our database as HMAC authority.
   */
  const signatureIsValid = verifyRazorpayPaymentSignature({
    providerOrderId: payment.providerOrderId,

    providerPaymentId: razorpayPaymentId,

    signature: razorpaySignature,
  });

  if (!signatureIsValid) {
    /*
     * Invalid browser callback remains
     * completely non-mutating.
     */
    throwPaymentVerificationFailed(
      'The Razorpay payment signature is invalid.',
    );
  }

  const {
    payment: reconciledPayment,
    order,
    compensationRefund,
  } =
    await completeCapturedRazorpayPaymentCommerce({
      payment,

      providerPaymentId: razorpayPaymentId,
    });

  if (compensationRefund) {
    return {
      result: 'payment_succeeded_compensation',

      payment: toPaymentVerificationResource(reconciledPayment),

      order: null,

      refund: {
        id: compensationRefund._id.toString(),
        status: compensationRefund.status,
      },
    };
  }

  return {
    result: 'order_placed',

    payment: toPaymentVerificationResource(reconciledPayment),

    order,
  };
}
