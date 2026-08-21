import { ORDER_STATUS_VARIANTS } from './order.constants.js';

export const orderDateFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatOrderLabel(value) {
  if (!value) {
    return 'Unknown';
  }

  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatOrderOptionName(name) {
  if (typeof name !== 'string') {
    return '';
  }

  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function getOrderStatusVariant(status) {
  return ORDER_STATUS_VARIANTS[status] ?? 'neutral';
}

export function isOrderRefundEligible(order) {
  return (
    order?.orderStatus === 'delivered' && order?.payment?.status === 'succeeded'
  );
}