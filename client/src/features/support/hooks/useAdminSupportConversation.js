import { useCallback, useEffect, useRef, useState } from 'react';

import {
  fetchAdminSupportConversation,
  fetchAdminSupportMessages,
  markAdminSupportConversationRead,
  sendAdminSupportMessage,
} from '../../../api/supportApi.js';

import { normalizeApiError } from '../../../api/errors.js';

import { getRealtimeSocket } from '../../../realtime/socket.client.js';

import {
  SUPPORT_DEFAULT_META,
  SUPPORT_MESSAGE_LIMIT,
  SUPPORT_MESSAGE_MAX_LENGTH,
} from '../support.constants.js';

import { mergeUniqueSupportMessages } from '../support.utils.js';

export function useAdminSupportConversation(conversationId) {
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
      const updatedConversation =
        await markAdminSupportConversationRead(conversationId);

      setConversation(updatedConversation);

      setReadError(null);
    } catch (requestError) {
      setReadError(
        normalizeApiError(
          requestError,

          'Messages are visible, but the Admin read state could not be updated.',
        ),
      );
    }
  }, [conversationId]);

  const reconcileLatestMessages = useCallback(async () => {
    try {
      const result = await fetchAdminSupportMessages(
        conversationId,

        {
          page: 1,

          limit: SUPPORT_MESSAGE_LIMIT,
        },
      );

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
       * Preserve any already
       * loaded older pages while
       * refreshing authoritative
       * totals.
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
  }, [conversationId, markConversationRead]);

  const loadConversation = useCallback(async () => {
    setLoading(true);

    setError(null);

    try {
      const [conversationResult, messageResult] = await Promise.all([
        fetchAdminSupportConversation(conversationId),

        fetchAdminSupportMessages(
          conversationId,

          {
            page: 1,

            limit: SUPPORT_MESSAGE_LIMIT,
          },
        ),
      ]);

      setConversation(conversationResult);

      shouldScrollToBottomRef.current = true;

      setMessages((current) =>
        mergeUniqueSupportMessages(current, messageResult.items),
      );

      setMeta(messageResult.meta);

      await markConversationRead();
    } catch (requestError) {
      setError(
        normalizeApiError(
          requestError,

          'Unable to load this Support conversation.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [conversationId, markConversationRead]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

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
   * Socket.IO is delivery only.
   *
   * The REST send endpoint
   * persists Support Messages.
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

            void reconcileLatestMessages();

            return;
          }

          setLiveStatus('offline');

          setLiveError(
            response?.error?.message ?? 'Live Support updates are unavailable.',
          );
        },
      );
    }

    function handleConnect() {
      joinConversationRoom();
    }

    function handleDisconnect() {
      if (effectActive) {
        setLiveStatus('offline');
      }
    }

    function handleConnectError(socketError) {
      if (!effectActive) {
        return;
      }

      setLiveStatus('offline');

      setLiveError(
        socketError?.message ?? 'Live Support updates are unavailable.',
      );
    }

    function handleNewMessage(payload) {
      if (
        !effectActive ||
        payload?.conversationId !== conversation.id ||
        !payload?.message?.id
      ) {
        return;
      }

      const message = payload.message;

      shouldScrollToBottomRef.current = true;

      setMessages((current) => mergeUniqueSupportMessages(current, [message]));

      setConversation((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,

          lastMessageAt: message.createdAt,

          unread: message.senderRole === 'customer' ? true : current.unread,
        };
      });

      /*
       * The Admin is actively
       * viewing this conversation.
       */
      if (message.senderRole === 'customer') {
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
      const result = await fetchAdminSupportMessages(
        conversationId,

        {
          page: meta.page + 1,

          limit: SUPPORT_MESSAGE_LIMIT,
        },
      );

      /*
       * Older history does not
       * set the scroll-to-bottom
       * flag.
       */
      setMessages((current) =>
        mergeUniqueSupportMessages(result.items, current),
      );

      setMeta(result.meta);
    } catch (requestError) {
      setOlderError(
        normalizeApiError(
          requestError,

          'Unable to load earlier messages.',
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
      const message = await sendAdminSupportMessage(
        conversationId,

        text,
      );

      shouldScrollToBottomRef.current = true;

      setMessages((current) => mergeUniqueSupportMessages(current, [message]));

      setConversation((current) => ({
        ...current,

        lastMessageAt: message.createdAt,

        adminLastReadAt: message.createdAt,

        unread: false,
      }));

      setDraft('');

      setSendStatus('sent');
    } catch (requestError) {
      /*
       * Preserve draft for retry.
       */
      setSendStatus('failed');

      setSendError(
        normalizeApiError(
          requestError,

          'Your Support reply could not be sent. Please try again.',
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

    canLoadOlder: meta.page < meta.totalPages,

    sending: sendStatus === 'sending',

    loadConversation,

    loadOlder,

    handleDraftChange,

    sendMessage,
  };
}
