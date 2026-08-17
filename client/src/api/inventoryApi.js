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

const ADMIN_INVENTORY_HISTORY_QUERY_FIELDS = [
  'page',
  'limit',
  'reason',
  'sort',
  'order',
];

function createQueryParams(filters, supportedFields) {
  const params = {};

  for (const field of supportedFields) {
    const value = filters[field];

    if (value !== undefined && value !== null && value !== '') {
      params[field] = value;
    }
  }

  return params;
}

export async function fetchAdminInventories(filters = {}) {
  const response = await apiClient.get('/admin/inventory', {
    params: createQueryParams(filters, ADMIN_INVENTORY_QUERY_FIELDS),
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

export async function createAdminInventoryAdjustment(inventoryId, payload) {
  const response = await apiClient.post(
    `/admin/inventory/${inventoryId}/adjustments`,
    payload,
  );

  return {
    inventory: response.data.data.inventory,
    adjustment: response.data.data.adjustment,
  };
}

export async function fetchAdminInventoryAdjustments(
  inventoryId,
  filters = {},
) {
  const response = await apiClient.get(
    `/admin/inventory/${inventoryId}/adjustments`,
    {
      params: createQueryParams(filters, ADMIN_INVENTORY_HISTORY_QUERY_FIELDS),
    },
  );

  return {
    items: response.data.data.items,
    meta: response.data.meta,
  };
}
