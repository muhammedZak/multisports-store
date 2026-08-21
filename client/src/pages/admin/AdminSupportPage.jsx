import { useCallback, useEffect, useRef, useState } from 'react';

import { Link } from 'react-router';

import { normalizeApiError } from '../../api/errors.js';

import { fetchAdminSupportConversations } from '../../api/supportApi.js';

import { getRealtimeSocket } from '../../realtime/socket.client.js';

const DEFAULT_FILTERS = {
  q: '',
  unread: '',
  order: 'desc',
};

const DEFAULT_QUERY = {
  ...DEFAULT_FILTERS,
  page: 1,
  limit: 20,
  sort: 'lastMessageAt',
};

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatDate(value) {
  if (!value) {
    return 'No messages yet';
  }

  return dateFormatter.format(new Date(value));
}

function AdminSupportPage() {
  const [filterForm, setFilterForm] = useState(DEFAULT_FILTERS);

  const [query, setQuery] = useState(DEFAULT_QUERY);

  const queryRef = useRef(query);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  const [conversations, setConversations] = useState([]);

  const [meta, setMeta] = useState({
    page: 1,
    limit: 20,
    totalItems: 0,
    totalPages: 0,
  });

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
     * Do not remove currently rendered
     * authoritative REST content merely because
     * background synchronization failed.
     */
    setLiveError(
      'A live Support update could not be synchronized. Refresh if needed.',
    );
  }
}, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadConversations();
  }, [loadConversations]);

  /*
   * Every authenticated Admin already joins
   * user:<adminId> on the backend.
   *
   * Customer messages create persisted Admin
   * Support Notifications and then notification:new
   * is delivered to that user room.
   *
   * We use that event only to refresh the inbox.
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
      * notification:new events emitted while this
      * browser was disconnected cannot be replayed.
      *
      * Refresh the authoritative REST inbox after
      * every successful connection/reconnection.
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

  function handleFilterSubmit(event) {
    event.preventDefault();

    setQuery({
      ...DEFAULT_QUERY,
      ...filterForm,
      page: 1,
    });
  }

  function handleResetFilters() {
    setFilterForm(DEFAULT_FILTERS);
    setQuery(DEFAULT_QUERY);
  }

  function changePage(page) {
    setQuery((current) => ({
      ...current,
      page,
    }));
  }

  const filtersActive = Boolean(query.q) || query.unread !== '';

  return (
    <main className='p-5 sm:p-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <p className='text-sm font-medium uppercase tracking-[0.2em] text-neutral-500'>
            Store management
          </p>

          <h1 className='mt-3 text-3xl font-semibold'>Support</h1>

          <p className='mt-3 max-w-2xl text-sm leading-6 text-neutral-600'>
            Review Customer Support conversations, find unread messages, and
            reply from one persistent conversation per Customer.
          </p>
        </div>

        <div className='w-fit border border-neutral-200 px-4 py-3'>
          <p className='text-xs font-medium uppercase tracking-wide text-neutral-500'>
            Live updates
          </p>

          <p className='mt-1 text-sm font-medium'>
            {liveStatus === 'live'
              ? 'Connected'
              : liveStatus === 'connecting'
                ? 'Connecting...'
                : 'Offline'}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleFilterSubmit}
        className='mt-8 grid gap-4 border border-neutral-200 p-4 lg:grid-cols-3'>
        <div className='lg:col-span-3'>
          <label htmlFor='q' className='mb-2 block text-sm font-medium'>
            Customer
          </label>

          <input
            id='q'
            name='q'
            type='search'
            value={filterForm.q}
            onChange={handleFilterChange}
            placeholder='Search by Customer name or email'
            className='w-full border border-neutral-300 px-3 py-2.5 outline-none focus:border-black'
          />
        </div>

        <div>
          <label htmlFor='unread' className='mb-2 block text-sm font-medium'>
            Read status
          </label>

          <select
            id='unread'
            name='unread'
            value={filterForm.unread}
            onChange={handleFilterChange}
            className='w-full border border-neutral-300 bg-white px-3 py-2.5 outline-none focus:border-black'>
            <option value=''>All conversations</option>

            <option value='true'>Unread</option>

            <option value='false'>Read / no unread messages</option>
          </select>
        </div>

        <div>
          <label htmlFor='order' className='mb-2 block text-sm font-medium'>
            Activity order
          </label>

          <select
            id='order'
            name='order'
            value={filterForm.order}
            onChange={handleFilterChange}
            className='w-full border border-neutral-300 bg-white px-3 py-2.5 outline-none focus:border-black'>
            <option value='desc'>Newest first</option>

            <option value='asc'>Oldest first</option>
          </select>
        </div>

        <div className='flex items-end gap-3'>
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
            className='border border-neutral-300 px-4 py-2.5 text-sm font-medium disabled:opacity-50'>
            Reset
          </button>
        </div>
      </form>

      {liveError && (
        <div className='mt-5 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800'>
          {liveError}
        </div>
      )}

      {error && (
        <section className='mt-5 border border-red-200 bg-red-50 p-4'>
          <p role='alert' className='text-sm text-red-700'>
            {error.message}
          </p>

          <button
            type='button'
            onClick={loadConversations}
            className='mt-4 bg-black px-4 py-2 text-sm font-medium text-white'>
            Try again
          </button>
        </section>
      )}

      {loading && (
        <section className='mt-5 border border-neutral-200 p-8 text-sm text-neutral-600'>
          Loading Support conversations...
        </section>
      )}

      {!loading && !error && conversations.length === 0 && (
        <section className='mt-5 border border-neutral-200 p-8 text-center'>
          <h2 className='font-semibold'>
            {filtersActive
              ? 'No matching conversations'
              : 'No Support conversations yet'}
          </h2>

          <p className='mt-2 text-sm text-neutral-600'>
            {filtersActive
              ? 'Try changing or clearing the current filters.'
              : 'Customer Support conversations will appear here when Customers contact Support.'}
          </p>

          {filtersActive && (
            <button
              type='button'
              onClick={handleResetFilters}
              className='mt-5 bg-black px-4 py-2.5 text-sm font-medium text-white'>
              Clear filters
            </button>
          )}
        </section>
      )}

      {!loading && !error && conversations.length > 0 && (
        <>
          {/* Mobile */}
          <div className='mt-5 grid gap-4 md:hidden'>
            {conversations.map((conversation) => (
              <article
                key={conversation.id}
                className={[
                  'border p-4',
                  conversation.unread
                    ? 'border-black bg-neutral-50'
                    : 'border-neutral-200 bg-white',
                ].join(' ')}>
                <div className='flex items-start justify-between gap-4'>
                  <div className='min-w-0'>
                    <h2 className='font-semibold'>
                      {conversation.customer?.name ?? 'Customer'}
                    </h2>

                    <p className='mt-1 break-all text-sm text-neutral-600'>
                      {conversation.customer?.email ?? 'Email unavailable'}
                    </p>
                  </div>

                  {conversation.unread && (
                    <span className='shrink-0 bg-black px-2.5 py-1 text-xs font-medium text-white'>
                      Unread
                    </span>
                  )}
                </div>

                <p className='mt-4 text-xs text-neutral-500'>Last activity</p>

                <p className='mt-1 text-sm'>
                  {formatDate(conversation.lastMessageAt)}
                </p>

                <Link
                  to={`/admin/support/conversations/${conversation.id}`}
                  className='mt-4 inline-block text-sm font-medium underline underline-offset-4'>
                  Open conversation
                </Link>
              </article>
            ))}
          </div>

          {/* Desktop */}
          <div className='mt-5 hidden overflow-x-auto border border-neutral-200 md:block'>
            <table className='min-w-full text-left text-sm'>
              <thead className='bg-neutral-50'>
                <tr>
                  <th className='px-4 py-3 font-medium'>Customer</th>

                  <th className='px-4 py-3 font-medium'>Last activity</th>

                  <th className='px-4 py-3 font-medium'>Status</th>

                  <th className='px-4 py-3 font-medium'>Action</th>
                </tr>
              </thead>

              <tbody>
                {conversations.map((conversation) => (
                  <tr
                    key={conversation.id}
                    className={[
                      'border-t border-neutral-200',
                      conversation.unread ? 'bg-neutral-50' : 'bg-white',
                    ].join(' ')}>
                    <td className='px-4 py-4'>
                      <p className='font-medium'>
                        {conversation.customer?.name ?? 'Customer'}
                      </p>

                      <p className='mt-1 text-neutral-600'>
                        {conversation.customer?.email ?? 'Email unavailable'}
                      </p>
                    </td>

                    <td className='whitespace-nowrap px-4 py-4 text-neutral-600'>
                      {formatDate(conversation.lastMessageAt)}
                    </td>

                    <td className='px-4 py-4'>
                      {conversation.unread ? (
                        <span className='inline-flex bg-black px-2.5 py-1 text-xs font-medium text-white'>
                          Unread
                        </span>
                      ) : (
                        <span className='text-xs font-medium text-neutral-500'>
                          Read
                        </span>
                      )}
                    </td>

                    <td className='px-4 py-4'>
                      <Link
                        to={`/admin/support/conversations/${conversation.id}`}
                        className='font-medium underline underline-offset-4'>
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!loading && !error && meta.totalPages > 1 && (
        <div className='mt-6 flex items-center justify-between gap-4'>
          <button
            type='button'
            disabled={meta.page <= 1}
            onClick={() => changePage(meta.page - 1)}
            className='border border-neutral-300 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40'>
            Previous
          </button>

          <p className='text-sm text-neutral-600'>
            Page {meta.page} of {meta.totalPages}
          </p>

          <button
            type='button'
            disabled={meta.page >= meta.totalPages}
            onClick={() => changePage(meta.page + 1)}
            className='border border-neutral-300 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40'>
            Next
          </button>
        </div>
      )}
    </main>
  );
}

export default AdminSupportPage;
