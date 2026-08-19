import { apiClient } from './client.js';

export async function previewCheckout(payload) {
  const response = await apiClient.post('/checkout/preview', payload);

  return response.data.data.checkout;
}

export async function createRazorpayPaymentOrder(payload) {
  const response = await apiClient.post('/payments/razorpay/orders', payload);

  return response.data.data;
}

export async function verifyRazorpayPayment(payload) {
  const response = await apiClient.post('/payments/razorpay/verify', payload);

  return response.data.data;
}
