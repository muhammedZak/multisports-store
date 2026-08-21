import { apiClient } from './client.js';

export async function fetchAdminAnalytics(range = '30d', { signal } = {}) {
  const response = await apiClient.get('/admin/analytics', {
    params: {
      range,
    },

    signal,
  });

  return response.data.data;
}
