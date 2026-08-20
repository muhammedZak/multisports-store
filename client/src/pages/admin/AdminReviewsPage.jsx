import { useCallback, useEffect, useState } from 'react';

import { Link } from 'react-router';

import { normalizeApiError } from '../../api/errors.js';

import { fetchAdminReviews } from '../../api/reviewApi.js';

const EMPTY_FILTERS = {
  productId: '',
  customerId: '',
  rating: '',
  moderationStatus: '',
  sort: 'createdAt',
  order: 'desc',
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

function formatDate(value) {
  if (!value) {
    return '—';
  }

  return dateFormatter.format(new Date(value));
}

function getStatusClass(status) {
  if (status === 'visible') {
    return 'bg-green-100 text-green-700';
  }

  if (status === 'hidden') {
    return 'bg-amber-100 text-amber-700';
  }

  return 'bg-neutral-100 text-neutral-700';
}

function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);

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

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setListError(null);

    try {
      const result = await fetchAdminReviews(appliedFilters);

      setReviews(result.items);

      setMeta(result.meta);
    } catch (requestError) {
      setListError(
        normalizeApiError(
          requestError,
          'Unable to load Reviews. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

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

      productId: filterForm.productId.trim(),

      customerId: filterForm.customerId.trim(),

      page: 1,
      limit: 20,
    });
  }

  function resetFilters() {
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
    appliedFilters.productId ||
    appliedFilters.customerId ||
    appliedFilters.rating ||
    appliedFilters.moderationStatus ||
    appliedFilters.sort !== 'createdAt' ||
    appliedFilters.order !== 'desc',
  );

  return (
    <main className='p-5 sm:p-6'>
      <div>
        <p className='text-sm font-medium uppercase tracking-[0.2em] text-neutral-500'>
          Review management
        </p>

        <h1 className='mt-3 text-3xl font-semibold'>Reviews</h1>

        <p className='mt-3 max-w-2xl text-sm leading-6 text-neutral-600'>
          Inspect Customer Reviews and moderate storefront visibility. Customer
          rating and Review text cannot be edited by Admins.
        </p>
      </div>

      <form
        onSubmit={handleFilterSubmit}
        className='mt-8 grid gap-4 border border-neutral-200 p-4 md:grid-cols-2 xl:grid-cols-3'>
        <div>
          <label htmlFor='productId' className='mb-2 block text-sm font-medium'>
            Product ID
          </label>

          <input
            id='productId'
            name='productId'
            value={filterForm.productId}
            onChange={handleFilterChange}
            placeholder='Optional Product ID'
            className='w-full border border-neutral-300 px-3 py-2.5 outline-none focus:border-black'
          />
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
          <label htmlFor='rating' className='mb-2 block text-sm font-medium'>
            Rating
          </label>

          <select
            id='rating'
            name='rating'
            value={filterForm.rating}
            onChange={handleFilterChange}
            className='w-full border border-neutral-300 bg-white px-3 py-2.5 outline-none focus:border-black'>
            <option value=''>All ratings</option>

            {[5, 4, 3, 2, 1].map((rating) => (
              <option key={rating} value={rating}>
                {rating} star
                {rating === 1 ? '' : 's'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor='moderationStatus'
            className='mb-2 block text-sm font-medium'>
            Moderation status
          </label>

          <select
            id='moderationStatus'
            name='moderationStatus'
            value={filterForm.moderationStatus}
            onChange={handleFilterChange}
            className='w-full border border-neutral-300 bg-white px-3 py-2.5 outline-none focus:border-black'>
            <option value=''>All statuses</option>

            <option value='visible'>Visible</option>

            <option value='hidden'>Hidden</option>
          </select>
        </div>

        <div>
          <label htmlFor='sort' className='mb-2 block text-sm font-medium'>
            Sort by
          </label>

          <select
            id='sort'
            name='sort'
            value={filterForm.sort}
            onChange={handleFilterChange}
            className='w-full border border-neutral-300 bg-white px-3 py-2.5 outline-none focus:border-black'>
            <option value='createdAt'>Submitted date</option>

            <option value='rating'>Rating</option>
          </select>
        </div>

        <div>
          <label htmlFor='order' className='mb-2 block text-sm font-medium'>
            Order
          </label>

          <select
            id='order'
            name='order'
            value={filterForm.order}
            onChange={handleFilterChange}
            className='w-full border border-neutral-300 bg-white px-3 py-2.5 outline-none focus:border-black'>
            <option value='desc'>Descending</option>

            <option value='asc'>Ascending</option>
          </select>
        </div>

        <div className='flex flex-wrap gap-3 md:col-span-2 xl:col-span-3'>
          <button
            type='submit'
            disabled={loading}
            className='bg-black px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50'>
            Apply filters
          </button>

          <button
            type='button'
            disabled={loading}
            onClick={resetFilters}
            className='border border-neutral-300 px-4 py-2.5 text-sm font-medium disabled:opacity-50'>
            Reset
          </button>
        </div>
      </form>

      {listError && (
        <div
          role='alert'
          className='mt-6 border border-red-200 bg-red-50 p-4 text-sm text-red-700'>
          <p>{listError.message}</p>

          <button
            type='button'
            onClick={loadReviews}
            className='mt-3 font-medium underline underline-offset-4'>
            Try again
          </button>
        </div>
      )}

      {loading && (
        <div className='mt-6 border border-neutral-200 p-6'>
          <p className='text-sm text-neutral-600'>Loading Reviews...</p>
        </div>
      )}

      {!loading && !listError && reviews.length === 0 && (
        <section className='mt-6 border border-neutral-200 p-8 text-center'>
          <h2 className='text-lg font-semibold'>
            {filtersActive ? 'No matching Reviews' : 'No Reviews yet'}
          </h2>

          <p className='mt-2 text-sm text-neutral-600'>
            {filtersActive
              ? 'Try changing or clearing the Review filters.'
              : 'Customer Reviews will appear here after submission.'}
          </p>

          {filtersActive && (
            <button
              type='button'
              onClick={resetFilters}
              className='mt-5 border border-neutral-300 px-4 py-2 text-sm font-medium'>
              Clear filters
            </button>
          )}
        </section>
      )}

      {!loading && !listError && reviews.length > 0 && (
        <>
          <div className='mt-6 space-y-4'>
            {reviews.map((review) => (
              <article
                key={review.id}
                className='border border-neutral-200 p-5'>
                <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                  <div>
                    <div className='flex flex-wrap items-center gap-3'>
                      <p className='font-semibold'>
                        {review.product?.name || 'Product unavailable'}
                      </p>

                      <span
                        className={[
                          'px-2.5 py-1 text-xs font-medium capitalize',
                          getStatusClass(review.moderationStatus),
                        ].join(' ')}>
                        {review.moderationStatus}
                      </span>
                    </div>

                    <p className='mt-2 text-sm text-neutral-600'>
                      Customer: {review.customer?.name || 'Unavailable'}
                    </p>

                    {review.customer?.email && (
                      <p className='mt-1 break-all text-xs text-neutral-500'>
                        {review.customer.email}
                      </p>
                    )}
                  </div>

                  <p
                    className='text-sm font-semibold'
                    aria-label={`${review.rating} out of 5 stars`}>
                    ★ {review.rating}/5
                  </p>
                </div>

                <p className='mt-4 text-sm leading-6 text-neutral-700'>
                  {review.text.length > 180
                    ? `${review.text.slice(0, 180)}…`
                    : review.text}
                </p>

                {review.moderationStatus === 'hidden' &&
                  review.moderationReason && (
                    <div className='mt-4 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800'>
                      Hidden reason: {review.moderationReason}
                    </div>
                  )}

                <div className='mt-5 flex flex-col gap-3 border-t border-neutral-200 pt-4 sm:flex-row sm:items-center sm:justify-between'>
                  <p className='text-xs text-neutral-500'>
                    Submitted {formatDate(review.createdAt)}
                  </p>

                  <Link
                    to={`/admin/reviews/${review.id}`}
                    className='text-sm font-medium underline underline-offset-4'>
                    View Review
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <div className='mt-6 flex flex-col gap-4 border-t border-neutral-200 pt-5 sm:flex-row sm:items-center sm:justify-between'>
            <p className='text-sm text-neutral-600'>
              {meta.totalItems} Review
              {meta.totalItems === 1 ? '' : 's'}
            </p>

            <div className='flex items-center gap-3'>
              <button
                type='button'
                disabled={meta.page <= 1}
                onClick={() => changePage(meta.page - 1)}
                className='border border-neutral-300 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40'>
                Previous
              </button>

              <span className='text-sm'>
                Page {meta.page} of {Math.max(meta.totalPages, 1)}
              </span>

              <button
                type='button'
                disabled={meta.page >= meta.totalPages}
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

export default AdminReviewsPage;
