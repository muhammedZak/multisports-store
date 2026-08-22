import { useCallback, useEffect, useState } from 'react';

import {
  fetchMyNotifications,
  markMyNotificationRead,
} from '../../../api/notificationApi.js';

import { normalizeApiError } from '../../../api/errors.js';

import {
  ADMIN_NOTIFICATION_DEFAULT_META,
  ADMIN_NOTIFICATION_DEFAULT_QUERY,
  ADMIN_NOTIFICATION_EMPTY_FILTERS,
} from '../adminNotification.constants.js';

export function useAdminNotifications() {
  const [notifications, setNotifications] = useState([]);

  const [filterForm, setFilterForm] = useState(
    ADMIN_NOTIFICATION_EMPTY_FILTERS,
  );

  const [query, setQuery] = useState(ADMIN_NOTIFICATION_DEFAULT_QUERY);

  const [meta, setMeta] = useState(ADMIN_NOTIFICATION_DEFAULT_META);

  const [unreadCount, setUnreadCount] = useState(0);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [actionError, setActionError] = useState(null);

  const [markingNotificationId, setMarkingNotificationId] = useState(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);

    setError(null);

    try {
      const result = await fetchMyNotifications(query);

      setNotifications(result.items);

      setUnreadCount(result.unreadCount);

      setMeta(result.meta);
    } catch (requestError) {
      setNotifications([]);

      setError(
        normalizeApiError(
          requestError,

          'Unable to load Admin Notifications. Please try again.',
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
      ...ADMIN_NOTIFICATION_DEFAULT_QUERY,

      ...filterForm,

      page: 1,
    });
  }

  function resetFilters() {
    setFilterForm(ADMIN_NOTIFICATION_EMPTY_FILTERS);

    setQuery(ADMIN_NOTIFICATION_DEFAULT_QUERY);
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
