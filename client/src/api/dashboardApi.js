import { apiClient } from './client.js';

export async function fetchAdminDashboard() {
  const response = await apiClient.get('/admin/dashboard');

  return response.data.data;
}
