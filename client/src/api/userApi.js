import { apiClient } from './client.js';

export async function fetchMyProfile() {
  const response = await apiClient.get('/users/me');

  return response.data.data.user;
}

export async function updateMyProfile(payload) {
  const response = await apiClient.patch('/users/me', payload);

  return response.data.data.user;
}

