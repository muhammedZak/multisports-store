import mongoose from 'mongoose';

import {
  REFUND_SCOPES,
  REFUND_SCOPE_OCCUPYING_STATUSES,
  isRefundScopeOccupyingStatus,
} from './refund.constants.js';

const MAX_SAFE_INTEGER_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

export const REFUND_DOMAIN_ERROR_CODES = Object.freeze({
  SCOPE_INVALID: 'REFUND_SCOPE_INVALID',
  ITEM_NOT_FOUND: 'REFUND_ITEM_NOT_FOUND',
});

export class RefundDomainError extends TypeError {
  constructor(code, message) {
    super(message);

    this.code = code;
  }
}

function throwRefundScopeInvalid(message) {
  throw new RefundDomainError(
    REFUND_DOMAIN_ERROR_CODES.SCOPE_INVALID,
    message,
  );
}

function throwRefundItemNotFound() {
  throw new RefundDomainError(
    REFUND_DOMAIN_ERROR_CODES.ITEM_NOT_FOUND,
    'A requested item is not part of the owned Order.',
  );
}

function isNonNegativeSafeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function toObjectId(value, label) {
  const candidate =
    typeof value === 'string'
      ? value.trim()
      : value instanceof mongoose.Types.ObjectId
        ? value.toString()
        : null;

  if (!candidate || !mongoose.Types.ObjectId.isValid(candidate)) {
    throw new TypeError(`${label} must be a valid ObjectId.`);
  }

  return new mongoose.Types.ObjectId(candidate);
}

function getObjectIdKey(value, label) {
  return toObjectId(value, label).toString();
}

function assertValidOrderPricingSnapshot(order) {
  if (!order || typeof order !== 'object' || Array.isArray(order)) {
    throw new TypeError('A valid Order snapshot is required.');
  }

  if (!Array.isArray(order.items) || order.items.length === 0) {
    throw new TypeError('Order must contain at least one stored item line.');
  }

  if (
    !isNonNegativeSafeInteger(order.subtotal) ||
    !isNonNegativeSafeInteger(order.discountAmount) ||
    !isNonNegativeSafeInteger(order.totalAmount)
  ) {
    throw new TypeError('Order pricing must use non-negative integer paise.');
  }

  const seenItemIds = new Set();

  let storedSubtotal = 0n;

  for (const item of order.items) {
    const itemId = getObjectIdKey(item?._id, 'Order item ID');

    if (seenItemIds.has(itemId)) {
      throw new TypeError('Order item IDs must be unique.');
    }

    seenItemIds.add(itemId);

    if (!isNonNegativeSafeInteger(item?.lineTotal)) {
      throw new TypeError(
        'Order item line totals must use non-negative integer paise.',
      );
    }

    storedSubtotal += BigInt(item.lineTotal);
  }

  if (storedSubtotal !== BigInt(order.subtotal)) {
    throw new TypeError(
      'Order subtotal must equal the sum of stored item line totals.',
    );
  }

  if (order.discountAmount > order.subtotal) {
    throw new TypeError('Order discount cannot exceed its subtotal.');
  }

  if (order.totalAmount !== order.subtotal - order.discountAmount) {
    throw new TypeError(
      'Order total must equal subtotal minus the Order discount.',
    );
  }
}

function normalizeUnverifiedItemIds(itemIds, label = 'Refund item IDs') {
  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    throwRefundScopeInvalid(
      `${label} must contain at least one Order item ID.`,
    );
  }

  const normalizedIds = [];
  const seenIds = new Set();

  for (const value of itemIds) {
    const itemId = toObjectId(value, 'Refund item ID');
    const itemIdKey = itemId.toString();

    if (seenIds.has(itemIdKey)) {
      throwRefundScopeInvalid(
        'Refund item IDs must not contain duplicates.',
      );
    }

    seenIds.add(itemIdKey);
    normalizedIds.push(itemId);
  }

  return normalizedIds;
}

