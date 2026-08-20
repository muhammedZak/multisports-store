import mongoose from 'mongoose';

import { AppError } from '../../utils/AppError.js';

import { Order, ORDER_STATUSES } from '../order/order.model.js';
import { Payment, PAYMENT_STATUSES } from '../payment/payment.model.js';

import {
  REFUND_ADMIN_DECISIONS,
  REFUND_ORIGINS,
  REFUND_SCOPES,
  REFUND_STATUSES,
} from './refund.constants.js';

import {
  buildOccupiedRefundScopeFilter,
  buildRefundScopeClaimKeys,
  calculateOrderRefundAmount,
  normalizeOrderRefundScope,
  REFUND_DOMAIN_ERROR_CODES,
  RefundDomainError,
} from './refund.domain.js';

import { Refund } from './refund.model.js';
import { processApprovedRazorpayRefund } from './refundProvider.service.js';

function throwOrderNotFound() {
  throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
}

function throwRefundNotFound() {
  throw new AppError(404, 'REFUND_NOT_FOUND', 'Refund not found.');
}

function throwRefundAlreadyProcessed() {
  throw new AppError(
    409,
    'REFUND_ALREADY_PROCESSED',
    'This Refund is no longer awaiting an Admin decision.',
  );
}

function throwRefundNotEligible(
  message = 'This Order is not eligible for a Refund request.',
) {
  throw new AppError(409, 'REFUND_NOT_ELIGIBLE', message);
}

function throwRefundScopeConflict() {
  throw new AppError(
    409,
    'REFUND_SCOPE_CONFLICT',
    'An existing Refund already occupies some or all of this Order scope.',
  );
}

function throwRefundScopeInvalid() {
  throw new AppError(
    422,
    'REFUND_SCOPE_INVALID',
    'Refund scope is invalid.',
    {
      scope: 'Refund scope must be order or items with a valid combination.',
    },
  );
}

function throwRefundItemNotFound() {
  throw new AppError(
    422,
    'REFUND_ITEM_NOT_FOUND',
    'A requested item is not part of this Order.',
    {
      orderItemIds: 'A requested Order item could not be found.',
    },
  );
}

function isScopeClaimDuplicateKeyError(error) {
  return (
    error?.code === 11000 &&
    (error?.keyPattern?.scopeClaimKeys ||
      error?.message?.includes('refund_scope_claim_unique'))
  );
}

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toCustomerOrderItemResource(item) {
  return {
    id: item._id.toString(),

    product: {
      id: item.productId.toString(),
      name: item.productName,
      brand: item.brand,
      sport: item.sport,
      category: {
        id: item.categoryId.toString(),
        name: item.categoryName,
      },
    },

    variant: item.variantId
      ? {
          id: item.variantId.toString(),
          options: item.variantOptions ?? {},
        }
      : null,

    quantity: item.quantity,

    pricing: {
      basePrice: item.unitPrice,
      itemDiscount: item.itemDiscount,
      unitPrice: item.unitPrice - item.itemDiscount,
      lineTotal: item.lineTotal,
    },
  };
}

function toCustomerRefundOrderResource(order) {
  if (!order?._id) {
    return null;
  }

  return {
    id: order._id.toString(),
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    placedAt: order.placedAt,
    pricing: {
      subtotal: order.subtotal,
      discountAmount: order.discountAmount,
      totalAmount: order.totalAmount,
    },
  };
}

function toCustomerRefundPaymentResource(payment) {
  if (!payment?._id) {
    return null;
  }

  return {
    id: payment._id.toString(),
    status: payment.status,
    amount: payment.amount,
    currency: payment.currency,
    verifiedAt: payment.verifiedAt ?? null,
  };
}

function toPublicOrderItemIds(refund) {
  return Array.isArray(refund.itemIds)
    ? refund.itemIds.map((itemId) => itemId.toString())
    : [];
}

