export const ADMIN_REVIEW_EMPTY_FILTERS = {
  productId: '',
  customerId: '',
  rating: '',
  moderationStatus: '',

  sort: 'createdAt',
  order: 'desc',
};

export const ADMIN_REVIEW_DEFAULT_QUERY = {
  ...ADMIN_REVIEW_EMPTY_FILTERS,

  page: 1,
  limit: 20,
};

export const ADMIN_REVIEW_DEFAULT_META = {
  page: 1,
  limit: 20,
  totalItems: 0,
  totalPages: 0,
};
