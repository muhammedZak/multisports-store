export const ADMIN_NOTIFICATION_EMPTY_FILTERS = {
  type: '',
  readStatus: '',
};

export const ADMIN_NOTIFICATION_DEFAULT_QUERY = {
  ...ADMIN_NOTIFICATION_EMPTY_FILTERS,

  page: 1,
  limit: 20,
};

export const ADMIN_NOTIFICATION_DEFAULT_META = {
  page: 1,
  limit: 20,
  totalItems: 0,
  totalPages: 0,
};

export const ADMIN_NOTIFICATION_TYPE_OPTIONS = [
  {
    value: '',
    label: 'All types',
  },
  {
    value: 'order',
    label: 'Orders',
  },
  {
    value: 'refund',
    label: 'Refunds',
  },
  {
    value: 'inventory',
    label: 'Inventory',
  },
  {
    value: 'support',
    label: 'Support',
  },
];

export const ADMIN_NOTIFICATION_READ_OPTIONS = [
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

export const ADMIN_NOTIFICATION_TYPE_VARIANTS = {
  order: 'info',

  payment: 'success',

  refund: 'warning',

  inventory: 'danger',

  support: 'info',
};
