import { apiClient } from './client.js';

const ADMIN_COUPON_QUERY_FIELDS = [
  'page',
  'limit',
  'q',
  'status',
  'discountType',
  'sort',
  'order',
];

function createQueryParams(filters) {
  const params = {};

  for (const field of ADMIN_COUPON_QUERY_FIELDS) {
    const value = filters[field];

    if (value !== undefined && value !== null && value !== '') {
      params[field] = value;
    }
  }

  return params;
}

export async function fetchAdminCoupons(filters = {}) {
  const response = await apiClient.get('/admin/coupons', {
    params: createQueryParams(filters),
  });

  return {
    items: response.data.data.items,
    meta: response.data.meta,
  };
}

export async function fetchAdminCoupon(couponId) {
  const response = await apiClient.get(`/admin/coupons/${couponId}`);

  return response.data.data.coupon;
}

export async function createAdminCoupon(payload) {
  const response = await apiClient.post('/admin/coupons', payload);

  return response.data.data.coupon;
}

export async function updateAdminCoupon(couponId, payload) {
  const response = await apiClient.patch(`/admin/coupons/${couponId}`, payload);

  return response.data.data.coupon;
}

export async function updateAdminCouponStatus(couponId, isActive) {
  const response = await apiClient.patch(`/admin/coupons/${couponId}/status`, {
    isActive,
  });

  return response.data.data.coupon;
}
