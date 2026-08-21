export const SOCKET_EVENTS = Object.freeze({
  SUPPORT_ROOM_JOIN: 'support:room:join',
  SUPPORT_ROOM_LEAVE: 'support:room:leave',

  SUPPORT_MESSAGE_NEW: 'support:message:new',

  NOTIFICATION_NEW: 'notification:new',
});

export function getUserSocketRoom(userId) {
  return `user:${userId}`;
}

export function getSupportSocketRoom(conversationId) {
  return `support:${conversationId}`;
}
