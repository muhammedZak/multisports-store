import { useCallback, useEffect, useState } from 'react';

import {
  fetchMyNotifications,
  markMyNotificationRead,
} from '../../../api/notificationApi.js';

import { normalizeApiError } from '../../../api/errors.js';

import {
  NOTIFICATION_DEFAULT_META,
  NOTIFICATION_DEFAULT_QUERY,
  NOTIFICATION_EMPTY_FILTERS,
} from '../notification.constants.js';

export function useMyNotifications() {
  const [notifications, setNotifications] = useState([]);

  const [filterForm, setFilterForm] = useState(NOTIFICATION_EMPTY_FILTERS);

  const [query, setQuery] = useState(NOTIFICATION_DEFAULT_QUERY);

  const [meta, setMeta] = useState(NOTIFICATION_DEFAULT_META);

  const [unreadCount, setUnreadCount] = useState(0);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [markingNotificationId, setMarkingNotificationId] = useState(null);

  const [actionError, setActionError] = useState(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);

    setError(null);

    try {
      const result = await fetchMyNotifications(query);

      setNotifications(result.items);

      setUnreadCount(result.unreadCount);

      setMeta(result.meta);
    } catch (requestError) {
      setError(
        normalizeApiError(
          requestError,
          'Unable to load your Notifications. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

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
      ...NOTIFICATION_DEFAULT_QUERY,
      ...filterForm,
      page: 1,
    });
  }

  function resetFilters() {
    setFilterForm(NOTIFICATION_EMPTY_FILTERS);

    setQuery(NOTIFICATION_DEFAULT_QUERY);
  }

  function changePage(page) {
    setQuery((current) => ({
      ...current,
      page,
    }));
  }

  async function markRead(notification) {
    if (notification.readAt || markingNotificationId) {
      return;
    }

    setMarkingNotificationId(notification.id);

    setActionError(null);

    try {
      await markMyNotificationRead(notification.id);

      /*
       * When filtering to unread
       * Notifications, a marked
       * Notification leaves the
       * current result.
       *
       * Preserve the existing
       * later-page fallback.
       */
      if (
        query.readStatus === 'unread' &&
        notifications.length === 1 &&
        meta.page > 1
      ) {
        setQuery((current) => ({
          ...current,

          page: current.page - 1,
        }));

        return;
      }

      /*
       * Refetch backend authority
       * for:
       *
       * - read state
       * - unreadCount
       * - current pagination
       */
      await loadNotifications();
    } catch (requestError) {
      setActionError(
        normalizeApiError(
          requestError,
          'Unable to mark this Notification as read. Please try again.',
        ),
      );
    } finally {
      setMarkingNotificationId(null);
    }
  }

  return {
    notifications,

    filterForm,
    query,

    meta,
    unreadCount,

    loading,
    error,

    actionError,

    markingNotificationId,

    filtersActive: Boolean(query.type || query.readStatus),

    loadNotifications,

    handleFilterChange,

    applyFilters,
    resetFilters,
    changePage,

    markRead,
  };
}
