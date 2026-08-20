export const REFUND_ORIGINS = Object.freeze({
  CUSTOMER_REQUEST: 'customer_request',
  ORDER_CANCELLATION: 'order_cancellation',
  SYSTEM_COMPENSATION: 'system_compensation',
});

export const REFUND_ORIGIN_VALUES = Object.freeze(
  Object.values(REFUND_ORIGINS),
);

export const REFUND_STATUSES = Object.freeze({
  REQUESTED: 'requested',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PROCESSING: 'processing',
  REFUNDED: 'refunded',
  FAILED: 'failed',
});

export const REFUND_STATUS_VALUES = Object.freeze(
  Object.values(REFUND_STATUSES),
);

export const REFUND_SCOPES = Object.freeze({
  ORDER: 'order',
  ITEMS: 'items',
});

export const REFUND_SCOPE_VALUES = Object.freeze(
  Object.values(REFUND_SCOPES),
);

export const REFUND_PROVIDERS = Object.freeze({
  RAZORPAY: 'razorpay',
});

export const REFUND_PROVIDER_VALUES = Object.freeze(
  Object.values(REFUND_PROVIDERS),
);

export const REFUND_SCOPE_OCCUPYING_STATUSES = Object.freeze([
  REFUND_STATUSES.REQUESTED,
  REFUND_STATUSES.APPROVED,
  REFUND_STATUSES.PROCESSING,
  REFUND_STATUSES.REFUNDED,
  REFUND_STATUSES.FAILED,
]);

const REFUND_SCOPE_OCCUPYING_STATUS_SET = new Set(
  REFUND_SCOPE_OCCUPYING_STATUSES,
);

export function isRefundScopeOccupyingStatus(status) {
  return REFUND_SCOPE_OCCUPYING_STATUS_SET.has(status);
}
