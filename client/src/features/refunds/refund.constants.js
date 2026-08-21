export const REFUND_EMPTY_FILTERS = {
  status: '',
  origin: '',
  order: 'desc',
};

export const REFUND_DEFAULT_QUERY = {
  ...REFUND_EMPTY_FILTERS,

  page: 1,
  limit: 20,

  sort: 'requestedAt',
};

export const REFUND_DEFAULT_META = {
  page: 1,
  limit: 20,
  totalItems: 0,
  totalPages: 0,
};

export const REFUND_STATUS_PRESENTATION = {
  requested: {
    label: 'Requested',
    variant: 'info',

    description: 'Waiting for Admin review.',
  },

  approved: {
    label: 'Approved',
    variant: 'info',

    description: 'Approved and waiting for payment-provider processing.',
  },

  rejected: {
    label: 'Rejected',
    variant: 'danger',

    description: 'This Refund request was not approved.',
  },

  processing: {
    label: 'Processing',
    variant: 'warning',

    description: 'The payment provider is processing this Refund.',
  },

  refunded: {
    label: 'Refunded',
    variant: 'success',

    description: 'This Refund has been completed.',
  },

  failed: {
    label: 'Failed',
    variant: 'danger',

    description: 'Refund processing failed and may need attention.',
  },
};