function toCustomerRefundHistoryResource(refund) {
  return {
    id: refund._id.toString(),
    origin: refund.origin,
    status: refund.status,
    scope: refund.scope ?? null,
    orderItemIds: toPublicOrderItemIds(refund),
    reason: refund.reason,
    explanation: refund.explanation ?? null,
    amount: refund.amount,
    currency: refund.currency,
    restockOnCompletion: refund.restockOnCompletion ?? null,
    requestedAt: refund.requestedAt,
    updatedAt: refund.updatedAt,
    order: toCustomerRefundOrderResource(refund.orderId),
  };
}

function getAffectedOrderItems(refund) {
  const order = refund.orderId;

  if (!order?._id || !Array.isArray(order.items)) {
    return [];
  }

  if (refund.scope === REFUND_SCOPES.ORDER) {
    return order.items.map(toCustomerOrderItemResource);
  }

  const selectedItemIds = new Set(toPublicOrderItemIds(refund));

  return order.items
    .filter((item) => selectedItemIds.has(item._id.toString()))
    .map(toCustomerOrderItemResource);
}

function toCustomerRefundDetailResource(refund) {
  return {
    ...toCustomerRefundHistoryResource(refund),
    createdAt: refund.createdAt,
    adminDecisionNote: refund.adminDecisionNote ?? null,
    reviewedAt: refund.reviewedAt ?? null,
    refundedAt: refund.refundedAt ?? null,
    affectedItems: getAffectedOrderItems(refund),
    payment: toCustomerRefundPaymentResource(refund.paymentId),
  };
}

function toAdminRefundCustomerResource(customer) {
  if (!customer?._id) {
    return null;
  }

  return {
    id: customer._id.toString(),
    name: customer.name,
    email: customer.email,
  };
}

function toAdminRefundReviewerResource(admin) {
  if (!admin?._id) {
    return null;
  }

  return {
    id: admin._id.toString(),
    name: admin.name,
    email: admin.email,
  };
}

function toAdminRefundPaymentResource(payment) {
  if (!payment?._id) {
    return null;
  }

  return {
    id: payment._id.toString(),
    provider: payment.provider,
    status: payment.status,
    amount: payment.amount,
    currency: payment.currency,
    providerPaymentId: payment.providerPaymentId ?? null,
    verifiedAt: payment.verifiedAt ?? null,
  };
}

function toAdminRefundListResource(refund) {
  return {
    id: refund._id.toString(),
    origin: refund.origin,
    status: refund.status,
    scope: refund.scope ?? null,
    orderItemIds: toPublicOrderItemIds(refund),
    reason: refund.reason,
    amount: refund.amount,
    currency: refund.currency,
    restockOnCompletion: refund.restockOnCompletion ?? null,
    requestedAt: refund.requestedAt,
    updatedAt: refund.updatedAt,
    customer: toAdminRefundCustomerResource(refund.customerId),
    order: toCustomerRefundOrderResource(refund.orderId),
  };
}

function toAdminRefundDetailResource(refund) {
  return {
    ...toAdminRefundListResource(refund),
    explanation: refund.explanation ?? null,
    providerRefundId: refund.providerRefundId ?? null,
    adminDecisionNote: refund.adminDecisionNote ?? null,
    reviewedAt: refund.reviewedAt ?? null,
    refundedAt: refund.refundedAt ?? null,
    createdAt: refund.createdAt,
    affectedItems: getAffectedOrderItems(refund),
    payment: toAdminRefundPaymentResource(refund.paymentId),
    reviewedBy: toAdminRefundReviewerResource(refund.reviewedBy),
  };
}

