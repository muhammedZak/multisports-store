export const ORDER_EMPTY_FILTERS = {
  status: '',
  order: 'desc',
};

export const ORDER_DEFAULT_QUERY = {
  ...ORDER_EMPTY_FILTERS,

  page: 1,
  limit: 20,

  sort: 'placedAt',
};

export const ORDER_DEFAULT_META = {
  page: 1,
  limit: 20,
  totalItems: 0,
  totalPages: 0,
};

export const ORDER_STATUS_OPTIONS = [
  {
    value: '',
    label: 'All statuses',
  },
  {
    value: 'placed',
    label: 'Placed',
  },
  {
    value: 'confirmed',
    label: 'Confirmed',
  },
  {
    value: 'processing',
    label: 'Processing',
  },
  {
    value: 'shipped',
    label: 'Shipped',
  },
  {
    value: 'delivered',
    label: 'Delivered',
  },
  {
    value: 'cancelled',
    label: 'Cancelled',
  },
];

export const ORDER_STATUS_VARIANTS = {
  placed: 'info',
  confirmed: 'info',
  processing: 'warning',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'danger',
};