export function normalizeOrderRefundScope({ order, scope, itemIds }) {
  assertValidOrderPricingSnapshot(order);

  if (scope === REFUND_SCOPES.ORDER) {
    if (itemIds !== undefined && (!Array.isArray(itemIds) || itemIds.length)) {
      throwRefundScopeInvalid(
        'Whole-Order Refund scope cannot contain item IDs.',
      );
    }

    return {
      scope: REFUND_SCOPES.ORDER,
      itemIds: [],
    };
  }

  if (scope !== REFUND_SCOPES.ITEMS) {
    throwRefundScopeInvalid('Refund scope must be order or items.');
  }

  const requestedItemIds = normalizeUnverifiedItemIds(itemIds);
  const requestedItemIdKeys = new Set(
    requestedItemIds.map((itemId) => itemId.toString()),
  );

  const normalizedItemIds = order.items
    .filter((item) =>
      requestedItemIdKeys.has(getObjectIdKey(item._id, 'Order item ID')),
    )
    .map((item) => item._id);

  if (normalizedItemIds.length !== requestedItemIds.length) {
    throwRefundItemNotFound();
  }

  return {
    scope: REFUND_SCOPES.ITEMS,
    itemIds: normalizedItemIds,
  };
}

export function allocateOrderCouponDiscount(order) {
  assertValidOrderPricingSnapshot(order);

  const subtotal = BigInt(order.subtotal);
  const discountAmount = BigInt(order.discountAmount);

  const allocations = order.items.map((item) => ({
    itemId: item._id,
    lineTotal: BigInt(item.lineTotal),
    allocatedCouponShare:
      subtotal === 0n
        ? 0n
        : (discountAmount * BigInt(item.lineTotal)) / subtotal,
  }));

  const allocatedBaseTotal = allocations.reduce(
    (sum, allocation) => sum + allocation.allocatedCouponShare,
    0n,
  );

  let remainder = discountAmount - allocatedBaseTotal;

  /*
   * Stable Order-item order is the tie-breaker.
   *
   * Lines already fully discounted are skipped so a zero-value line can
   * never receive a negative refundable amount.
   */
  for (const allocation of allocations) {
    if (remainder === 0n) {
      break;
    }

    if (allocation.allocatedCouponShare < allocation.lineTotal) {
      allocation.allocatedCouponShare += 1n;
      remainder -= 1n;
    }
  }

  if (remainder !== 0n) {
    throw new TypeError('Order Coupon discount could not be allocated safely.');
  }

  const refundableLines = allocations.map((allocation) => {
    const refundableLineAmount =
      allocation.lineTotal - allocation.allocatedCouponShare;

    if (
      allocation.allocatedCouponShare > MAX_SAFE_INTEGER_BIGINT ||
      refundableLineAmount > MAX_SAFE_INTEGER_BIGINT
    ) {
      throw new TypeError('Allocated Refund amounts exceed safe integer paise.');
    }

    return {
      itemId: allocation.itemId,
      lineTotal: Number(allocation.lineTotal),
      allocatedCouponShare: Number(allocation.allocatedCouponShare),
      refundableLineAmount: Number(refundableLineAmount),
    };
  });

  const refundableTotal = refundableLines.reduce(
    (sum, line) => sum + BigInt(line.refundableLineAmount),
    0n,
  );

  if (refundableTotal !== BigInt(order.totalAmount)) {
    throw new TypeError(
      'Allocated refundable line amounts must equal the Order total.',
    );
  }

  return refundableLines;
}

