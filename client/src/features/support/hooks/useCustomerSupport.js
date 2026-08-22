import { useCallback, useEffect, useRef, useState } from 'react';

import {
  createMySupportConversation,
  fetchMySupportConversation,
  fetchMySupportMessages,
  markMySupportConversationRead,
  sendMySupportMessage,
} from '../../../api/supportApi.js';

import { normalizeApiError } from '../../../api/errors.js';

import { getRealtimeSocket } from '../../../realtime/socket.client.js';

import {
  SUPPORT_DEFAULT_META,
  SUPPORT_MESSAGE_LIMIT,
  SUPPORT_MESSAGE_MAX_LENGTH,
} from '../support.constants.js';

import { mergeUniqueSupportMessages } from '../support.utils.js';

export function useCustomerSupport() {
  const [conversation, setConversation] = useState(null);

  const [messages, setMessages] = useState([]);

  const [meta, setMeta] = useState(SUPPORT_DEFAULT_META);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [olderLoading, setOlderLoading] = useState(false);

  const [olderError, setOlderError] = useState(null);

  const [draft, setDraft] = useState('');

  const [sendStatus, setSendStatus] = useState('idle');

  const [sendError, setSendError] = useState(null);

  const [readError, setReadError] = useState(null);

  const [liveStatus, setLiveStatus] = useState('idle');

  const [liveError, setLiveError] = useState(null);

  const [syncError, setSyncError] = useState(null);

  const messagesEndRef = useRef(null);

  const shouldScrollToBottomRef = useRef(false);

  const markConversationRead = useCallback(async () => {
    try {
      const updatedConversation = await markMySupportConversationRead();

      setConversation(updatedConversation);

      setReadError(null);
    } catch (requestError) {
      setReadError(
        normalizeApiError(
          requestError,
          'Messages are visible, but the read state could not be updated.',
        ),
      );
    }
  }, []);

  const reconcileLatestMessages = useCallback(async () => {
    try {
      const result = await fetchMySupportMessages({
        page: 1,

        limit: SUPPORT_MESSAGE_LIMIT,
      });

      /*
       * Socket.IO is delivery
       * only.
       *
       * On reconnect, restore
       * any persisted Messages
       * missed while offline
       * through REST/MongoDB.
       */
      setMessages((current) => {
        const currentIds = new Set(current.map((message) => message.id));

        const recoveredNewMessage = result.items.some(
          (message) => !currentIds.has(message.id),
        );

        if (recoveredNewMessage) {
          shouldScrollToBottomRef.current = true;
        }

        return mergeUniqueSupportMessages(current, result.items);
      });

      /*
       * Preserve already-loaded
       * older pages.
       *
       * Refresh authoritative
       * collection totals only.
       */
      setMeta((current) => ({
        ...current,

        totalItems: result.meta.totalItems,

        totalPages: result.meta.totalPages,
      }));

      await markConversationRead();

      setSyncError(null);
    } catch (requestError) {
      setSyncError(
        normalizeApiError(
          requestError,
          'Live connection was restored, but the latest persisted messages could not be synchronized.',
        ),
      );
    }
  }, [markConversationRead]);

  const loadSupport = useCallback(async () => {
    setLoading(true);

    setError(null);

    try {
      const currentConversation = await fetchMySupportConversation();

      setConversation(currentConversation);

      /*
       * Never-started Support
       * is a normal Customer
       * state.
       *
       * Do not create an empty
       * Conversation merely by
       * visiting this page.
       */
      if (!currentConversation) {
        setMessages([]);

        setMeta(SUPPORT_DEFAULT_META);

        return;
      }

      const result = await fetchMySupportMessages({
        page: 1,

        limit: SUPPORT_MESSAGE_LIMIT,
      });

      shouldScrollToBottomRef.current = true;

      setMessages((current) =>
        mergeUniqueSupportMessages(current, result.items),
      );

      setMeta(result.meta);

      /*
       * Opening persisted
       * history marks the
       * visible conversation
       * read.
       */
      await markConversationRead();
    } catch (requestError) {
      setError(
        normalizeApiError(
          requestError,
          'Unable to load Support. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [markConversationRead]);

  useEffect(() => {
    loadSupport();
  }, [loadSupport]);

  /*
   * Scroll for:
   *
   * - initial newest history
   * - successful Customer send
   * - recovered newer history
   * - realtime Message
   *
   * Never scroll down when
   * older history is prepended.
   */
  useEffect(() => {
    if (!shouldScrollToBottomRef.current) {
      return;
    }

    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });

    shouldScrollToBottomRef.current = false;
  }, [messages]);

  /*
   * Socket.IO live delivery.
   *
   * The socket never creates
   * Support Messages.
   *
   * REST remains the write path.
   */
  useEffect(() => {
    if (!conversation?.id) {
      return undefined;
    }

    const socket = getRealtimeSocket();

    let effectActive = true;

    function joinConversationRoom() {
      if (!effectActive) {
        return;
      }

      setLiveStatus('connecting');

      setLiveError(null);

      socket.emit(
        'support:room:join',

        {
          conversationId: conversation.id,
        },

        (response) => {
          if (!effectActive) {
            return;
          }

          if (response?.success) {
            setLiveStatus('live');

            setLiveError(null);

            /*
             * Room membership is
             * restored, but
             * Socket.IO does not
             * replay events missed
             * while disconnected.
             */
            void reconcileLatestMessages();

            return;
          }

          setLiveStatus('offline');

          setLiveError({
            code: response?.error?.code ?? 'SOCKET_ROOM_JOIN_FAILED',

            message:
              response?.error?.message ??
              'Live Support updates are unavailable.',
          });
        },
      );
    }

    function handleConnect() {
      joinConversationRoom();
    }

    function handleDisconnect() {
      if (!effectActive) {
        return;
      }

      setLiveStatus('offline');
    }

    function handleConnectError(socketError) {
      if (!effectActive) {
        return;
      }

      setLiveStatus('offline');

      setLiveError({
        code: socketError?.data?.code ?? 'SOCKET_CONNECTION_FAILED',

        message:
          socketError?.message ?? 'Live Support updates are unavailable.',
      });
    }

    function handleNewMessage(payload) {
      if (
        !effectActive ||
        payload?.conversationId !== conversation.id ||
        !payload?.message?.id
      ) {
        return;
      }

      shouldScrollToBottomRef.current = true;

      /*
       * The server emits an
       * already-persisted Message.
       *
       * Customer REST sends may
       * also arrive through the
       * socket, so merge by ID.
       */
      setMessages((current) =>
        mergeUniqueSupportMessages(current, [payload.message]),
      );

      /*
       * Customer sends already
       * advance Customer read
       * state on the backend.
       *
       * Only incoming Admin
       * Messages need this.
       */
      if (payload.message.senderRole === 'admin') {
        void markConversationRead();
      }
    }

    socket.on('connect', handleConnect);

    socket.on('disconnect', handleDisconnect);

    socket.on('connect_error', handleConnectError);

    socket.on('support:message:new', handleNewMessage);

    if (socket.connected) {
      joinConversationRoom();
    } else {
      setLiveStatus('connecting');

      socket.connect();
    }

    return () => {
      effectActive = false;

      if (socket.connected) {
        socket.emit(
          'support:room:leave',

          {
            conversationId: conversation.id,
          },
        );
      }

      socket.off('connect', handleConnect);

      socket.off('disconnect', handleDisconnect);

      socket.off('connect_error', handleConnectError);

      socket.off('support:message:new', handleNewMessage);

      socket.disconnect();
    };
  }, [conversation?.id, markConversationRead, reconcileLatestMessages]);

  async function loadOlder() {
    if (olderLoading || meta.page >= meta.totalPages) {
      return;
    }

    setOlderLoading(true);

    setOlderError(null);

    try {
      const nextPage = meta.page + 1;

      const result = await fetchMySupportMessages({
        page: nextPage,

        limit: SUPPORT_MESSAGE_LIMIT,
      });

      /*
       * These are older Messages.
       *
       * Do not enable the
       * scroll-to-bottom flag.
       */
      setMessages((current) =>
        mergeUniqueSupportMessages(result.items, current),
      );

      setMeta(result.meta);
    } catch (requestError) {
      setOlderError(
        normalizeApiError(
          requestError,
          'Unable to load earlier messages. Please try again.',
        ),
      );
    } finally {
      setOlderLoading(false);
    }
  }

  function handleDraftChange(event) {
    setDraft(event.target.value);

    if (sendStatus !== 'sending') {
      setSendStatus('idle');

      setSendError(null);
    }
  }

  async function sendMessage(event) {
    event.preventDefault();

    if (sendStatus === 'sending') {
      return;
    }

    const text = draft.trim();

    if (!text) {
      setSendStatus('failed');

      setSendError({
        code: 'SUPPORT_MESSAGE_INVALID',

        message: 'Enter a message before sending.',
      });

      return;
    }

    if (text.length > SUPPORT_MESSAGE_MAX_LENGTH) {
      setSendStatus('failed');

      setSendError({
        code: 'SUPPORT_MESSAGE_INVALID',

        message: `Message must be ${SUPPORT_MESSAGE_MAX_LENGTH} characters or fewer.`,
      });

      return;
    }

    setSendStatus('sending');

    setSendError(null);

    try {
      let activeConversation = conversation;

      /*
       * First actual send
       * creates/reuses the
       * persistent Conversation.
       */
      if (!activeConversation) {
        activeConversation = await createMySupportConversation();

        setConversation(activeConversation);
      }

      /*
       * Authoritative write path.
       */
      const message = await sendMySupportMessage(text);

      shouldScrollToBottomRef.current = true;

      setMessages((current) => mergeUniqueSupportMessages(current, [message]));

      /*
       * Keep the local
       * Conversation timestamps
       * synchronized with the
       * successful REST result.
       */
      setConversation((current) => ({
        ...(current ?? activeConversation),

        lastMessageAt: message.createdAt,

        customerLastReadAt: message.createdAt,
      }));

      setDraft('');

      setSendStatus('sent');
    } catch (requestError) {
      /*
       * Draft deliberately remains
       * untouched so Customer can
       * retry without retyping.
       */
      setSendStatus('failed');

      setSendError(
        normalizeApiError(
          requestError,
          'Your message could not be sent. Please try again.',
        ),
      );
    }
  }

  return {
    conversation,

    messages,

    meta,

    loading,
    error,

    olderLoading,
    olderError,

    draft,

    sendStatus,
    sendError,

    readError,

    liveStatus,
    liveError,

    syncError,

    messagesEndRef,

    canLoadOlder: meta.totalPages > 0 && meta.page < meta.totalPages,

    sending: sendStatus === 'sending',

    loadSupport,

    loadOlder,

    handleDraftChange,

    sendMessage,
  };
}
