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

export async function fetchMyAddresses() {
  const response = await apiClient.get('/users/me/addresses');

  return response.data.data.items;
}

export async function createMyAddress(payload) {
  const response = await apiClient.post('/users/me/addresses', payload);

  return response.data.data.address;
}

export async function updateMyAddress(addressId, payload) {
  const response = await apiClient.patch(
    `/users/me/addresses/${addressId}`,
    payload,
  );

  return response.data.data.address;
}

export async function deleteMyAddress(addressId) {
  await apiClient.delete(`/users/me/addresses/${addressId}`);
}

export async function setMyDefaultAddress(addressId) {
  const response = await apiClient.patch(
    `/users/me/addresses/${addressId}/default`,
  );

  return response.data.data.items;
}