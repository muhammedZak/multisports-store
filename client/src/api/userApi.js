import { apiClient } from './client.js';

export async function fetchMyProfile() {
  const response = await apiClient.get('/users/me');

  return response.data.data.user;
}

export async function updateMyProfile(payload) {
  const response = await apiClient.patch('/users/me', payload);

  return response.data.data.user;
}

export async function uploadMyProfilePhoto(imageFile) {
  const formData = new FormData();

  formData.append('image', imageFile);

  const response = await apiClient.put('/users/me/profile-photo', formData);

  return response.data.data.user;
}

export async function removeMyProfilePhoto() {
  await apiClient.delete('/users/me/profile-photo');
}
