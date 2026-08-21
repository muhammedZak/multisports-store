import { apiClient } from './client.js';

export async function fetchMySupportConversation() {
  const response = await apiClient.get('/support/conversation');

  return response.data.data.conversation;
}

export async function createMySupportConversation() {
  const response = await apiClient.post('/support/conversation');

  return response.data.data.conversation;
}

export async function fetchMySupportMessages({ page = 1, limit = 20 } = {}) {
  const response = await apiClient.get('/support/conversation/messages', {
    params: {
      page,
      limit,
    },
  });

  return {
    items: response.data.data.items,
    meta: response.data.meta,
  };
}

export async function sendMySupportMessage(text) {
  const response = await apiClient.post('/support/conversation/messages', {
    text,
  });

  return response.data.data.message;
}

export async function markMySupportConversationRead() {
  const response = await apiClient.patch('/support/conversation/read');

  return response.data.data.conversation;
}

const ADMIN_SUPPORT_QUERY_FIELDS = [
  'page',
  'limit',
  'q',
  'unread',
  'sort',
  'order',
];

function createAdminSupportQueryParams(filters) {
  const params = {};

  for (const field of ADMIN_SUPPORT_QUERY_FIELDS) {
    const value = filters[field];

    if (value !== undefined && value !== null && value !== '') {
      params[field] = value;
    }
  }

  return params;
}

export async function fetchAdminSupportConversations(filters = {}) {
  const response = await apiClient.get('/admin/support/conversations', {
    params: createAdminSupportQueryParams(filters),
  });

  return {
    items: response.data.data.items,
    meta: response.data.meta,
  };
}

export async function fetchAdminSupportConversation(conversationId) {
  const response = await apiClient.get(
    `/admin/support/conversations/${conversationId}`,
  );

  return response.data.data.conversation;
}

export async function fetchAdminSupportMessages(
  conversationId,
  { page = 1, limit = 20 } = {},
) {
  const response = await apiClient.get(
    `/admin/support/conversations/${conversationId}/messages`,
    {
      params: {
        page,
        limit,
      },
    },
  );

  return {
    items: response.data.data.items,
    meta: response.data.meta,
  };
}

export async function sendAdminSupportMessage(conversationId, text) {
  const response = await apiClient.post(
    `/admin/support/conversations/${conversationId}/messages`,
    {
      text,
    },
  );

  return response.data.data.message;
}

export async function markAdminSupportConversationRead(conversationId) {
  const response = await apiClient.patch(
    `/admin/support/conversations/${conversationId}/read`,
  );

  return response.data.data.conversation;
}