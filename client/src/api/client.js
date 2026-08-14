import axios from 'axios';

import { getCsrfToken } from './csrf.js';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

if (!apiBaseUrl) {
  throw new Error('VITE_API_BASE_URL is required');
}

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

const SAFE_METHODS = new Set(['get', 'head', 'options']);

apiClient.interceptors.request.use((config) => {
  const method = config.method?.toLowerCase();

  if (method && !SAFE_METHODS.has(method)) {
    const csrfToken = getCsrfToken();

    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }

  return config;
});
