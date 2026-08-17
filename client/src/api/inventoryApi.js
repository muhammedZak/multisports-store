import { apiClient } from './client.js';

const ADMIN_INVENTORY_QUERY_FIELDS = [
  'page',
  'limit',
  'q',
  'sport',
  'categoryId',
  'stockState',
  'productId',
  'sort',
  'order',
];

function createQueryParams(filters) {
  const params = {};

  for (const field of ADMIN_INVENTORY_QUERY_FIELDS) {
    const value = filters[field];

    if (value !== undefined && value !== null && value !== '') {
      params[field] = value;
    }
  }

  return params;
}

export async function fetchAdminInventories(filters = {}) {
  const response = await apiClient.get('/admin/inventory', {
    params: createQueryParams(filters),
  });

  return {
    items: response.data.data.items,
    meta: response.data.meta,
  };
}

export async function fetchAdminInventory(inventoryId) {
  const response = await apiClient.get(`/admin/inventory/${inventoryId}`);

  return response.data.data.inventory;
}
