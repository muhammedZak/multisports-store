import { useCallback, useEffect, useState } from 'react';

import { Link } from 'react-router';

import { normalizeApiError } from '../../api/errors.js';

import { fetchAdminOrders } from '../../api/orderApi.js';

import { formatInrFromPaise } from '../../utils/money.js';

const EMPTY_FILTERS = {
  q: '',
  status: '',
  customerId: '',
  dateFrom: '',
  dateTo: '',
  order: 'desc',
};

const DEFAULT_QUERY = {
  ...EMPTY_FILTERS,
  sort: 'placedAt',
  page: 1,
  limit: 20,
};

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatDate(value) {
  if (!value) {
    return '—';
  }

  return dateFormatter.format(new Date(value));
}

function formatStatus(value) {
  if (!value) {
    return 'Unknown';
  }

  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getOrderStatusClass(status) {
  const classes = {
    placed: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-indigo-100 text-indigo-700',
    processing: 'bg-amber-100 text-amber-700',
    shipped: 'bg-purple-100 text-purple-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  return classes[status] ?? 'bg-neutral-100 text-neutral-700';
}

function getPaymentStatusClass(status) {
  if (status === 'succeeded') {
    return 'bg-green-100 text-green-700';
  }

  if (status === 'created' || status === 'pending') {
    return 'bg-amber-100 text-amber-700';
  }

  if (
    status === 'failed' ||
    status === 'cancelled' ||
    status === 'verification_failed'
  ) {
    return 'bg-red-100 text-red-700';
  }

  return 'bg-neutral-100 text-neutral-700';
}

function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);

  const [filterForm, setFilterForm] = useState(EMPTY_FILTERS);

  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_QUERY);

  const [meta, setMeta] = useState({
    page: 1,
    limit: 20,
    totalItems: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(true);

  const [listError, setListError] = useState(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setListError(null);

    try {
      const result = await fetchAdminOrders(appliedFilters);

      setOrders(result.items);
      setMeta(result.meta);
    } catch (requestError) {
      setListError(
        normalizeApiError(
          requestError,
          'Unable to load orders. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

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

    setAppliedFilters({
      ...filterForm,

      q: filterForm.q.trim(),

      customerId: filterForm.customerId.trim(),

      sort: 'placedAt',

      page: 1,

      limit: 20,
    });
  }

  function handleResetFilters() {
    setFilterForm(EMPTY_FILTERS);

    setAppliedFilters(DEFAULT_QUERY);
  }

  function changePage(page) {
    setAppliedFilters((current) => ({
      ...current,
      page,
    }));
  }

  const filtersActive = Boolean(
    appliedFilters.q ||
    appliedFilters.status ||
    appliedFilters.customerId ||
    appliedFilters.dateFrom ||
    appliedFilters.dateTo ||
    appliedFilters.order !== 'desc',
  );

  return (
    <main className='p-5 sm:p-6'>
      <div>
        <p className='text-sm font-medium uppercase tracking-[0.2em] text-neutral-500'>
          Order management
        </p>

        <h1 className='mt-3 text-3xl font-semibold'>Orders</h1>

        <p className='mt-3 max-w-2xl text-sm leading-6 text-neutral-600'>
          Review customer orders, payment status, fulfillment status, and
          historical purchase details.
        </p>
      </div>

      <form
        onSubmit={handleFilterSubmit}
        className='mt-8 grid gap-4 border border-neutral-200 p-4 md:grid-cols-2 xl:grid-cols-3'>
        <div>
          <label htmlFor='q' className='mb-2 block text-sm font-medium'>
            Search order
          </label>

          <input
            id='q'
            name='q'
            type='search'
            value={filterForm.q}
            onChange={handleFilterChange}
            placeholder='Order number'
            className='w-full border border-neutral-300 px-3 py-2.5 outline-none focus:border-black'
          />
        </div>

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
          <label
            htmlFor='customerId'
            className='mb-2 block text-sm font-medium'>
            Customer ID
          </label>

          <input
            id='customerId'
            name='customerId'
            value={filterForm.customerId}
            onChange={handleFilterChange}
            placeholder='Optional Customer ID'
            className='w-full border border-neutral-300 px-3 py-2.5 outline-none focus:border-black'
          />
        </div>

        <div>
          <label htmlFor='dateFrom' className='mb-2 block text-sm font-medium'>
            From date
          </label>

          <input
            id='dateFrom'
            name='dateFrom'
            type='date'
            value={filterForm.dateFrom}
            onChange={handleFilterChange}
            className='w-full border border-neutral-300 px-3 py-2.5 outline-none focus:border-black'
          />
        </div>

        <div>
          <label htmlFor='dateTo' className='mb-2 block text-sm font-medium'>
            To date
          </label>

          <input
            id='dateTo'
            name='dateTo'
            type='date'
            value={filterForm.dateTo}
            onChange={handleFilterChange}
            className='w-full border border-neutral-300 px-3 py-2.5 outline-none focus:border-black'
          />
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

        <div className='flex flex-wrap gap-3 md:col-span-2 xl:col-span-3'>
          <button
            type='submit'
            disabled={loading}
            className='bg-black px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50'>
            Apply filters
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

      {listError && (
        <div
          role='alert'
          className='mt-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          {listError.message}
        </div>
      )}

      {loading && (
        <div className='mt-5 border border-neutral-200 p-8 text-sm text-neutral-600'>
          Loading orders...
        </div>
      )}

      {!loading && listError && orders.length === 0 && (
        <button
          type='button'
          onClick={loadOrders}
          className='mt-4 bg-black px-4 py-2 text-sm font-medium text-white'>
          Try again
        </button>
      )}

      {!loading && !listError && orders.length === 0 && (
        <section className='mt-5 border border-neutral-200 p-8 text-center'>
          <h2 className='font-semibold'>
            {filtersActive ? 'No matching orders' : 'No orders yet'}
          </h2>

          <p className='mt-2 text-sm text-neutral-600'>
            {filtersActive
              ? 'Try changing or clearing the current filters.'
              : 'Customer orders will appear here after successful order placement.'}
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

      {!loading && orders.length > 0 && (
        <>
          {/* Mobile */}
          <div className='mt-5 grid gap-4 md:hidden'>
            {orders.map((order) => (
              <article key={order.id} className='border border-neutral-200 p-4'>
                <div className='flex items-start justify-between gap-4'>
                  <div className='min-w-0'>
                    <p className='break-all font-semibold'>
                      {order.orderNumber}
                    </p>

                    <p className='mt-1 text-xs text-neutral-500'>
                      {formatDate(order.placedAt)}
                    </p>
                  </div>

                  <span
                    className={[
                      'shrink-0 px-2.5 py-1 text-xs font-medium',
                      getOrderStatusClass(order.orderStatus),
                    ].join(' ')}>
                    {formatStatus(order.orderStatus)}
                  </span>
                </div>

                <dl className='mt-4 space-y-3 text-sm'>
                  <div>
                    <dt className='text-neutral-500'>Customer</dt>

                    <dd className='mt-1'>
                      <p className='font-medium'>
                        {order.customer?.name ?? 'Unavailable'}
                      </p>

                      <p className='text-xs text-neutral-500'>
                        {order.customer?.email ?? '—'}
                      </p>
                    </dd>
                  </div>

                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <dt className='text-neutral-500'>Items</dt>

                      <dd className='mt-1 font-medium'>{order.itemCount}</dd>
                    </div>

                    <div>
                      <dt className='text-neutral-500'>Total</dt>

                      <dd className='mt-1 font-semibold'>
                        {formatInrFromPaise(order.pricing.totalAmount)}
                      </dd>
                    </div>
                  </div>

                  <div>
                    <dt className='text-neutral-500'>Payment</dt>

                    <dd className='mt-2'>
                      <span
                        className={[
                          'inline-flex px-2.5 py-1 text-xs font-medium',
                          getPaymentStatusClass(order.payment?.status),
                        ].join(' ')}>
                        {order.payment?.status
                          ? formatStatus(order.payment.status)
                          : 'Unavailable'}
                      </span>
                    </dd>
                  </div>
                </dl>

                <Link
                  to={`/admin/orders/${order.id}`}
                  className='mt-4 inline-flex text-sm font-medium underline underline-offset-4'>
                  View order
                </Link>
              </article>
            ))}
          </div>

          {/* Desktop */}
          <div className='mt-5 hidden overflow-x-auto border border-neutral-200 md:block'>
            <table className='min-w-full text-left text-sm'>
              <thead className='bg-neutral-50'>
                <tr>
                  <th className='px-4 py-3 font-medium'>Order</th>

                  <th className='px-4 py-3 font-medium'>Customer</th>

                  <th className='px-4 py-3 font-medium'>Items</th>

                  <th className='px-4 py-3 font-medium'>Total</th>

                  <th className='px-4 py-3 font-medium'>Payment</th>

                  <th className='px-4 py-3 font-medium'>Status</th>

                  <th className='px-4 py-3 font-medium'>Actions</th>
                </tr>
              </thead>

              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className='border-t border-neutral-200 align-top'>
                    <td className='min-w-52 px-4 py-4'>
                      <p className='break-all font-semibold'>
                        {order.orderNumber}
                      </p>

                      <p className='mt-1 text-xs text-neutral-500'>
                        {formatDate(order.placedAt)}
                      </p>
                    </td>

                    <td className='min-w-48 px-4 py-4'>
                      <p className='font-medium'>
                        {order.customer?.name ?? 'Unavailable'}
                      </p>

                      <p className='mt-1 text-xs text-neutral-500'>
                        {order.customer?.email ?? '—'}
                      </p>
                    </td>

                    <td className='px-4 py-4'>{order.itemCount}</td>

                    <td className='whitespace-nowrap px-4 py-4 font-medium'>
                      {formatInrFromPaise(order.pricing.totalAmount)}
                    </td>

                    <td className='px-4 py-4'>
                      <span
                        className={[
                          'inline-flex whitespace-nowrap px-2.5 py-1 text-xs font-medium',
                          getPaymentStatusClass(order.payment?.status),
                        ].join(' ')}>
                        {order.payment?.status
                          ? formatStatus(order.payment.status)
                          : 'Unavailable'}
                      </span>
                    </td>

                    <td className='px-4 py-4'>
                      <span
                        className={[
                          'inline-flex whitespace-nowrap px-2.5 py-1 text-xs font-medium',
                          getOrderStatusClass(order.orderStatus),
                        ].join(' ')}>
                        {formatStatus(order.orderStatus)}
                      </span>
                    </td>

                    <td className='px-4 py-4'>
                      <Link
                        to={`/admin/orders/${order.id}`}
                        className='font-medium underline underline-offset-4'>
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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

export default AdminOrdersPage;
