import { apiClient } from './client.js';

export async function fetchCustomerCart() {
  const response = await apiClient.get('/cart');

  return response.data.data.cart;
}

export async function addCustomerCartItem(payload) {
  const response = await apiClient.post('/cart/items', payload);

  return response.data.data.cart;
}
