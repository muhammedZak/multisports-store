export const STOCK_STATE_PRESENTATION = {
  in_stock: {
    label: 'In stock',
    variant: 'success',
  },

  low_stock: {
    label: 'Low stock',
    variant: 'warning',
  },

  out_of_stock: {
    label: 'Out of stock',
    variant: 'danger',
  },
};

export const CUSTOMER_COUPON_WARNING_CODES = new Set([
  'INVALID_COUPON',
  'COUPON_INACTIVE',
  'COUPON_NOT_STARTED',
  'COUPON_EXPIRED',
  'COUPON_MINIMUM_NOT_MET',
  'COUPON_USAGE_LIMIT_REACHED',
]);
