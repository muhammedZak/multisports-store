import { apiClient } from './client.js';

export async function fetchCustomerCart() {
  const response = await apiClient.get('/cart');

  return response.data.data.cart;
}

export async function addCustomerCartItem(payload) {
  const response = await apiClient.post('/cart/items', payload);

  return response.data.data.cart;
}

export async function mergeCustomerCart(payload) {
  const response = await apiClient.post('/cart/merge', payload);

  return response.data.data.cart;
}

export async function updateCustomerCartItemQuantity(cartItemId, payload) {
  const response = await apiClient.patch(`/cart/items/${cartItemId}`, payload);

  return response.data.data.cart;
}

export async function removeCustomerCartItem(cartItemId) {
  const response = await apiClient.delete(`/cart/items/${cartItemId}`);

  return response.data.data.cart;
}

export async function clearCustomerCart() {
  const response = await apiClient.delete('/cart/items');

  return response.data.data.cart;
}