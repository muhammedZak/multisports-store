import { apiClient } from './client.js';

const ADMIN_ORDER_QUERY_FIELDS = [
  'page',
  'limit',
  'q',
  'status',
  'customerId',
  'dateFrom',
  'dateTo',
  'sort',
  'order',
];

function createAdminOrderQueryParams(filters) {
  const params = {};

  for (const field of ADMIN_ORDER_QUERY_FIELDS) {
    const value = filters[field];

    if (value !== undefined && value !== null && value !== '') {
      params[field] = value;
    }
  }

  return params;
}

export async function fetchAdminOrders(filters = {}) {
  const response = await apiClient.get('/admin/orders', {
    params: createAdminOrderQueryParams(filters),
  });

  return {
    items: response.data.data.items,
    meta: response.data.meta,
  };
}

export async function fetchAdminOrder(orderId) {
  const response = await apiClient.get(`/admin/orders/${orderId}`);

  return response.data.data.order;
}

export async function fetchMyOrders({
  page = 1,
  limit = 20,
  status,
  sort = 'placedAt',
  order = 'desc',
} = {}) {
  const params = {
    page,
    limit,
    sort,
    order,
  };

  if (status) {
    params.status = status;
  }

  const response = await apiClient.get('/orders', {
    params,
  });

  return {
    items: response.data.data.items,
    meta: response.data.meta,
  };
}

export async function fetchMyOrder(orderId) {
  const response = await apiClient.get(`/orders/${orderId}`);

  return response.data.data.order;
}

export async function cancelMyOrder(orderId) {
  const response = await apiClient.post(`/orders/${orderId}/cancel`);

  return response.data.data.order;
}

export async function updateAdminOrderStatus(orderId, status) {
  const response = await apiClient.patch(`/admin/orders/${orderId}/status`, {
    status,
  });

  return response.data.data.order;
}