import { apiClient } from './client.js';

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
