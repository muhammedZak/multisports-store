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

export async function authenticateGoogle(payload) {
  const response = await apiClient.post('/auth/google', payload);

  return response.data.data;
}

export async function requestLoginOtp(payload) {
  const response = await apiClient.post('/auth/otp/request', payload);

  return response.data.data;
}

export async function verifyLoginOtp(payload) {
  const response = await apiClient.post('/auth/otp/verify', payload);

  return response.data.data;
}

export async function logoutCustomer() {
  const response = await apiClient.post('/auth/logout');

  return response.data.data;
}

export async function requestPasswordRecovery(payload) {
  const response = await apiClient.post('/auth/password/forgot', payload);

  return response.data.data;
}

export async function verifyPasswordRecovery(payload) {
  const response = await apiClient.post(
    '/auth/password/forgot/verify',
    payload,
  );

  return response.data.data;
}

export async function resetPassword(payload) {
  const response = await apiClient.post('/auth/password/reset', payload);

  return response.data.data;
}

export async function changePassword(payload) {
  const response = await apiClient.patch('/auth/password', payload);

  return response.data.data;
}
