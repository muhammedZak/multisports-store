export const REVIEW_EMPTY_FILTERS = {
  moderationStatus: '',
  order: 'desc',
};

export const REVIEW_DEFAULT_QUERY = {
  ...REVIEW_EMPTY_FILTERS,

  page: 1,
  limit: 20,

  sort: 'createdAt',
};

export const REVIEW_DEFAULT_META = {
  page: 1,
  limit: 20,
  totalItems: 0,
  totalPages: 0,
};

export const REVIEW_STATUS_VARIANTS = {
  visible: 'success',
  hidden: 'warning',
};
