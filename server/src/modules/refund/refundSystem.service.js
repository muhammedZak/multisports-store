import mongoose from 'mongoose';

import { Order } from '../order/order.model.js';
import {
  Payment,
  PAYMENT_COMMERCE_RESOLUTIONS,
  PAYMENT_STATUSES,
} from '../payment/payment.model.js';

import {
  REFUND_ORIGINS,
  REFUND_SCOPES,
  REFUND_STATUSES,
  REFUND_SYSTEM_REASONS,
} from './refund.constants.js';
import { buildRefundScopeClaimKeys } from './refund.domain.js';
import { Refund } from './refund.model.js';

function isDuplicateKeyError(error) {
  return error?.code === 11000;
}

function throwRefundSystemIntegrityError(message) {
  throw new Error(`Refund system integrity error: ${message}`);
}

function assertSuccessfulProviderPayment(payment) {
  if (
    !payment?._id ||
    payment.status !== PAYMENT_STATUSES.SUCCEEDED ||
    typeof payment.provider !== 'string' ||
    !payment.provider ||
    typeof payment.providerPaymentId !== 'string' ||
    !payment.providerPaymentId
  ) {
    throwRefundSystemIntegrityError(
      'a successful provider Payment is required.',
    );
  }
}

export async function createOrderCancellationRefund({
  order,
  payment,
  session,
}) {
  if (!session) {
    throw new TypeError(
      'Order-cancellation Refund creation requires a MongoDB session.',
    );
  }

  if (!order?._id || !order.customerId || !order.paymentId) {
    throw new TypeError(
      'A persisted Order is required for cancellation Refund creation.',
    );
  }

  assertSuccessfulProviderPayment(payment);

  if (payment._id.toString() !== order.paymentId.toString()) {
    throwRefundSystemIntegrityError(
      'the cancellation Payment does not belong to the Order.',
    );
  }

  if (
    payment.customerId.toString() !== order.customerId.toString() ||
    payment.amount !== order.totalAmount ||
    payment.currency !== 'INR'
  ) {
    throwRefundSystemIntegrityError(
      'the cancellation Payment does not match the immutable Order.',
    );
  }

  const scopeClaimKeys = buildRefundScopeClaimKeys({
    order,
    scope: REFUND_SCOPES.ORDER,
    itemIds: [],
  });

  const [refund] = await Refund.create(
    [
      {
        customerId: order.customerId,
        orderId: order._id,
        paymentId: payment._id,
        provider: payment.provider,
        origin: REFUND_ORIGINS.ORDER_CANCELLATION,
        status: REFUND_STATUSES.APPROVED,
        scope: REFUND_SCOPES.ORDER,
        itemIds: [],
        amount: order.totalAmount,
        currency: payment.currency,
        restockOnCompletion: false,
        reason: REFUND_SYSTEM_REASONS.ORDER_CANCELLATION,
        scopeClaimKeys,
        scopeOccupied: true,
      },
    ],
    {
      session,
    },
  );

  return refund;
}

export async function findSystemCompensationRefund(paymentId) {
  if (!mongoose.isObjectIdOrHexString(paymentId)) {
    throw new TypeError('A valid Payment ID is required.');
  }

  return Refund.findOne({
    paymentId,
    origin: REFUND_ORIGINS.SYSTEM_COMPENSATION,
  })
    .select('_id status providerRefundId')
    .lean();
}

async function findExistingCompensation(paymentId, session = null) {
  let query = Refund.findOne({
    paymentId,
    origin: REFUND_ORIGINS.SYSTEM_COMPENSATION,
  }).select('_id status providerRefundId');

  if (session) {
    query = query.session(session);
  }

  return query.lean();
}

export async function ensureSystemCompensationRefund(paymentId) {
  if (!mongoose.isObjectIdOrHexString(paymentId)) {
    throw new TypeError(
      'A valid Payment ID is required for system compensation.',
    );
  }

  let resolution = null;

  try {
    await mongoose.connection.transaction(
      async (session) => {
        resolution = null;

        const payment = await Payment.findById(paymentId)
          .session(session)
          .lean();

        assertSuccessfulProviderPayment(payment);

        const existingOrder = await Order.findOne({
          paymentId: payment._id,
        })
          .select('_id')
          .session(session)
          .lean();

        if (existingOrder) {
          resolution = {
            orderId: existingOrder._id,
            refund: null,
          };
          return;
        }

        const existingCompensation = await findExistingCompensation(
          payment._id,
          session,
        );

        const claimedPayment = await Payment.findOneAndUpdate(
          {
            _id: payment._id,
            status: PAYMENT_STATUSES.SUCCEEDED,
            $or: [
              {
                commerceResolution: null,
              },
              {
                commerceResolution:
                  PAYMENT_COMMERCE_RESOLUTIONS.SYSTEM_COMPENSATION,
              },
            ],
          },
          {
            $set: {
              commerceResolution:
                PAYMENT_COMMERCE_RESOLUTIONS.SYSTEM_COMPENSATION,
            },
          },
          {
            session,
            returnDocument: 'after',
            runValidators: true,
          },
        )
          .select('_id')
          .lean();

        if (!claimedPayment) {
          const concurrentOrder = await Order.findOne({
            paymentId: payment._id,
          })
            .select('_id')
            .session(session)
            .lean();

          if (concurrentOrder) {
            resolution = {
              orderId: concurrentOrder._id,
              refund: null,
            };
            return;
          }

          throwRefundSystemIntegrityError(
            'the Payment is already resolved to an Order without a durable Order.',
          );
        }

        if (existingCompensation) {
          resolution = {
            orderId: null,
            refund: existingCompensation,
          };
          return;
        }

        const [refund] = await Refund.create(
          [
            {
              customerId: payment.customerId,
              paymentId: payment._id,
              provider: payment.provider,
              origin: REFUND_ORIGINS.SYSTEM_COMPENSATION,
              status: REFUND_STATUSES.APPROVED,
              amount: payment.amount,
              currency: payment.currency,
              restockOnCompletion: false,
              reason: REFUND_SYSTEM_REASONS.SYSTEM_COMPENSATION,
              scopeOccupied: false,
            },
          ],
          {
            session,
          },
        );

        resolution = {
          orderId: null,
          refund: refund.toObject({
            depopulate: true,
          }),
        };
      },
      {
        readPreference: 'primary',
      },
    );
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }

    const existingCompensation = await findExistingCompensation(paymentId);

    if (!existingCompensation) {
      throw error;
    }

    resolution = {
      orderId: null,
      refund: existingCompensation,
    };
  }

  if (!resolution) {
    throwRefundSystemIntegrityError(
      'system compensation did not produce a durable resolution.',
    );
  }

  return resolution;
}