export function calculateOrderRefundAmount({ order, scope, itemIds }) {
  const normalizedScope = normalizeOrderRefundScope({
    order,
    scope,
    itemIds,
  });

  const refundableLines = allocateOrderCouponDiscount(order);

  if (normalizedScope.scope === REFUND_SCOPES.ORDER) {
    return order.totalAmount;
  }

  const selectedItemIds = new Set(
    normalizedScope.itemIds.map((itemId) =>
      getObjectIdKey(itemId, 'Refund item ID'),
    ),
  );

  return refundableLines.reduce(
    (amount, line) =>
      selectedItemIds.has(getObjectIdKey(line.itemId, 'Order item ID'))
        ? amount + line.refundableLineAmount
        : amount,
    0,
  );
}

export function buildRefundScopeClaimKeys({ order, scope, itemIds }) {
  const orderId = getObjectIdKey(order?._id, 'Refund Order ID');

  const normalizedScope = normalizeOrderRefundScope({
    order,
    scope,
    itemIds,
  });

  const claimedItemIds =
    normalizedScope.scope === REFUND_SCOPES.ORDER
      ? order.items.map((item) => item._id)
      : normalizedScope.itemIds;

  return claimedItemIds.map(
    (itemId) =>
      `${orderId}:${getObjectIdKey(itemId, 'Refund item ID')}`,
  );
}

function getRefundOrderIdKey(refund) {
  if (refund?.orderId === undefined || refund?.orderId === null) {
    return null;
  }

  return getObjectIdKey(refund.orderId, 'Refund Order ID');
}

export function refundScopesConflict(leftRefund, rightRefund) {
  if (
    !isRefundScopeOccupyingStatus(leftRefund?.status) ||
    !isRefundScopeOccupyingStatus(rightRefund?.status)
  ) {
    return false;
  }

  const leftOrderId = getRefundOrderIdKey(leftRefund);
  const rightOrderId = getRefundOrderIdKey(rightRefund);

  if (!leftOrderId || !rightOrderId || leftOrderId !== rightOrderId) {
    return false;
  }

  if (
    leftRefund.scope === REFUND_SCOPES.ORDER ||
    rightRefund.scope === REFUND_SCOPES.ORDER
  ) {
    return true;
  }

  if (
    leftRefund.scope !== REFUND_SCOPES.ITEMS ||
    rightRefund.scope !== REFUND_SCOPES.ITEMS
  ) {
    throw new TypeError('Order-backed Refunds must have a valid scope.');
  }

  const leftItemIds = normalizeUnverifiedItemIds(leftRefund.itemIds);
  const leftItemIdKeys = new Set(
    leftItemIds.map((itemId) => itemId.toString()),
  );

  const rightItemIds = normalizeUnverifiedItemIds(rightRefund.itemIds);

  return rightItemIds.some((itemId) =>
    leftItemIdKeys.has(itemId.toString()),
  );
}

export function buildOccupiedRefundScopeFilter({
  orderId,
  scope,
  itemIds,
  excludeRefundId,
}) {
  const normalizedOrderId = toObjectId(orderId, 'Refund Order ID');

  const filter = {
    orderId: normalizedOrderId,
    status: {
      $in: [...REFUND_SCOPE_OCCUPYING_STATUSES],
    },
  };

  if (excludeRefundId !== undefined && excludeRefundId !== null) {
    filter._id = {
      $ne: toObjectId(excludeRefundId, 'Excluded Refund ID'),
    };
  }

  if (scope === REFUND_SCOPES.ORDER) {
    if (itemIds !== undefined && (!Array.isArray(itemIds) || itemIds.length)) {
      throw new TypeError('Whole-Order Refund scope cannot contain item IDs.');
    }

    return filter;
  }

  if (scope !== REFUND_SCOPES.ITEMS) {
    throw new TypeError('Refund scope must be order or items.');
  }

  const normalizedItemIds = normalizeUnverifiedItemIds(itemIds);

  filter.$or = [
    {
      scope: REFUND_SCOPES.ORDER,
    },
    {
      scope: REFUND_SCOPES.ITEMS,
      itemIds: {
        $in: normalizedItemIds,
      },
    },
  ];

  return filter;
}
