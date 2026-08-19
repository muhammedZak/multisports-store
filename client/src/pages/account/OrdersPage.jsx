import { useCallback, useEffect, useState } from 'react';

import { Link } from 'react-router';

import { normalizeApiError } from '../../api/errors.js';
import { fetchMyOrders } from '../../api/orderApi.js';

import { formatInrFromPaise } from '../../utils/money.js';

const EMPTY_FILTERS = {
  status: '',
  order: 'desc',
};

const DEFAULT_QUERY = {
  ...EMPTY_FILTERS,
  page: 1,
  limit: 20,
  sort: 'placedAt',
};

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const ORDER_STATUS_STYLES = {
  placed: 'bg-blue-50 text-blue-700',
  confirmed: 'bg-indigo-50 text-indigo-700',
  processing: 'bg-amber-50 text-amber-700',
  shipped: 'bg-purple-50 text-purple-700',
  delivered: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
};

function formatStatus(value) {
  if (!value) {
    return 'Unknown';
  }

  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function OrdersPage() {
  const [orders, setOrders] = useState([]);

  const [filterForm, setFilterForm] = useState(EMPTY_FILTERS);

  const [query, setQuery] = useState(DEFAULT_QUERY);

  const [meta, setMeta] = useState({
    page: 1,
    limit: 20,
    totalItems: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchMyOrders(query);

      setOrders(result.items);
      setMeta(result.meta);
    } catch (requestError) {
      setError(
        normalizeApiError(
          requestError,
          'Unable to load your orders. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

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

  const filtersActive = Boolean(query.status);

  return (
    <main className='mx-auto max-w-5xl p-6'>
      <Link
        to='/account'
        className='text-sm font-medium underline underline-offset-4'>
        Back to profile
      </Link>

      <div className='mt-8'>
        <p className='text-sm font-medium uppercase tracking-[0.2em] text-neutral-500'>
          My account
        </p>

        <h1 className='mt-3 text-3xl font-semibold'>My orders</h1>

        <p className='mt-3 max-w-2xl text-sm leading-6 text-neutral-600'>
          Review your previous purchases, payment status, and current order
          progress.
        </p>
      </div>

      <form
        onSubmit={handleFilterSubmit}
        className='mt-8 grid gap-4 border border-neutral-200 p-4 sm:grid-cols-2'>
        <div>
          <label htmlFor='status' className='mb-2 block text-sm font-medium'>
            Order status
          </label>

          <select
            id='status'
            name='status'
            value={filterForm.status}
            onChange={handleFilterChange}
            className='w-full border border-neutral-300 bg-white px-3 py-2.5 outline-none focus:border-black'>
            <option value=''>All statuses</option>
            <option value='placed'>Placed</option>
            <option value='confirmed'>Confirmed</option>
            <option value='processing'>Processing</option>
            <option value='shipped'>Shipped</option>
            <option value='delivered'>Delivered</option>
            <option value='cancelled'>Cancelled</option>
          </select>
        </div>

        <div>
          <label htmlFor='order' className='mb-2 block text-sm font-medium'>
            Date order
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

      {loading && (
        <section className='mt-6 border border-neutral-200 p-8'>
          <p className='text-sm text-neutral-600'>Loading your orders...</p>
        </section>
      )}

      {!loading && error && orders.length === 0 && (
        <button
          type='button'
          onClick={loadOrders}
          className='mt-4 bg-black px-4 py-2 text-sm font-medium text-white'>
          Try again
        </button>
      )}

      {!loading && !error && orders.length === 0 && (
        <section className='mt-6 border border-neutral-200 p-8 text-center'>
          <h2 className='text-lg font-semibold'>
            {filtersActive ? 'No matching orders' : 'No orders yet'}
          </h2>

          <p className='mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-600'>
            {filtersActive
              ? 'No orders match the selected status. Try another filter.'
              : 'Orders you place will appear here with their payment and fulfillment status.'}
          </p>

          {filtersActive ? (
            <button
              type='button'
              onClick={handleResetFilters}
              className='mt-5 border border-neutral-300 px-5 py-3 text-sm font-medium'>
              Clear filters
            </button>
          ) : (
            <Link
              to='/shop'
              className='mt-5 inline-flex bg-black px-5 py-3 text-sm font-medium text-white'>
              Start shopping
            </Link>
          )}
        </section>
      )}

      {!loading && orders.length > 0 && (
        <>
          <section className='mt-6 space-y-4'>
            {orders.map((order) => (
              <article
                key={order.id}
                className='border border-neutral-200 p-5 sm:p-6'>
                <div className='flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between'>
                  <div>
                    <p className='text-xs font-medium uppercase tracking-wide text-neutral-500'>
                      Order number
                    </p>

                    <p className='mt-1 break-all font-semibold'>
                      {order.orderNumber}
                    </p>

                    <p className='mt-2 text-sm text-neutral-600'>
                      {dateFormatter.format(new Date(order.placedAt))}
                    </p>
                  </div>

                  <span
                    className={[
                      'inline-flex w-fit px-2.5 py-1 text-xs font-medium',
                      ORDER_STATUS_STYLES[order.orderStatus] ??
                        'bg-neutral-100 text-neutral-700',
                    ].join(' ')}>
                    {formatStatus(order.orderStatus)}
                  </span>
                </div>

                <dl className='mt-5 grid gap-4 border-y border-neutral-200 py-4 text-sm sm:grid-cols-3'>
                  <div>
                    <dt className='text-neutral-500'>Total</dt>

                    <dd className='mt-1 font-semibold'>
                      {formatInrFromPaise(order.pricing.totalAmount)}
                    </dd>
                  </div>

                  <div>
                    <dt className='text-neutral-500'>Items</dt>

                    <dd className='mt-1 font-medium'>
                      {order.itemCount} item
                      {order.itemCount === 1 ? '' : 's'}
                    </dd>
                  </div>

                  <div>
                    <dt className='text-neutral-500'>Payment</dt>

                    <dd className='mt-1 font-medium capitalize'>
                      {order.payment?.status
                        ? formatStatus(order.payment.status)
                        : 'Unavailable'}
                    </dd>
                  </div>
                </dl>

                <Link
                  to={`/account/orders/${order.id}`}
                  className='mt-5 inline-flex text-sm font-medium underline underline-offset-4'>
                  View order details
                </Link>
              </article>
            ))}
          </section>

          <div className='mt-5 flex flex-col gap-3 border border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between'>
            <p className='text-sm text-neutral-600'>
              {meta.totalItems} order
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

export default OrdersPage;
