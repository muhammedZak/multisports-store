import mongoose from 'mongoose';

import {
  createRazorpayRefundIdempotently,
  fetchRazorpayRefund,
  fetchRazorpayRefundsForPayment,
} from '../../integrations/razorpay.js';
import { AppError } from '../../utils/AppError.js';

import { PAYMENT_STATUSES } from '../payment/payment.model.js';
import { notifyCustomerRefundCompleted } from '../notification/notificationEvent.service.js';
import {
  REFUND_PROVIDERS,
  REFUND_STATUSES,
} from './refund.constants.js';
import { reconcileRefundInventoryRestock } from './refundInventory.service.js';
import { Refund } from './refund.model.js';

const RAZORPAY_REFUND_STATUSES = new Set([
  'pending',
  'processed',
  'failed',
]);

const TERMINAL_REFUND_STATUSES = new Set([
  REFUND_STATUSES.REFUNDED,
  REFUND_STATUSES.FAILED,
]);

const defaultRazorpayRefundGateway = Object.freeze({
  createRefund: createRazorpayRefundIdempotently,
  fetchRefund: fetchRazorpayRefund,
  fetchRefundsForPayment: fetchRazorpayRefundsForPayment,
});

class RefundProviderIntegrityError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RefundProviderIntegrityError';
  }
}

function throwExternalServiceError() {
  throw new AppError(
    502,
    'EXTERNAL_SERVICE_ERROR',
    'The Refund was approved, but provider processing could not be confirmed. Please retry.',
  );
}

function assertLocalRefundId(refundId) {
  if (!mongoose.isObjectIdOrHexString(refundId)) {
    throw new TypeError('A valid application Refund ID is required.');
  }
}

function getApplicationRefundIdFromNotes(providerRefund) {
  const applicationRefundId = providerRefund?.notes?.applicationRefundId;

  if (
    typeof applicationRefundId !== 'string' ||
    !/^[a-f\d]{24}$/i.test(applicationRefundId)
  ) {
    return null;
  }

  return applicationRefundId.toLowerCase();
}

function assertProviderRefundEntity({ providerRefund, refund, payment }) {
  if (
    !providerRefund ||
    typeof providerRefund !== 'object' ||
    Array.isArray(providerRefund) ||
    providerRefund.entity !== 'refund' ||
    typeof providerRefund.id !== 'string' ||
    !providerRefund.id.trim() ||
    providerRefund.payment_id !== payment.providerPaymentId ||
    !Number.isSafeInteger(providerRefund.amount) ||
    providerRefund.amount !== refund.amount ||
    providerRefund.currency !== refund.currency ||
    !RAZORPAY_REFUND_STATUSES.has(providerRefund.status)
  ) {
    throw new RefundProviderIntegrityError(
      'Razorpay Refund identity or financial data did not match the application Refund.',
    );
  }

  if (
    refund.providerRefundId &&
    refund.providerRefundId !== providerRefund.id
  ) {
    throw new RefundProviderIntegrityError(
      'Razorpay Refund identity changed during reconciliation.',
    );
  }
}

function mapProviderRefundStatus(status) {
  if (status === 'pending') {
    return REFUND_STATUSES.PROCESSING;
  }

  if (status === 'processed') {
    return REFUND_STATUSES.REFUNDED;
  }

  return REFUND_STATUSES.FAILED;
}

