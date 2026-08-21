import { apiClient } from './client.js';

const NOTIFICATION_QUERY_FIELDS = ['page', 'limit', 'type', 'readStatus'];

function createNotificationQueryParams(filters) {
  const params = {};

  for (const field of NOTIFICATION_QUERY_FIELDS) {
    const value = filters[field];

    if (value !== undefined && value !== null && value !== '') {
      params[field] = value;
    }
  }

  return params;
}

export async function fetchMyNotifications(filters = {}) {
  const response = await apiClient.get('/notifications', {
    params: createNotificationQueryParams(filters),
  });

  return {
    items: response.data.data.items,

    unreadCount: response.data.data.unreadCount,

    meta: response.data.meta,
  };
}

export async function markMyNotificationRead(notificationId) {
  const response = await apiClient.patch(
    `/notifications/${notificationId}/read`,
  );

  return response.data.data.notification;
}
