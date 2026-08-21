import {
  getSupportSocketRoom,
  getUserSocketRoom,
  SOCKET_EVENTS,
} from './socket.constants.js';

let ioInstance = null;

export function registerSocketServer(io) {
  ioInstance = io;
}

function emitSafely(room, event, payload) {
  if (!ioInstance) {
    /*
     * Socket.IO is optional delivery.
     *
     * Services/tests may run without a live Socket server.
     */
    return false;
  }

  try {
    ioInstance.to(room).emit(event, payload);

    return true;
  } catch (error) {
    /*
     * Never let live-delivery failure invalidate
     * already-persisted application state.
     */
    console.error('Socket.IO delivery failed:', {
      event,
      message: error?.message ?? null,
    });

    return false;
  }
}

export function emitSupportMessageNew({ conversationId, message }) {
  const normalizedConversationId = conversationId.toString();

  return emitSafely(
    getSupportSocketRoom(normalizedConversationId),

    SOCKET_EVENTS.SUPPORT_MESSAGE_NEW,

    {
      conversationId: normalizedConversationId,

      /*
       * This is the safe Message resource that has
       * already been persisted by Support service.
       */
      message,
    },
  );
}

export function emitNotificationNew({ recipientId, notification }) {
  return emitSafely(
    getUserSocketRoom(recipientId.toString()),

    SOCKET_EVENTS.NOTIFICATION_NEW,

    {
      /*
       * Already-persisted safe Notification.
       */
      notification,
    },
  );
}

/*
 * Explicit logout regenerates the Express session.
 *
 * Disconnect sockets still associated with the old
 * authenticated session immediately.
 */
export function disconnectSocketSession(sessionId) {
  if (!ioInstance || !sessionId) {
    return;
  }

  for (const socket of ioInstance.sockets.sockets.values()) {
    if (socket.data.sessionId === sessionId) {
      socket.disconnect(true);
    }
  }
}