async function persistProviderRefundState({ refund, providerRefund }) {
  assertProviderRefundEntity({
    providerRefund,
    refund,
    payment: refund.paymentId,
  });

  const targetStatus = mapProviderRefundStatus(providerRefund.status);

  if (TERMINAL_REFUND_STATUSES.has(refund.status)) {
    return refund;
  }

  if (
    refund.status === targetStatus &&
    refund.providerRefundId === providerRefund.id
  ) {
    return refund;
  }

  const update = {
    $set: {
      providerRefundId: providerRefund.id,
      status: targetStatus,
      scopeOccupied: Boolean(refund.orderId),
      ...(targetStatus === REFUND_STATUSES.REFUNDED && !refund.refundedAt
        ? { refundedAt: new Date() }
        : {}),
    },
  };

  const updatedRefund = await Refund.findOneAndUpdate(
    {
      _id: refund._id,
      status: {
        $in: [REFUND_STATUSES.APPROVED, REFUND_STATUSES.PROCESSING],
      },
      $or: [
        {
          providerRefundId: null,
        },
        {
          providerRefundId: providerRefund.id,
        },
      ],
    },
    update,
    {
      returnDocument: 'after',
      runValidators: true,
    },
  )
    .select('+scopeOccupied')
    .populate('paymentId')
    .lean();

  if (updatedRefund) {
    /*
     * Only the request/webhook that actually wins
     * the Refund status transition emits the event.
     *
     * Later webhook/provider replays receive the
     * already-authoritative Refund and do not notify again.
     */
    if (updatedRefund.status === REFUND_STATUSES.REFUNDED) {
      await notifyCustomerRefundCompleted({
        customerId: updatedRefund.customerId,

        refundId: updatedRefund._id,
      });
    }

    return updatedRefund;
  }

  const authoritativeRefund = await Refund.findById(refund._id)
    .select('+scopeOccupied')
    .populate('paymentId')
    .lean();

  if (!authoritativeRefund) {
    throw new RefundProviderIntegrityError(
      'The application Refund disappeared during reconciliation.',
    );
  }

  if (
    authoritativeRefund.providerRefundId &&
    authoritativeRefund.providerRefundId !== providerRefund.id
  ) {
    throw new RefundProviderIntegrityError(
      'A different Razorpay Refund is already attached to the application Refund.',
    );
  }

  return authoritativeRefund;
}

async function loadProviderBackedRefund(refundId) {
  const refund = await Refund.findById(refundId)
    .select('+scopeOccupied')
    .populate('paymentId')
    .lean();

  if (!refund) {
    throw new RefundProviderIntegrityError(
      'The application Refund could not be loaded for provider processing.',
    );
  }

  const payment = refund.paymentId;

  if (
    refund.provider !== REFUND_PROVIDERS.RAZORPAY ||
    !payment?._id ||
    payment.provider !== REFUND_PROVIDERS.RAZORPAY ||
    payment.status !== PAYMENT_STATUSES.SUCCEEDED ||
    payment.currency !== refund.currency ||
    typeof payment.providerPaymentId !== 'string' ||
    !payment.providerPaymentId.trim()
  ) {
    throw new RefundProviderIntegrityError(
      'The application Refund does not have a successful Razorpay Payment.',
    );
  }

  return refund;
}

function findMatchingProviderRefunds(providerRefunds, request) {
  const matches = providerRefunds.filter((providerRefund) => {
    const applicationRefundId =
      getApplicationRefundIdFromNotes(providerRefund);

    return (
      applicationRefundId === request.applicationRefundId ||
      providerRefund?.receipt === request.body.receipt
    );
  });
  const matchesById = new Map();

  for (const match of matches) {
    if (typeof match?.id === 'string' && match.id) {
      matchesById.set(match.id, match);
    }
  }

  if (matches.length > 0 && matchesById.size === 0) {
    throw new RefundProviderIntegrityError(
      'A matching Razorpay Refund did not contain a provider Refund ID.',
    );
  }

  if (matchesById.size > 1) {
    throw new RefundProviderIntegrityError(
      'More than one Razorpay Refund matched the application Refund identity.',
    );
  }

  return matchesById.values().next().value ?? null;
}

export function buildRazorpayRefundRequest({ refundId, amount }) {
  assertLocalRefundId(refundId);

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new TypeError('Refund amount must be a positive integer in paise.');
  }

  const applicationRefundId = refundId.toString().toLowerCase();
  const operationIdentity = `refund_${applicationRefundId}`;

  return {
    applicationRefundId,
    idempotencyKey: operationIdentity,
    body: {
      amount,
      speed: 'normal',
      receipt: operationIdentity,
      notes: {
        applicationRefundId,
      },
    },
  };
}

