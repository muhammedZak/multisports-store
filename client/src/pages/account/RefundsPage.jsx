import { useCallback, useEffect, useState } from 'react';

import { Link } from 'react-router';

import { normalizeApiError } from '../../api/errors.js';
import { fetchMyRefunds } from '../../api/refundApi.js';

import { formatInrFromPaise } from '../../utils/money.js';

const EMPTY_FILTERS = {
  status: '',
  origin: '',
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

const REFUND_STATUS_STYLES = {
  requested: 'bg-blue-50 text-blue-700',
  approved: 'bg-indigo-50 text-indigo-700',
  rejected: 'bg-red-50 text-red-700',
  processing: 'bg-amber-50 text-amber-700',
  refunded: 'bg-green-50 text-green-700',
  failed: 'bg-red-50 text-red-700',
};

function formatLabel(value) {
  if (!value) {
    return 'Not available';
  }

  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatRefundAmount(refund) {
  if (refund.currency === 'INR') {
    return formatInrFromPaise(refund.amount);
  }

  return `${refund.amount} ${refund.currency}`;
}

function getScopeSummary(refund) {
  if (refund.scope === 'order') {
    return 'Whole Order';
  }

  if (refund.scope === 'items') {
    const lineCount = refund.orderItemIds?.length ?? 0;

    return `${lineCount} complete item line${lineCount === 1 ? '' : 's'}`;
  }

  return 'Not tied to Order items';
}

function RefundsPage() {
  const [refunds, setRefunds] = useState([]);
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

  const loadRefunds = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchMyRefunds(query);

      setRefunds(result.items);
      setMeta(result.meta);
    } catch (requestError) {
      setError(
        normalizeApiError(
          requestError,
          'Unable to load your Refunds. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [query]);

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

  const filtersActive = Boolean(query.status || query.origin);

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

        <h1 className='mt-3 text-3xl font-semibold'>My Refunds</h1>

        <p className='mt-3 max-w-2xl text-sm leading-6 text-neutral-600'>
          Track Customer requests, Order-cancellation Refunds, and system
          compensation in one history.
        </p>
      </div>

      <form
        onSubmit={handleFilterSubmit}
        className='mt-8 grid gap-4 border border-neutral-200 p-4 md:grid-cols-3'>
        <div>
          <label htmlFor='status' className='mb-2 block text-sm font-medium'>
            Refund status
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
            Refund origin
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

        <div className='flex flex-wrap gap-3 md:col-span-3'>
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
          <p className='text-sm text-neutral-600'>Loading your Refunds...</p>
        </section>
      )}

      {!loading && error && refunds.length === 0 && (
        <button
          type='button'
          onClick={loadRefunds}
          className='mt-4 bg-black px-4 py-2 text-sm font-medium text-white'>
          Try again
        </button>
      )}

      {!loading && !error && refunds.length === 0 && (
        <section className='mt-6 border border-neutral-200 p-8 text-center'>
          <h2 className='text-lg font-semibold'>
            {filtersActive ? 'No matching Refunds' : 'No Refunds yet'}
          </h2>

          <p className='mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-600'>
            {filtersActive
              ? 'No Refunds match the selected status and origin.'
              : 'Refund activity connected to your account will appear here.'}
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
              to='/account/orders'
              className='mt-5 inline-flex bg-black px-5 py-3 text-sm font-medium text-white'>
              View my Orders
            </Link>
          )}
        </section>
      )}

      {!loading && refunds.length > 0 && (
        <>
          <section className='mt-6 space-y-4'>
            {refunds.map((refund) => (
              <article
                key={refund.id}
                className='border border-neutral-200 p-5 sm:p-6'>
                <div className='flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between'>
                  <div>
                    <p className='text-xs font-medium uppercase tracking-wide text-neutral-500'>
                      {refund.order?.orderNumber ?? 'Account compensation'}
                    </p>

                    <p className='mt-2 font-semibold'>
                      {formatRefundAmount(refund)}
                    </p>

                    <p className='mt-2 text-sm text-neutral-600'>
                      Requested{' '}
                      {dateFormatter.format(new Date(refund.requestedAt))}
                    </p>
                  </div>

                  <span
                    className={[
                      'inline-flex w-fit px-2.5 py-1 text-xs font-medium',
                      REFUND_STATUS_STYLES[refund.status] ??
                        'bg-neutral-100 text-neutral-700',
                    ].join(' ')}>
                    {formatLabel(refund.status)}
                  </span>
                </div>

                <dl className='mt-5 grid gap-4 border-y border-neutral-200 py-4 text-sm sm:grid-cols-2 lg:grid-cols-3'>
                  <div>
                    <dt className='text-neutral-500'>Origin</dt>
                    <dd className='mt-1 font-medium'>
                      {formatLabel(refund.origin)}
                    </dd>
                  </div>

                  <div>
                    <dt className='text-neutral-500'>Scope</dt>
                    <dd className='mt-1 font-medium'>
                      {getScopeSummary(refund)}
                    </dd>
                  </div>

                  <div>
                    <dt className='text-neutral-500'>Currency</dt>
                    <dd className='mt-1 font-medium'>{refund.currency}</dd>
                  </div>
                </dl>

                <Link
                  to={`/account/refunds/${refund.id}`}
                  className='mt-5 inline-flex text-sm font-medium underline underline-offset-4'>
                  View Refund details
                </Link>
              </article>
            ))}
          </section>

          <div className='mt-5 flex flex-col gap-3 border border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between'>
            <p className='text-sm text-neutral-600'>
              {meta.totalItems} Refund
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

export default RefundsPage;
