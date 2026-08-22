export const ADMIN_REFUND_EMPTY_FILTERS = {
  q: '',
  status: '',
  origin: '',
  customerId: '',
  orderId: '',
  dateFrom: '',
  dateTo: '',
  order: 'desc',
};

export const ADMIN_REFUND_DEFAULT_QUERY = {
  ...ADMIN_REFUND_EMPTY_FILTERS,

  page: 1,
  limit: 20,

  sort: 'requestedAt',
};

export const ADMIN_REFUND_DEFAULT_META = {
  page: 1,
  limit: 20,
  totalItems: 0,
  totalPages: 0,
};

export const ADMIN_REFUND_RETRY_ORIGINS = new Set([
  'customer_request',
  'order_cancellation',
  'system_compensation',
]);
