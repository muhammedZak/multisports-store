export const ADMIN_SUPPORT_EMPTY_FILTERS = {
  q: '',
  unread: '',
  order: 'desc',
};

export const ADMIN_SUPPORT_DEFAULT_QUERY = {
  ...ADMIN_SUPPORT_EMPTY_FILTERS,

  page: 1,
  limit: 20,

  sort: 'lastMessageAt',
};

export const ADMIN_SUPPORT_DEFAULT_META = {
  page: 1,
  limit: 20,

  totalItems: 0,
  totalPages: 0,
};