export async function processApprovedRazorpayRefund({
  refundId,
  gateway = defaultRazorpayRefundGateway,
  inventoryReconciler = reconcileRefundInventoryRestock,
}) {
  assertLocalRefundId(refundId);

  try {
    const refund = await loadProviderBackedRefund(refundId);

    if (refund.status === REFUND_STATUSES.REFUNDED) {
      await inventoryReconciler(refund._id);
      return refund;
    }

    if (refund.status !== REFUND_STATUSES.APPROVED) {
      return refund;
    }

    const payment = refund.paymentId;
    const request = buildRazorpayRefundRequest({
      refundId: refund._id,
      amount: refund.amount,
    });
    let providerRefund;

    if (refund.providerRefundId) {
      providerRefund = await gateway.fetchRefund(
        payment.providerPaymentId,
        refund.providerRefundId,
      );
    } else {
      const providerRefunds = await gateway.fetchRefundsForPayment(
        payment.providerPaymentId,
      );

      if (!Array.isArray(providerRefunds)) {
        throw new RefundProviderIntegrityError(
          'Razorpay Refund history was not returned as a collection.',
        );
      }

      providerRefund = findMatchingProviderRefunds(
        providerRefunds,
        request,
      );

      if (!providerRefund) {
        providerRefund = await gateway.createRefund({
          providerPaymentId: payment.providerPaymentId,
          body: request.body,
          idempotencyKey: request.idempotencyKey,
        });
      }
    }

    const reconciledRefund = await persistProviderRefundState({
      refund,
      providerRefund,
    });

    if (reconciledRefund.status === REFUND_STATUSES.REFUNDED) {
      await inventoryReconciler(reconciledRefund._id);
    }

    return reconciledRefund;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (error instanceof RefundProviderIntegrityError) {
      console.error('Razorpay Refund reconciliation was rejected:', {
        refundId: refundId.toString(),
        reason: error.message,
      });
      throwExternalServiceError();
    }

    throw error;
  }
}

export async function reconcileRazorpayRefundWebhook(
  providerRefund,
  {
    inventoryReconciler = reconcileRefundInventoryRestock,
  } = {},
) {
  if (
    !providerRefund ||
    typeof providerRefund !== 'object' ||
    Array.isArray(providerRefund) ||
    providerRefund.entity !== 'refund' ||
    typeof providerRefund.id !== 'string' ||
    !providerRefund.id.trim()
  ) {
    return {
      result: 'refund_payload_invalid',
    };
  }

  let refund = await Refund.findOne({
    providerRefundId: providerRefund.id,
  })
    .select('+scopeOccupied')
    .populate('paymentId')
    .lean();

  if (!refund) {
    const applicationRefundId =
      getApplicationRefundIdFromNotes(providerRefund);

    if (applicationRefundId) {
      refund = await Refund.findById(applicationRefundId)
        .select('+scopeOccupied')
        .populate('paymentId')
        .lean();
    }
  }

  if (
    !refund ||
    refund.provider !== REFUND_PROVIDERS.RAZORPAY ||
    !refund.paymentId?._id ||
    refund.paymentId.provider !== REFUND_PROVIDERS.RAZORPAY ||
    refund.paymentId.status !== PAYMENT_STATUSES.SUCCEEDED ||
    refund.paymentId.currency !== refund.currency ||
    ![
      REFUND_STATUSES.APPROVED,
      REFUND_STATUSES.PROCESSING,
      REFUND_STATUSES.REFUNDED,
      REFUND_STATUSES.FAILED,
    ].includes(refund.status)
  ) {
    return {
      result: 'refund_not_found',
    };
  }

  try {
    assertProviderRefundEntity({
      providerRefund,
      refund,
      payment: refund.paymentId,
    });

    const reconciledRefund = await persistProviderRefundState({
      refund,
      providerRefund,
    });

    if (reconciledRefund.status === REFUND_STATUSES.REFUNDED) {
      await inventoryReconciler(reconciledRefund._id);
    }

    return {
      result: `refund_${reconciledRefund.status}`,
      refund: reconciledRefund,
    };
  } catch (error) {
    if (error instanceof RefundProviderIntegrityError) {
      return {
        result: 'refund_mismatch',
      };
    }

    throw error;
  }
}
