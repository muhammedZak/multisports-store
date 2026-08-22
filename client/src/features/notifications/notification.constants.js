export const NOTIFICATION_EMPTY_FILTERS = {
  type: '',
  readStatus: '',
};

export const NOTIFICATION_DEFAULT_QUERY = {
  ...NOTIFICATION_EMPTY_FILTERS,

  page: 1,
  limit: 20,
};

export const NOTIFICATION_DEFAULT_META = {
  page: 1,
  limit: 20,
  totalItems: 0,
  totalPages: 0,
};

export const NOTIFICATION_TYPE_VARIANTS = {
  order: 'info',
  payment: 'success',
  refund: 'warning',
  inventory: 'neutral',
  support: 'info',
};

export const NOTIFICATION_TYPE_OPTIONS = [
  {
    value: '',
    label: 'All types',
  },
  {
    value: 'order',
    label: 'Orders',
  },
  {
    value: 'payment',
    label: 'Payments',
  },
  {
    value: 'refund',
    label: 'Refunds',
  },
  {
    value: 'support',
    label: 'Support',
  },
];

export const NOTIFICATION_READ_OPTIONS = [
  {
    value: '',
    label: 'All Notifications',
  },
  {
    value: 'unread',
    label: 'Unread',
  },
  {
    value: 'read',
    label: 'Read',
  },
];
