import { apiClient } from './client.js';

export async function fetchCsrfToken() {
  const response = await apiClient.get('/auth/csrf-token');

  return response.data.data;
}

export async function fetchSession() {
  const response = await apiClient.get('/auth/session');

  return response.data.data;
}

export async function registerCustomer(payload) {
  const response = await apiClient.post('/auth/register', payload);

  return response.data.data;
}

export async function verifyEmail(payload) {
  const response = await apiClient.post(
    '/auth/email-verification/verify',
    payload,
  );

  return response.data.data;
}

export async function resendVerification(payload) {
  const response = await apiClient.post(
    '/auth/email-verification/resend',
    payload,
  );

  return response.data.data;
}

export async function loginCustomer(payload) {
  const response = await apiClient.post('/auth/login', payload);

  return response.data.data;
}

export async function logoutCustomer() {
  const response = await apiClient.post('/auth/logout');

  return response.data.data;
}