export async function createCustomerRefundRequest({
  customerId,
  orderId,
  scope,
  orderItemIds,
  reason,
  explanation,
}) {
  if (!mongoose.isValidObjectId(orderId)) {
    throwOrderNotFound();
  }

  const order = await Order.findOne({
    _id: orderId,
    customerId,
  })
    .select(
      '_id orderNumber customerId paymentId items subtotal discountAmount totalAmount orderStatus placedAt',
    )
    .lean();

  if (!order) {
    throwOrderNotFound();
  }

  if (order.orderStatus !== ORDER_STATUSES.DELIVERED) {
    throwRefundNotEligible(
      'Refund requests are available only for delivered Orders.',
    );
  }

  const payment = await Payment.findOne({
    _id: order.paymentId,
    customerId,
  })
    .select('_id provider status amount currency verifiedAt')
    .lean();

  if (!payment || payment.status !== PAYMENT_STATUSES.SUCCEEDED) {
    throwRefundNotEligible(
      'A successful related Payment is required for a Refund request.',
    );
  }

  let normalizedScope;

  try {
    normalizedScope = normalizeOrderRefundScope({
      order,
      scope,
      itemIds: orderItemIds,
    });
  } catch (error) {
    if (error instanceof RefundDomainError) {
      if (error.code === REFUND_DOMAIN_ERROR_CODES.SCOPE_INVALID) {
        throwRefundScopeInvalid();
      }

      if (error.code === REFUND_DOMAIN_ERROR_CODES.ITEM_NOT_FOUND) {
        throwRefundItemNotFound();
      }
    }

    throw error;
  }

  const amount = calculateOrderRefundAmount({
    order,
    scope: normalizedScope.scope,
    itemIds: normalizedScope.itemIds,
  });

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throwRefundNotEligible(
      'The selected Refund scope has no refundable amount.',
    );
  }

  const scopeClaimKeys = buildRefundScopeClaimKeys({
    order,
    scope: normalizedScope.scope,
    itemIds: normalizedScope.itemIds,
  });

  const conflictingRefundExists = await Refund.exists(
    buildOccupiedRefundScopeFilter({
      orderId: order._id,
      scope: normalizedScope.scope,
      itemIds: normalizedScope.itemIds,
    }),
  );

  if (conflictingRefundExists) {
    throwRefundScopeConflict();
  }

  let refund;

  try {
    refund = await Refund.create({
      customerId,
      orderId: order._id,
      paymentId: payment._id,
      provider: payment.provider,
      origin: REFUND_ORIGINS.CUSTOMER_REQUEST,
      status: REFUND_STATUSES.REQUESTED,
      scope: normalizedScope.scope,
      itemIds: normalizedScope.itemIds,
      amount,
      currency: payment.currency,
      reason,
      explanation,
      scopeClaimKeys,
      scopeOccupied: true,
    });
  } catch (error) {
    if (isScopeClaimDuplicateKeyError(error)) {
      throwRefundScopeConflict();
    }

    throw error;
  }

  return getCustomerRefund({
    customerId,
    refundId: refund._id,
  });
}

export async function getCustomerRefunds({
  customerId,
  page,
  limit,
  status,
  origin,
  orderId,
  sort,
  order,
}) {
  const filter = {
    customerId,
  };

  if (status) {
    filter.status = status;
  }

  if (origin) {
    filter.origin = origin;
  }

  if (orderId) {
    filter.orderId = orderId;
  }

  const direction = order === 'asc' ? 1 : -1;
  const sortDefinition = {
    [sort]: direction,
    _id: direction,
  };
  const skip = (page - 1) * limit;

  const [refunds, totalItems] = await Promise.all([
    Refund.find(filter)
      .select(
        '_id orderId itemIds origin status scope reason explanation amount currency restockOnCompletion requestedAt updatedAt',
      )
      .populate(
        'orderId',
        '_id orderNumber orderStatus subtotal discountAmount totalAmount placedAt',
      )
      .sort(sortDefinition)
      .skip(skip)
      .limit(limit)
      .lean(),

    Refund.countDocuments(filter),
  ]);

  return {
    items: refunds.map(toCustomerRefundHistoryResource),
    meta: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    },
  };
}

