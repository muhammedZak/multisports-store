import { useCallback, useEffect, useState } from 'react';

import { Link } from 'react-router';

import { normalizeApiError } from '../../api/errors.js';

import {
  fetchMyNotifications,
  markMyNotificationRead,
} from '../../api/notificationApi.js';

const EMPTY_FILTERS = {
  type: '',
  readStatus: '',
};

const DEFAULT_QUERY = {
  ...EMPTY_FILTERS,
  page: 1,
  limit: 20,
};

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const NOTIFICATION_TYPE_STYLES = {
  order: 'bg-blue-50 text-blue-700',
  payment: 'bg-green-50 text-green-700',
  refund: 'bg-amber-50 text-amber-700',
  inventory: 'bg-neutral-100 text-neutral-700',
  support: 'bg-indigo-50 text-indigo-700',
};

function formatLabel(value) {
  if (!value) {
    return 'Notification';
  }

  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getResourceLink(notification) {
  if (!notification.resourceId) {
    return null;
  }

  if (notification.resourceType === 'order') {
    return `/account/orders/${notification.resourceId}`;
  }

  if (notification.resourceType === 'refund') {
    return `/account/refunds/${notification.resourceId}`;
  }

  if (notification.resourceType === 'support') {
    /*
     * A Customer has exactly one persistent
     * Support Conversation, so Support
     * Notifications open that Conversation.
     */
    return '/account/support';
  }

  /*
   * There is still no Customer Payment-detail
   * route.
   */
  return null;
}

function getResourceLinkText(notification) {
  if (notification.resourceType === 'order') {
    return 'View Order';
  }

  if (notification.resourceType === 'refund') {
    return 'View Refund';
  }

  if (notification.resourceType === 'support') {
    return 'Open Support';
  }

  return 'View details';
}

function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);

  const [filterForm, setFilterForm] = useState(EMPTY_FILTERS);

  const [query, setQuery] = useState(DEFAULT_QUERY);

  const [meta, setMeta] = useState({
    page: 1,
    limit: 20,
    totalItems: 0,
    totalPages: 0,
  });

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadNotifications();
  }, [loadNotifications]);

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilterForm((current) => ({
      ...current,

      [name]: value,
    }));
  }

  function handleFilterSubmit(event) {
    event.preventDefault();

    setQuery({
      ...DEFAULT_QUERY,

      ...filterForm,

      page: 1,
    });
  }

  function handleResetFilters() {
    setFilterForm(EMPTY_FILTERS);

    setQuery(DEFAULT_QUERY);
  }

  function changePage(page) {
    setQuery((current) => ({
      ...current,

      page,
    }));
  }

  async function handleMarkRead(notification) {
    if (notification.readAt || markingNotificationId) {
      return;
    }

    setMarkingNotificationId(notification.id);

    setActionError(null);

    try {
      await markMyNotificationRead(notification.id);

      /*
       * When viewing only unread Notifications,
       * the marked item no longer belongs in this result.
       *
       * If it was the last item on a page after page 1,
       * move back one page instead of leaving the Customer
       * on an empty out-of-range page.
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

  const filtersActive = Boolean(query.type || query.readStatus);

  return (
    <main className='mx-auto max-w-5xl p-6'>
      <Link
        to='/account'
        className='text-sm font-medium underline underline-offset-4'>
        Back to profile
      </Link>

      <div className='mt-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <p className='text-sm font-medium uppercase tracking-[0.2em] text-neutral-500'>
            My account
          </p>

          <h1 className='mt-3 text-3xl font-semibold'>Notifications</h1>

          <p className='mt-3 max-w-2xl text-sm leading-6 text-neutral-600'>
            Keep track of important Order, Payment, Refund, and account
            activity.
          </p>
        </div>

        <div className='w-fit border border-neutral-200 px-4 py-3'>
          <p className='text-xs font-medium uppercase tracking-wide text-neutral-500'>
            Unread
          </p>

          <p className='mt-1 text-2xl font-semibold'>{unreadCount}</p>
        </div>
      </div>

      <form
        onSubmit={handleFilterSubmit}
        className='mt-8 grid gap-4 border border-neutral-200 p-4 sm:grid-cols-2'>
        <div>
          <label htmlFor='type' className='mb-2 block text-sm font-medium'>
            Notification type
          </label>

          <select
            id='type'
            name='type'
            value={filterForm.type}
            onChange={handleFilterChange}
            className='w-full border border-neutral-300 bg-white px-3 py-2.5 outline-none focus:border-black'>
            <option value=''>All types</option>
            <option value='order'>Orders</option>
            <option value='payment'>Payments</option>
            <option value='refund'>Refunds</option>
            <option value='support'>Support</option>
          </select>
        </div>

        <div>
          <label
            htmlFor='readStatus'
            className='mb-2 block text-sm font-medium'>
            Read status
          </label>

          <select
            id='readStatus'
            name='readStatus'
            value={filterForm.readStatus}
            onChange={handleFilterChange}
            className='w-full border border-neutral-300 bg-white px-3 py-2.5 outline-none focus:border-black'>
            <option value=''>All Notifications</option>
            <option value='unread'>Unread</option>
            <option value='read'>Read</option>
          </select>
        </div>

        <div className='flex flex-wrap gap-3 sm:col-span-2'>
          <button
            type='submit'
            disabled={loading}
            className='bg-black px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50'>
            Apply
          </button>

          <button
            type='button'
            disabled={loading}
            onClick={handleResetFilters}
            className='border border-neutral-300 px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50'>
            Reset
          </button>
        </div>
      </form>

      {error && (
        <div
          role='alert'
          className='mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          {error.message}
        </div>
      )}

      {actionError && (
        <div
          role='alert'
          className='mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          {actionError.message}
        </div>
      )}

      {loading && (
        <section className='mt-6 border border-neutral-200 p-8'>
          <p className='text-sm text-neutral-600'>
            Loading your Notifications...
          </p>
        </section>
      )}

      {!loading && error && notifications.length === 0 && (
        <button
          type='button'
          onClick={loadNotifications}
          className='mt-4 bg-black px-4 py-2 text-sm font-medium text-white'>
          Try again
        </button>
      )}

      {!loading && !error && notifications.length === 0 && (
        <section className='mt-6 border border-neutral-200 p-8 text-center'>
          <h2 className='text-lg font-semibold'>
            {filtersActive
              ? 'No matching Notifications'
              : 'No Notifications yet'}
          </h2>

          <p className='mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-600'>
            {filtersActive
              ? 'No Notifications match the selected type and read status.'
              : 'Important activity connected to your account will appear here.'}
          </p>

          {filtersActive && (
            <button
              type='button'
              onClick={handleResetFilters}
              className='mt-5 border border-neutral-300 px-5 py-3 text-sm font-medium'>
              Clear filters
            </button>
          )}
        </section>
      )}

      {!loading && notifications.length > 0 && (
        <>
          <section className='mt-6 space-y-3'>
            {notifications.map((notification) => {
              const isUnread = !notification.readAt;

              const resourceLink = getResourceLink(notification);

              const marking = markingNotificationId === notification.id;

              return (
                <article
                  key={notification.id}
                  className={[
                    'border p-5 sm:p-6',
                    isUnread
                      ? 'border-black bg-neutral-50'
                      : 'border-neutral-200 bg-white',
                  ].join(' ')}>
                  <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                    <div className='min-w-0'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <span
                          className={[
                            'inline-flex px-2.5 py-1 text-xs font-medium',
                            NOTIFICATION_TYPE_STYLES[notification.type] ??
                              'bg-neutral-100 text-neutral-700',
                          ].join(' ')}>
                          {formatLabel(notification.type)}
                        </span>

                        {isUnread && (
                          <span className='inline-flex bg-black px-2.5 py-1 text-xs font-medium text-white'>
                            Unread
                          </span>
                        )}
                      </div>

                      <h2 className='mt-4 text-lg font-semibold'>
                        {notification.title}
                      </h2>

                      <p className='mt-2 text-sm leading-6 text-neutral-600'>
                        {notification.message}
                      </p>

                      <p className='mt-3 text-xs text-neutral-500'>
                        {dateFormatter.format(new Date(notification.createdAt))}
                      </p>
                    </div>

                    {!isUnread && (
                      <span className='text-xs font-medium text-neutral-500'>
                        Read
                      </span>
                    )}
                  </div>

                  <div className='mt-5 flex flex-wrap items-center gap-4 border-t border-neutral-200 pt-4'>
                    {resourceLink && (
                      <Link
                        to={resourceLink}
                        className='text-sm font-medium underline underline-offset-4'>
                        {getResourceLinkText(notification)}
                      </Link>
                    )}

                    {isUnread && (
                      <button
                        type='button'
                        disabled={Boolean(markingNotificationId)}
                        onClick={() => handleMarkRead(notification)}
                        className='text-sm font-medium underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50'>
                        {marking ? 'Marking as read...' : 'Mark as read'}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </section>

          <div className='mt-5 flex flex-col gap-3 border border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between'>
            <p className='text-sm text-neutral-600'>
              {meta.totalItems} Notification
              {meta.totalItems === 1 ? '' : 's'}
            </p>

            <div className='flex items-center gap-3'>
              <button
                type='button'
                disabled={meta.page <= 1 || loading}
                onClick={() => changePage(meta.page - 1)}
                className='border border-neutral-300 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40'>
                Previous
              </button>

              <span className='text-sm'>
                Page {meta.page} of {Math.max(meta.totalPages, 1)}
              </span>

              <button
                type='button'
                disabled={meta.page >= meta.totalPages || loading}
                onClick={() => changePage(meta.page + 1)}
                className='border border-neutral-300 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40'>
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}

export default NotificationsPage;
