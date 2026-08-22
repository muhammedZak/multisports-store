import { formatInrFromPaise } from '../../utils/money.js';

import {
  ADMIN_ORDER_TRANSITION_LABELS,
  ADMIN_PAYMENT_STATUS_VARIANTS,
} from './adminOrder.constants.js';

import { formatOrderLabel } from './order.utils.js';

export function getAdminPaymentStatusVariant(status) {
  return ADMIN_PAYMENT_STATUS_VARIANTS[status] ?? 'neutral';
}

export function getAdminOrderTransitionLabel(status) {
  return (
    ADMIN_ORDER_TRANSITION_LABELS[status] ??
    `Move to ${formatOrderLabel(status)}`
  );
}

export function getAdminOrderItemCount(order) {
  return (order.items ?? []).reduce(
    (total, item) => total + item.quantity,

    0,
  );
}

export function getAdminOrderCouponValueLabel(coupon) {
  if (!coupon) {
    return '—';
  }

  if (coupon.discountType === 'percentage') {
    return `${coupon.discountValue}%`;
  }

  return formatInrFromPaise(coupon.discountValue);
}
