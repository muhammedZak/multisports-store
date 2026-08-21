import { formatInrFromPaise } from '../../utils/money.js';

import { REFUND_STATUS_PRESENTATION } from './refund.constants.js';

export const refundDateFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatRefundLabel(value) {
  if (!value) {
    return 'Not available';
  }

  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatRefundOptionName(name) {
  if (typeof name !== 'string') {
    return '';
  }

  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatRefundAmount(amount, currency) {
  if (currency === 'INR') {
    return formatInrFromPaise(amount);
  }

  return `${amount} ${currency}`;
}

export function getRefundScopeSummary(refund) {
  if (refund.scope === 'order') {
    return 'Whole Order';
  }

  if (refund.scope === 'items') {
    const lineCount = refund.orderItemIds?.length ?? 0;

    return `${lineCount} complete item line${lineCount === 1 ? '' : 's'}`;
  }

  return 'Not tied to Order items';
}

export function getRefundStatusPresentation(status) {
  return (
    REFUND_STATUS_PRESENTATION[status] ?? {
      label: formatRefundLabel(status),

      variant: 'neutral',

      description: 'Current Refund status is available above.',
    }
  );
}
