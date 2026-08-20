import { apiClient } from './client.js';

const CUSTOMER_REFUND_QUERY_FIELDS = [
  'page',
  'limit',
  'status',
  'origin',
  'orderId',
  'sort',
  'order',
];

function createCustomerRefundQueryParams(filters) {
  const params = {};

  for (const field of CUSTOMER_REFUND_QUERY_FIELDS) {
    const value = filters[field];

    if (value !== undefined && value !== null && value !== '') {
      params[field] = value;
    }
  }

  return params;
}

export async function createRefundRequest(orderId, payload) {
  const response = await apiClient.post(
    `/orders/${orderId}/refunds`,
    payload,
  );

  return response.data.data.refund;
}

export async function fetchMyRefunds(filters = {}) {
  const response = await apiClient.get('/refunds', {
    params: createCustomerRefundQueryParams(filters),
  });

  return {
    items: response.data.data.items,
    meta: response.data.meta,
  };
}

export async function fetchMyRefund(refundId) {
  const response = await apiClient.get(`/refunds/${refundId}`);

  return response.data.data.refund;
}
