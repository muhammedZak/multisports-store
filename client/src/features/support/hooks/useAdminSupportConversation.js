import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

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

  const [conversationStateId, setConversationStateId] =
    useState(conversationId);

  const messagesEndRef = useRef(null);

  const shouldScrollToBottomRef = useRef(false);

  const activeConversationIdRef = useRef(conversationId);

  const initialLoadRequestIdRef = useRef(0);

  /*
   * Invalidate async work from the
   * previous route before the browser
   * can paint the new conversation.
   */
  useLayoutEffect(() => {
    activeConversationIdRef.current = conversationId;
  }, [conversationId]);

  const markConversationRead = useCallback(async () => {
    const requestConversationId = conversationId;

    try {
      const updatedConversation =
        await markAdminSupportConversationRead(requestConversationId);

      if (activeConversationIdRef.current !== requestConversationId) {
        return;
      }

      setConversation(updatedConversation);

      setReadError(null);
    } catch (requestError) {
      if (activeConversationIdRef.current !== requestConversationId) {
        return;
      }

      setReadError(
        normalizeApiError(
          requestError,

          'Messages are visible, but the Admin read state could not be updated.',
        ),
      );
    }
  }, [conversationId]);

  const reconcileLatestMessages = useCallback(async () => {
    const requestConversationId = conversationId;

    try {
      const result = await fetchAdminSupportMessages(
        requestConversationId,

        {
          page: 1,

          limit: SUPPORT_MESSAGE_LIMIT,
        },
      );

      if (activeConversationIdRef.current !== requestConversationId) {
        return;
      }

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

      if (activeConversationIdRef.current !== requestConversationId) {
        return;
      }

      setSyncError(null);
    } catch (requestError) {
      if (activeConversationIdRef.current !== requestConversationId) {
        return;
      }

      setSyncError(
        normalizeApiError(
          requestError,

          'Live connection was restored, but the latest persisted messages could not be synchronized.',
        ),
      );
    }
  }, [conversationId, markConversationRead]);

  const loadConversation = useCallback(async (options = {}) => {
    const requestConversationId = conversationId;

    const requestId = initialLoadRequestIdRef.current + 1;

    initialLoadRequestIdRef.current = requestId;

    const resetRouteState = options?.resetRouteState === true;

    if (resetRouteState) {
      setConversationStateId(requestConversationId);

      setConversation(null);

      setMessages([]);

      setMeta(SUPPORT_DEFAULT_META);

      setOlderLoading(false);
      setOlderError(null);

      setDraft('');

      setSendStatus('idle');
      setSendError(null);

      setReadError(null);

      setLiveStatus('idle');
      setLiveError(null);

      setSyncError(null);

      shouldScrollToBottomRef.current = false;
    }

    setLoading(true);

    setError(null);

    try {
      const [conversationResult, messageResult] = await Promise.all([
        fetchAdminSupportConversation(requestConversationId),

        fetchAdminSupportMessages(
          requestConversationId,

          {
            page: 1,

            limit: SUPPORT_MESSAGE_LIMIT,
          },
        ),
      ]);

      if (
        activeConversationIdRef.current !== requestConversationId ||
        initialLoadRequestIdRef.current !== requestId
      ) {
        return;
      }

      setConversation(conversationResult);

      shouldScrollToBottomRef.current = true;

      /*
       * The first page establishes this
       * route's isolated message baseline.
       * Reconciliation paths still merge.
       */
      setMessages(messageResult.items);

      setMeta(messageResult.meta);

      await markConversationRead();
    } catch (requestError) {
      if (
        activeConversationIdRef.current !== requestConversationId ||
        initialLoadRequestIdRef.current !== requestId
      ) {
        return;
      }

      setError(
        normalizeApiError(
          requestError,

          'Unable to load this Support conversation.',
        ),
      );
    } finally {
      if (
        activeConversationIdRef.current === requestConversationId &&
        initialLoadRequestIdRef.current === requestId
      ) {
        setLoading(false);
      }
    }
  }, [conversationId, markConversationRead]);

  useEffect(() => {
    void loadConversation({
      resetRouteState: true,
    });
  }, [conversationId, loadConversation]);

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

    const roomConversationId = conversation.id;

    function joinConversationRoom() {
      if (
        !effectActive ||
        activeConversationIdRef.current !== roomConversationId
      ) {
        return;
      }

      setLiveStatus('connecting');

      setLiveError(null);

      socket.emit(
        'support:room:join',

        {
          conversationId: roomConversationId,
        },

        (response) => {
          if (
            !effectActive ||
            activeConversationIdRef.current !== roomConversationId
          ) {
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
      if (
        effectActive &&
        activeConversationIdRef.current === roomConversationId
      ) {
        setLiveStatus('offline');
      }
    }

    function handleConnectError(socketError) {
      if (!effectActive) {
        return;
      }

      if (activeConversationIdRef.current !== roomConversationId) {
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
        activeConversationIdRef.current !== roomConversationId ||
        payload?.conversationId !== roomConversationId ||
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
            conversationId: roomConversationId,
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

    const requestConversationId = conversationId;

    setOlderLoading(true);

    setOlderError(null);

    try {
      const result = await fetchAdminSupportMessages(
        requestConversationId,

        {
          page: meta.page + 1,

          limit: SUPPORT_MESSAGE_LIMIT,
        },
      );

      if (activeConversationIdRef.current !== requestConversationId) {
        return;
      }

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
      if (activeConversationIdRef.current !== requestConversationId) {
        return;
      }

      setOlderError(
        normalizeApiError(
          requestError,

          'Unable to load earlier messages.',
        ),
      );
    } finally {
      if (activeConversationIdRef.current === requestConversationId) {
        setOlderLoading(false);
      }
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

    const requestConversationId = conversationId;

    try {
      const message = await sendAdminSupportMessage(
        requestConversationId,

        text,
      );

      if (activeConversationIdRef.current !== requestConversationId) {
        return;
      }

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
      if (activeConversationIdRef.current !== requestConversationId) {
        return;
      }

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

  /*
   * Passive route-reset effects run after
   * render. Mask the previous route's state
   * during that handoff so it cannot flash
   * beneath the new conversation URL.
   */
  const routeStateIsCurrent =
    conversationStateId === conversationId;

  return {
    conversation: routeStateIsCurrent ? conversation : null,

    messages: routeStateIsCurrent ? messages : [],

    meta: routeStateIsCurrent ? meta : SUPPORT_DEFAULT_META,

    loading: routeStateIsCurrent ? loading : true,
    error: routeStateIsCurrent ? error : null,

    olderLoading: routeStateIsCurrent ? olderLoading : false,
    olderError: routeStateIsCurrent ? olderError : null,

    draft: routeStateIsCurrent ? draft : '',

    sendStatus: routeStateIsCurrent ? sendStatus : 'idle',
    sendError: routeStateIsCurrent ? sendError : null,

    readError: routeStateIsCurrent ? readError : null,

    liveStatus: routeStateIsCurrent ? liveStatus : 'idle',
    liveError: routeStateIsCurrent ? liveError : null,

    syncError: routeStateIsCurrent ? syncError : null,

    messagesEndRef,

    canLoadOlder: routeStateIsCurrent && meta.page < meta.totalPages,

    sending: routeStateIsCurrent && sendStatus === 'sending',

    loadConversation,

    loadOlder,

    handleDraftChange,

    sendMessage,
  };
}
