import mongoose from 'mongoose';

import { AppError } from '../../utils/AppError.js';

import {
  createRazorpayOrder,
  getRazorpayPublicKeyId,
} from '../../integrations/razorpay.js';

import { resolveCheckoutForCustomer } from '../checkout/checkout.service.js';

import { Payment, PAYMENT_STATUSES } from './payment.model.js';

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