export async function getCustomerRefund({ customerId, refundId }) {
  if (!mongoose.isValidObjectId(refundId)) {
    throwRefundNotFound();
  }

  const refund = await Refund.findOne({
    _id: refundId,
    customerId,
  })
    .select(
      '_id orderId paymentId itemIds origin status scope reason explanation amount currency restockOnCompletion adminDecisionNote reviewedAt refundedAt requestedAt createdAt updatedAt',
    )
    .populate(
      'orderId',
      '_id orderNumber orderStatus items subtotal discountAmount totalAmount placedAt',
    )
    .populate(
      'paymentId',
      '_id status amount currency verifiedAt',
    )
    .lean();

  if (!refund) {
    throwRefundNotFound();
  }

  return toCustomerRefundDetailResource(refund);
}

export async function getAdminRefunds({
  page,
  limit,
  q,
  status,
  origin,
  customerId,
  orderId,
  dateFrom,
  dateTo,
  sort,
  order,
}) {
  const filter = {};

  if (q) {
    const orderNumberFilter = {
      orderNumber: {
        $regex: escapeRegularExpression(q),
        $options: 'i',
      },
    };

    if (orderId) {
      orderNumberFilter._id = orderId;
    }

    const matchingOrderIds = await Order.distinct('_id', orderNumberFilter);

    filter.orderId = {
      $in: matchingOrderIds,
    };
  } else if (orderId) {
    filter.orderId = orderId;
  }

  if (status) {
    filter.status = status;
  }

  if (origin) {
    filter.origin = origin;
  }

  if (customerId) {
    filter.customerId = customerId;
  }

  if (dateFrom || dateTo) {
    filter.requestedAt = {};

    if (dateFrom) {
      filter.requestedAt.$gte = dateFrom;
    }

    if (dateTo) {
      const dateToExclusive = new Date(dateTo);

      dateToExclusive.setUTCDate(dateToExclusive.getUTCDate() + 1);
      filter.requestedAt.$lt = dateToExclusive;
    }
  }

  const direction = order === 'asc' ? 1 : -1;
  const sortDefinition = {
    [sort]: direction,
    _id: direction,
  };
  const skip = (page - 1) * limit;

  const [refunds, totalItems] = await Promise.all([
    Refund.find(filter)
      .select(
        '_id customerId orderId itemIds origin status scope reason amount currency restockOnCompletion requestedAt updatedAt',
      )
      .populate('customerId', '_id name email')
      .populate(
        'orderId',
        '_id orderNumber orderStatus subtotal discountAmount totalAmount placedAt',
      )
      .sort(sortDefinition)
      .skip(skip)
      .limit(limit)
      .lean(),
    Refund.countDocuments(filter),
  ]);

  return {
    items: refunds.map(toAdminRefundListResource),
    meta: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    },
  };
}

export async function getAdminRefund(refundId) {
  if (!mongoose.isValidObjectId(refundId)) {
    throwRefundNotFound();
  }

  const refund = await Refund.findById(refundId)
    .select(
      [
        '_id',
        'customerId',
        'orderId',
        'paymentId',
        'reviewedBy',
        'itemIds',
        'providerRefundId',
        'origin',
        'status',
        'scope',
        'reason',
        'explanation',
        'amount',
        'currency',
        'restockOnCompletion',
        'adminDecisionNote',
        'requestedAt',
        'reviewedAt',
        'refundedAt',
        'createdAt',
        'updatedAt',
      ].join(' '),
    )
    .populate('customerId', '_id name email')
    .populate(
      'orderId',
      '_id orderNumber orderStatus items subtotal discountAmount totalAmount placedAt',
    )
    .populate(
      'paymentId',
      '_id provider status amount currency providerPaymentId verifiedAt',
    )
    .populate('reviewedBy', '_id name email')
    .lean();

  if (!refund) {
    throwRefundNotFound();
  }

  return toAdminRefundDetailResource(refund);
}

