export const ADMIN_ORDER_EMPTY_FILTERS = {
  q: '',
  status: '',
  customerId: '',
  dateFrom: '',
  dateTo: '',
  order: 'desc',
};

export const ADMIN_ORDER_DEFAULT_QUERY = {
  ...ADMIN_ORDER_EMPTY_FILTERS,

  sort: 'placedAt',

  page: 1,
  limit: 20,
};

export const ADMIN_ORDER_DEFAULT_META = {
  page: 1,
  limit: 20,
  totalItems: 0,
  totalPages: 0,
};

export const ADMIN_PAYMENT_STATUS_VARIANTS = {
  succeeded: 'success',

  created: 'warning',
  pending: 'warning',

  failed: 'danger',
  cancelled: 'danger',
  verification_failed: 'danger',
};

export const ADMIN_ORDER_TRANSITION_LABELS = {
  confirmed: 'Confirm order',

  processing: 'Start processing',

  shipped: 'Mark as shipped',

  delivered: 'Mark as delivered',

  cancelled: 'Cancel order',
};
