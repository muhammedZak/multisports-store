export function formatAdminRefundRestockDecision(value) {
  if (value === true) {
    return 'Yes';
  }

  if (value === false) {
    return 'No';
  }

  return 'Not decided';
}

export function getAdminRefundReasonSummary(reason) {
  if (!reason) {
    return 'No reason available';
  }

  return reason.length > 120 ? `${reason.slice(0, 120)}…` : reason;
}

export function getAdminRefundProviderResultMessage(refund) {
  if (refund.status === 'processing') {
    return 'Razorpay Refund processing is pending.';
  }

  if (refund.status === 'refunded') {
    return 'The Refund was completed by Razorpay.';
  }

  if (refund.status === 'failed') {
    return 'Razorpay reported a terminal Refund failure.';
  }

  return 'The durable Refund is saved. Provider processing is unconfirmed.';
}