export async function decideAdminRefund({
  refundId,
  adminId,
  decision,
  adminDecisionNote,
  restockOnCompletion,
}, {
  processProviderRefund = processApprovedRazorpayRefund,
} = {}) {
  if (!mongoose.isValidObjectId(refundId)) {
    throwRefundNotFound();
  }

  if (
    decision !== REFUND_ADMIN_DECISIONS.APPROVE &&
    decision !== REFUND_ADMIN_DECISIONS.REJECT
  ) {
    throw new TypeError('A valid Admin Refund decision is required.');
  }

  const rejecting = decision === REFUND_ADMIN_DECISIONS.REJECT;

  if (
    rejecting &&
    (typeof adminDecisionNote !== 'string' || !adminDecisionNote.trim())
  ) {
    throw new TypeError('Rejected Refunds require an Admin decision note.');
  }

  if (!rejecting && typeof restockOnCompletion !== 'boolean') {
    throw new TypeError(
      'Approved Refunds require an explicit restock decision.',
    );
  }

  const reviewedAt = new Date();
  const update = {
    $set: {
      status: rejecting
        ? REFUND_STATUSES.REJECTED
        : REFUND_STATUSES.APPROVED,
      scopeOccupied: !rejecting,
      reviewedBy: adminId,
      reviewedAt,
      ...(rejecting || adminDecisionNote
        ? { adminDecisionNote }
        : {}),
      ...(!rejecting ? { restockOnCompletion } : {}),
    },
    ...(rejecting
      ? {
          $unset: {
            restockOnCompletion: 1,
          },
        }
      : {}),
  };

  const updatedRefund = await Refund.findOneAndUpdate(
    {
      _id: refundId,
      origin: REFUND_ORIGINS.CUSTOMER_REQUEST,
      status: REFUND_STATUSES.REQUESTED,
    },
    update,
    {
      returnDocument: 'after',
      runValidators: true,
    },
  )
    .select('_id')
    .lean();

  if (!updatedRefund) {
    const existingRefund = await Refund.findById(refundId)
      .select(
        '_id origin status restockOnCompletion adminDecisionNote',
      )
      .lean();

    if (!existingRefund) {
      throwRefundNotFound();
    }

    const isCustomerApprovedRetry =
      !rejecting &&
      existingRefund.origin === REFUND_ORIGINS.CUSTOMER_REQUEST &&
      existingRefund.status === REFUND_STATUSES.APPROVED;

    const isSystemOriginApprovedRetry =
      !rejecting &&
      [
        REFUND_ORIGINS.ORDER_CANCELLATION,
        REFUND_ORIGINS.SYSTEM_COMPENSATION,
      ].includes(existingRefund.origin) &&
      existingRefund.status === REFUND_STATUSES.APPROVED;

    if (!isCustomerApprovedRetry && !isSystemOriginApprovedRetry) {
      throwRefundAlreadyProcessed();
    }

    if (
      isSystemOriginApprovedRetry &&
      (existingRefund.restockOnCompletion !== false ||
        restockOnCompletion !== false ||
        adminDecisionNote !== undefined)
    ) {
      throwRefundAlreadyProcessed();
    }

    const retryNoteConflicts =
      adminDecisionNote !== undefined &&
      adminDecisionNote !== existingRefund.adminDecisionNote;

    if (
      isCustomerApprovedRetry &&
      (restockOnCompletion !== existingRefund.restockOnCompletion ||
        retryNoteConflicts)
    ) {
      throwRefundAlreadyProcessed();
    }

    await processProviderRefund({
      refundId: existingRefund._id,
    });

    return getAdminRefund(refundId);
  }

  if (rejecting) {
    return getAdminRefund(refundId);
  }

  await processProviderRefund({
    refundId: updatedRefund._id,
  });

  return getAdminRefund(refundId);
}
