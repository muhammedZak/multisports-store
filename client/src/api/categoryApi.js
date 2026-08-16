import { apiClient } from './client.js';

export async function fetchSports() {
  const response = await apiClient.get('/sports');

  return response.data.data.items;
}

export async function fetchAdminCategories(filters = {}) {
  const params = {};

  if (filters.q) {
    params.q = filters.q;
  }

  if (filters.sport) {
    params.sport = filters.sport;
  }

  if (filters.status) {
    params.status = filters.status;
  }

  const response = await apiClient.get('/admin/categories', {
    params,
  });

  return response.data.data.items;
}

export async function createAdminCategory(payload) {
  const response = await apiClient.post('/admin/categories', payload);

  return response.data.data.category;
}

export async function updateAdminCategory(categoryId, payload) {
  const response = await apiClient.patch(
    `/admin/categories/${categoryId}`,
    payload,
  );

  return response.data.data.category;
}

export async function updateAdminCategoryStatus(categoryId, isActive) {
  const response = await apiClient.patch(
    `/admin/categories/${categoryId}/status`,
    {
      isActive,
    },
  );

  return response.data.data.category;
}
