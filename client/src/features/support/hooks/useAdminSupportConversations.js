import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchAdminSupportConversations } from '../../../api/supportApi.js';

import { normalizeApiError } from '../../../api/errors.js';

import { getRealtimeSocket } from '../../../realtime/socket.client.js';

import {
  ADMIN_SUPPORT_DEFAULT_META,
  ADMIN_SUPPORT_DEFAULT_QUERY,
  ADMIN_SUPPORT_EMPTY_FILTERS,
} from '../adminSupport.constants.js';

export function useAdminSupportConversations() {
  const [filterForm, setFilterForm] = useState(ADMIN_SUPPORT_EMPTY_FILTERS);

  const [query, setQuery] = useState(ADMIN_SUPPORT_DEFAULT_QUERY);

  const queryRef = useRef(query);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  const [conversations, setConversations] = useState([]);

  const [meta, setMeta] = useState(ADMIN_SUPPORT_DEFAULT_META);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [liveStatus, setLiveStatus] = useState('idle');

  const [liveError, setLiveError] = useState(null);

  const loadConversations = useCallback(async () => {
    setLoading(true);

    setError(null);

    try {
      const result = await fetchAdminSupportConversations(query);

      setConversations(result.items);

      setMeta(result.meta);
    } catch (requestError) {
      setConversations([]);

      setError(
        normalizeApiError(
          requestError,

          'Unable to load Support conversations. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [query]);

  const refreshConversationsSilently = useCallback(async () => {
    try {
      const result = await fetchAdminSupportConversations(queryRef.current);

      setConversations(result.items);

      setMeta(result.meta);

      setLiveError(null);
    } catch {
      /*
       * Keep currently rendered
       * persisted REST content
       * when background live
       * synchronization fails.
       */
      setLiveError(
        'A live Support update could not be synchronized. Refresh if needed.',
      );
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  /*
   * Admins receive persisted
   * Support Notifications through
   * notification:new.
   *
   * Socket.IO only tells us that
   * something changed.
   *
   * REST reloads authoritative
   * inbox state.
   */
  useEffect(() => {
    const socket = getRealtimeSocket();

    let effectActive = true;

    function handleConnect() {
      if (!effectActive) {
        return;
      }

      setLiveStatus('live');

      setLiveError(null);

      /*
       * Recover any persisted
       * Support activity missed
       * while disconnected.
       */
      void refreshConversationsSilently();
    }

    function handleDisconnect() {
      if (!effectActive) {
        return;
      }

      setLiveStatus('offline');
    }

    function handleConnectError() {
      if (!effectActive) {
        return;
      }

      setLiveStatus('offline');
    }

    function handleNotification(payload) {
      if (!effectActive) {
        return;
      }

      const notification = payload?.notification;

      if (
        notification?.type !== 'support' &&
        notification?.resourceType !== 'support'
      ) {
        return;
      }

      void refreshConversationsSilently();
    }

    socket.on('connect', handleConnect);

    socket.on('disconnect', handleDisconnect);

    socket.on('connect_error', handleConnectError);

    socket.on('notification:new', handleNotification);

    if (socket.connected) {
      setLiveStatus('live');

      void refreshConversationsSilently();
    } else {
      setLiveStatus('connecting');

      socket.connect();
    }

    return () => {
      effectActive = false;

      socket.off('connect', handleConnect);

      socket.off('disconnect', handleDisconnect);

      socket.off('connect_error', handleConnectError);

      socket.off('notification:new', handleNotification);

      socket.disconnect();
    };
  }, [refreshConversationsSilently]);

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilterForm((current) => ({
      ...current,

      [name]: value,
    }));
  }

  function applyFilters(event) {
    event.preventDefault();

    setQuery({
      ...ADMIN_SUPPORT_DEFAULT_QUERY,

      ...filterForm,

      q: filterForm.q.trim(),

      page: 1,
    });
  }

  function resetFilters() {
    setFilterForm(ADMIN_SUPPORT_EMPTY_FILTERS);

    setQuery(ADMIN_SUPPORT_DEFAULT_QUERY);
  }

  function changePage(page) {
    setQuery((current) => ({
      ...current,

      page,
    }));
  }

  return {
    conversations,

    filterForm,

    meta,

    loading,
    error,

    liveStatus,
    liveError,

    filtersActive: Boolean(query.q) || query.unread !== '',

    loadConversations,

    handleFilterChange,
    applyFilters,
    resetFilters,

    changePage,
  };
}
