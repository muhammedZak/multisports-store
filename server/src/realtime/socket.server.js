import { Server } from 'socket.io';

import { corsOptions } from '../config/cors.js';

import { sessionMiddleware } from '../config/session.js';

import { getSessionUser } from '../modules/auth/auth.service.js';

import { authorizeSupportConversationSocketAccess } from '../modules/support/support.service.js';

import { AppError } from '../utils/AppError.js';

import {
  getSupportSocketRoom,
  getUserSocketRoom,
  SOCKET_EVENTS,
} from './socket.constants.js';

import { registerSocketServer } from './socket.emitter.js';

const SESSION_RELOAD_INTERVAL_MS = 30 * 1000;

function createAuthenticationError() {
  return new AppError(401, 'AUTH_REQUIRED', 'Authentication is required.');
}

function toSocketConnectionError(error) {
  const socketError = new Error(
    error?.message ?? 'Socket authentication failed.',
  );

  socketError.data = {
    code: error?.code ?? 'AUTH_REQUIRED',
  };

  return socketError;
}

function toSocketResponseError(error) {
  return {
    success: false,

    error: {
      code: error?.code ?? 'SOCKET_REQUEST_FAILED',

      message: error?.message ?? 'Socket request failed.',
    },
  };
}

function sendAcknowledgement(acknowledgement, payload) {
  if (typeof acknowledgement === 'function') {
    acknowledgement(payload);
  }
}

function getConversationId(payload) {
  if (
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload) ||
    typeof payload.conversationId !== 'string' ||
    !payload.conversationId.trim()
  ) {
    throw new AppError(
      422,
      'VALIDATION_ERROR',
      'A valid Support conversation ID is required.',
    );
  }

  return payload.conversationId.trim();
}

async function loadSocketUser(socket) {
  const userId = socket.request.session?.userId;

  if (!userId) {
    throw createAuthenticationError();
  }

  const user = await getSessionUser(userId);

  if (!user) {
    throw createAuthenticationError();
  }

  return user;
}

function reloadSocketSession(socket) {
  return new Promise((resolve, reject) => {
    const session = socket.request.session;

    if (!session || typeof session.reload !== 'function') {
      reject(createAuthenticationError());

      return;
    }

    /*
     * express-session replaces
     * socket.request.session during reload.
     *
     * Always read socket.request.session again
     * after this callback finishes.
     */
    session.reload((error) => {
      if (error) {
        reject(createAuthenticationError());

        return;
      }

      resolve();
    });
  });
}

async function refreshSocketAuthentication(socket) {
  await reloadSocketSession(socket);

  const user = await loadSocketUser(socket);

  const previousUser = socket.data.user;

  /*
   * If identity or role changed while this Socket
   * existed, reconnect and rebuild room membership
   * from fresh authorization.
   */
  if (
    previousUser &&
    (previousUser.id !== user.id || previousUser.role !== user.role)
  ) {
    throw createAuthenticationError();
  }

  socket.data.user = user;

  return user;
}

export function initializeSocketServer(httpServer) {
  const io = new Server(httpServer, {
    /*
     * Reuse the exact same trusted-origin policy
     * as the Express application.
     */
    cors: corsOptions,
  });

  /*
   * Share the same express-session state with the
   * Socket.IO Engine.IO requests.
   *
   * No JWT or second authentication system.
   */
  io.engine.use(sessionMiddleware);

  /*
   * Authenticate every new Socket connection from
   * the shared application session.
   */
  io.use(async (socket, next) => {
    try {
      const user = await loadSocketUser(socket);

      socket.data.user = user;

      socket.data.sessionId = socket.request.session.id;

      next();
    } catch (error) {
      next(toSocketConnectionError(error));
    }
  });

  registerSocketServer(io);

  io.on('connection', (socket) => {
    const user = socket.data.user;

    /*
     * Every authenticated Socket automatically joins
     * their own private delivery room.
     *
     * Notifications use this room.
     */
    socket.join(getUserSocketRoom(user.id));

    /*
     * Before every client-originated Socket event,
     * reload the server-side session.
     *
     * This prevents a destroyed/expired session from
     * continuing to perform protected Socket actions.
     */
    socket.use((packet, next) => {
      refreshSocketAuthentication(socket)
        .then(() => {
          next();
        })
        .catch((error) => {
          next(toSocketConnectionError(error));

          socket.disconnect(true);
        });
    });

    /*
     * An idle Socket may receive events without
     * sending packets itself.
     *
     * Periodically reload the session so an expired
     * login cannot remain in protected rooms forever.
     */
    const sessionReloadTimer = setInterval(() => {
      refreshSocketAuthentication(socket).catch(() => {
        socket.disconnect(true);
      });
    }, SESSION_RELOAD_INTERVAL_MS);

    socket.on(
      SOCKET_EVENTS.SUPPORT_ROOM_JOIN,

      async (payload, acknowledgement) => {
        try {
          const conversationId = getConversationId(payload);

          /*
           * Session was refreshed by socket.use().
           *
           * Conversation access is still checked
           * against the Support domain here.
           */
          await authorizeSupportConversationSocketAccess({
            user: socket.data.user,
            conversationId,
          });

          await socket.join(getSupportSocketRoom(conversationId));

          sendAcknowledgement(acknowledgement, {
            success: true,

            data: {
              conversationId,
            },
          });
        } catch (error) {
          sendAcknowledgement(acknowledgement, toSocketResponseError(error));
        }
      },
    );

    socket.on(
      SOCKET_EVENTS.SUPPORT_ROOM_LEAVE,

      async (payload, acknowledgement) => {
        try {
          const conversationId = getConversationId(payload);

          /*
           * Leaving a room cannot grant additional
           * access, so no ownership query is needed.
           */
          await socket.leave(getSupportSocketRoom(conversationId));

          sendAcknowledgement(acknowledgement, {
            success: true,

            data: {
              conversationId,
            },
          });
        } catch (error) {
          sendAcknowledgement(acknowledgement, toSocketResponseError(error));
        }
      },
    );

    socket.on('disconnect', () => {
      clearInterval(sessionReloadTimer);
    });
  });

  return io;
}
