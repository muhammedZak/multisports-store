export const ADMIN_COUPON_EMPTY_FILTERS = {
  q: '',
  status: '',
  discountType: '',
  sort: 'createdAt',
  order: 'desc',
};

export const ADMIN_COUPON_DEFAULT_QUERY = {
  ...ADMIN_COUPON_EMPTY_FILTERS,

  page: 1,
  limit: 20,
};

export const ADMIN_COUPON_DEFAULT_META = {
  page: 1,
  limit: 20,
  totalItems: 0,
  totalPages: 0,
};

export const ADMIN_COUPON_EMPTY_FORM = {
  code: '',

  discountType: 'percentage',

  discountValue: '',

  minimumOrderAmount: '0.00',

  maximumDiscount: '',

  startsAt: '',
  expiresAt: '',

  usageLimit: '',

  isActive: true,
};
