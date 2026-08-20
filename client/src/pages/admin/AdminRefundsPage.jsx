import { useCallback, useEffect, useState } from 'react';

import { Link } from 'react-router';

import { normalizeApiError } from '../../api/errors.js';
import { fetchAdminRefunds } from '../../api/refundApi.js';

import { formatInrFromPaise } from '../../utils/money.js';

const EMPTY_FILTERS = {
  q: '',
  status: '',
  origin: '',
  customerId: '',
  orderId: '',
  dateFrom: '',
  dateTo: '',
  order: 'desc',
};

const DEFAULT_QUERY = {
  ...EMPTY_FILTERS,
  page: 1,
  limit: 20,
  sort: 'requestedAt',
};

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const REFUND_STATUS_CLASSES = {
  requested: 'bg-blue-100 text-blue-700',
  approved: 'bg-indigo-100 text-indigo-700',
  rejected: 'bg-red-100 text-red-700',
  processing: 'bg-amber-100 text-amber-700',
  refunded: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

function formatLabel(value) {
  if (!value) {
    return 'Unavailable';
  }

  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value) {
  return value ? dateFormatter.format(new Date(value)) : 'Not available';
}

function formatAmount(amount, currency) {
  return currency === 'INR'
    ? formatInrFromPaise(amount)
    : `${amount} ${currency}`;
}

function getScopeSummary(refund) {
  if (refund.scope === 'order') {
    return 'Whole Order';
  }

  if (refund.scope === 'items') {
    const lineCount = refund.orderItemIds?.length ?? 0;

    return `${lineCount} item line${lineCount === 1 ? '' : 's'}`;
  }

  return 'No Order scope';
}

function getReasonSummary(reason) {
  if (!reason) {
    return 'No reason available';
  }

  return reason.length > 120 ? `${reason.slice(0, 120)}...` : reason;
}

function AdminRefundsPage() {
  const [refunds, setRefunds] = useState([]);
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

  const loadRefunds = useCallback(async () => {
    setLoading(true);
    setListError(null);

    try {
      const result = await fetchAdminRefunds(appliedFilters);

      setRefunds(result.items);
      setMeta(result.meta);
    } catch (requestError) {
      setRefunds([]);
      setListError(
        normalizeApiError(
          requestError,
          'Unable to load Refunds. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRefunds();
  }, [loadRefunds]);

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
      orderId: filterForm.orderId.trim(),
      page: 1,
      limit: 20,
      sort: 'requestedAt',
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
      appliedFilters.origin ||
      appliedFilters.customerId ||
      appliedFilters.orderId ||
      appliedFilters.dateFrom ||
      appliedFilters.dateTo ||
      appliedFilters.order !== 'desc',
  );

  return (
    <main className='p-5 sm:p-6'>
      <div>
        <p className='text-sm font-medium uppercase tracking-[0.2em] text-neutral-500'>
          Refund management
        </p>

        <h1 className='mt-3 text-3xl font-semibold'>Refunds</h1>

        <p className='mt-3 max-w-2xl text-sm leading-6 text-neutral-600'>
          Review Refund history, inspect operational context, and process
          Customer requests awaiting an Admin decision.
        </p>
      </div>

      <form
        onSubmit={handleFilterSubmit}
        className='mt-8 grid gap-4 border border-neutral-200 p-4 md:grid-cols-2 xl:grid-cols-3'>
        <div>
          <label htmlFor='q' className='mb-2 block text-sm font-medium'>
            Search Order
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
            Status
          </label>
          <select
            id='status'
            name='status'
            value={filterForm.status}
            onChange={handleFilterChange}
            className='w-full border border-neutral-300 bg-white px-3 py-2.5 outline-none focus:border-black'>
            <option value=''>All statuses</option>
            <option value='requested'>Requested</option>
            <option value='approved'>Approved</option>
            <option value='rejected'>Rejected</option>
            <option value='processing'>Processing</option>
            <option value='refunded'>Refunded</option>
            <option value='failed'>Failed</option>
          </select>
        </div>

        <div>
          <label htmlFor='origin' className='mb-2 block text-sm font-medium'>
            Origin
          </label>
          <select
            id='origin'
            name='origin'
            value={filterForm.origin}
            onChange={handleFilterChange}
            className='w-full border border-neutral-300 bg-white px-3 py-2.5 outline-none focus:border-black'>
            <option value=''>All origins</option>
            <option value='customer_request'>Customer request</option>
            <option value='order_cancellation'>Order cancellation</option>
            <option value='system_compensation'>System compensation</option>
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
          <label htmlFor='orderId' className='mb-2 block text-sm font-medium'>
            Order ID
          </label>
          <input
            id='orderId'
            name='orderId'
            value={filterForm.orderId}
            onChange={handleFilterChange}
            placeholder='Optional Order ID'
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
            Requested date order
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
        <section className='mt-5 border border-red-200 bg-red-50 p-4'>
          <p role='alert' className='text-sm text-red-700'>
            {listError.message}
          </p>
          <button
            type='button'
            onClick={loadRefunds}
            className='mt-4 bg-black px-4 py-2 text-sm font-medium text-white'>
            Try again
          </button>
        </section>
      )}

      {loading && (
        <section className='mt-5 border border-neutral-200 p-8 text-sm text-neutral-600'>
          Loading Refunds...
        </section>
      )}

      {!loading && !listError && refunds.length === 0 && (
        <section className='mt-5 border border-neutral-200 p-8 text-center'>
          <h2 className='font-semibold'>
            {filtersActive ? 'No matching Refunds' : 'No Refunds yet'}
          </h2>
          <p className='mt-2 text-sm text-neutral-600'>
            {filtersActive
              ? 'Try changing or clearing the current filters.'
              : 'Refund activity will appear here when it is created.'}
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

      {!loading && !listError && refunds.length > 0 && (
        <>
          <div className='mt-5 grid gap-4 md:hidden'>
            {refunds.map((refund) => (
              <article key={refund.id} className='border border-neutral-200 p-4'>
                <div className='flex items-start justify-between gap-4'>
                  <div className='min-w-0'>
                    <p className='font-semibold'>
                      {refund.order?.orderNumber ?? 'System compensation'}
                    </p>
                    <p className='mt-1 text-xs text-neutral-500'>
                      {formatDate(refund.requestedAt)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 px-2.5 py-1 text-xs font-medium ${REFUND_STATUS_CLASSES[refund.status] ?? 'bg-neutral-100 text-neutral-700'}`}>
                    {formatLabel(refund.status)}
                  </span>
                </div>

                <dl className='mt-4 grid gap-3 text-sm sm:grid-cols-2'>
                  <div>
                    <dt className='text-neutral-500'>Customer</dt>
                    <dd className='mt-1 font-medium'>
                      {refund.customer?.name ?? 'Unavailable'}
                    </dd>
                    <dd className='break-all text-xs text-neutral-500'>
                      {refund.customer?.email ?? 'Not available'}
                    </dd>
                  </div>
                  <div>
                    <dt className='text-neutral-500'>Amount</dt>
                    <dd className='mt-1 font-semibold'>
                      {formatAmount(refund.amount, refund.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className='text-neutral-500'>Origin</dt>
                    <dd className='mt-1'>{formatLabel(refund.origin)}</dd>
                  </div>
                  <div>
                    <dt className='text-neutral-500'>Scope</dt>
                    <dd className='mt-1'>{getScopeSummary(refund)}</dd>
                  </div>
                </dl>

                <p className='mt-4 text-sm leading-6 text-neutral-700'>
                  {getReasonSummary(refund.reason)}
                </p>
                <Link
                  to={`/admin/refunds/${refund.id}`}
                  className='mt-4 inline-flex text-sm font-medium underline underline-offset-4'>
                  View Refund
                </Link>
              </article>
            ))}
          </div>

          <div className='mt-5 hidden overflow-x-auto border border-neutral-200 md:block'>
            <table className='min-w-full text-left text-sm'>
              <thead className='bg-neutral-50'>
                <tr>
                  <th className='px-4 py-3 font-medium'>Refund</th>
                  <th className='px-4 py-3 font-medium'>Customer</th>
                  <th className='px-4 py-3 font-medium'>Origin / scope</th>
                  <th className='px-4 py-3 font-medium'>Amount</th>
                  <th className='px-4 py-3 font-medium'>Reason</th>
                  <th className='px-4 py-3 font-medium'>Status</th>
                  <th className='px-4 py-3 font-medium'>Action</th>
                </tr>
              </thead>
              <tbody>
                {refunds.map((refund) => (
                  <tr
                    key={refund.id}
                    className='border-t border-neutral-200 align-top'>
                    <td className='min-w-48 px-4 py-4'>
                      <p className='font-semibold'>
                        {refund.order?.orderNumber ?? 'System compensation'}
                      </p>
                      <p className='mt-1 whitespace-nowrap text-xs text-neutral-500'>
                        {formatDate(refund.requestedAt)}
                      </p>
                    </td>
                    <td className='min-w-48 px-4 py-4'>
                      <p className='font-medium'>
                        {refund.customer?.name ?? 'Unavailable'}
                      </p>
                      <p className='mt-1 break-all text-xs text-neutral-500'>
                        {refund.customer?.email ?? 'Not available'}
                      </p>
                    </td>
                    <td className='min-w-40 px-4 py-4'>
                      <p>{formatLabel(refund.origin)}</p>
                      <p className='mt-1 text-xs text-neutral-500'>
                        {getScopeSummary(refund)}
                      </p>
                    </td>
                    <td className='whitespace-nowrap px-4 py-4 font-semibold'>
                      {formatAmount(refund.amount, refund.currency)}
                    </td>
                    <td className='max-w-64 px-4 py-4 text-neutral-700'>
                      {getReasonSummary(refund.reason)}
                    </td>
                    <td className='px-4 py-4'>
                      <span
                        className={`inline-flex whitespace-nowrap px-2.5 py-1 text-xs font-medium ${REFUND_STATUS_CLASSES[refund.status] ?? 'bg-neutral-100 text-neutral-700'}`}>
                        {formatLabel(refund.status)}
                      </span>
                    </td>
                    <td className='px-4 py-4'>
                      <Link
                        to={`/admin/refunds/${refund.id}`}
                        className='font-medium underline underline-offset-4'>
                        View Refund
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className='mt-5 flex flex-col gap-3 border border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between'>
            <p className='text-sm text-neutral-600'>
              {meta.totalItems} Refund{meta.totalItems === 1 ? '' : 's'}
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

export default AdminRefundsPage;
