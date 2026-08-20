import { useCallback, useEffect, useState } from 'react';

import { Link } from 'react-router';

import {
  deleteMyReview,
  fetchMyReviews,
  updateMyReview,
} from '../../api/reviewApi.js';

import { normalizeApiError } from '../../api/errors.js';

const EMPTY_FILTERS = {
  moderationStatus: '',
  order: 'desc',
};

const DEFAULT_QUERY = {
  ...EMPTY_FILTERS,
  page: 1,
  limit: 20,
  sort: 'createdAt',
};

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const STATUS_STYLES = {
  visible: 'bg-green-50 text-green-700',
  hidden: 'bg-amber-50 text-amber-700',
};

function ReviewsPage() {
  const [reviews, setReviews] = useState([]);

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

  const [editingReviewId, setEditingReviewId] = useState(null);

  const [editForm, setEditForm] = useState({
    rating: 5,
    text: '',
  });

  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [actionError, setActionError] = useState(null);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchMyReviews(query);

      setReviews(result.items);
      setMeta(result.meta);
    } catch (requestError) {
      setError(
        normalizeApiError(
          requestError,
          'Unable to load your reviews. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [query]);

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

  function startEditing(review) {
    setActionError(null);

    setEditingReviewId(review.id);

    setEditForm({
      rating: review.rating,
      text: review.text,
    });
  }

  function cancelEditing() {
    setEditingReviewId(null);

    setEditForm({
      rating: 5,
      text: '',
    });

    setActionError(null);
  }

  function handleEditChange(event) {
    const { name, value } = event.target;

    setEditForm((current) => ({
      ...current,

      [name]: name === 'rating' ? Number(value) : value,
    }));
  }

  async function handleSaveReview(reviewId) {
    setActionLoadingId(reviewId);
    setActionError(null);

    try {
      const updatedReview = await updateMyReview(reviewId, editForm);

      setReviews((current) =>
        current.map((review) =>
          review.id === reviewId ? updatedReview : review,
        ),
      );

      setEditingReviewId(null);
    } catch (requestError) {
      setActionError(
        normalizeApiError(
          requestError,
          'Unable to update your review. Please try again.',
        ),
      );
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDeleteReview(review) {
    const confirmed = window.confirm('Delete this review permanently?');

    if (!confirmed) {
      return;
    }

    setActionLoadingId(review.id);
    setActionError(null);

    try {
      await deleteMyReview(review.id);

      /*
       * If the last Review on a later
       * page was deleted, move back one
       * page instead of leaving an empty
       * pagination page.
       */
      if (reviews.length === 1 && meta.page > 1) {
        setQuery((current) => ({
          ...current,
          page: current.page - 1,
        }));

        return;
      }

      await loadReviews();
    } catch (requestError) {
      setActionError(
        normalizeApiError(
          requestError,
          'Unable to delete your review. Please try again.',
        ),
      );
    } finally {
      setActionLoadingId(null);
    }
  }

  const filtersActive = Boolean(query.moderationStatus);

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

        <h1 className='mt-3 text-3xl font-semibold'>My reviews</h1>

        <p className='mt-3 max-w-2xl text-sm leading-6 text-neutral-600'>
          View, edit, or delete the product reviews you have submitted.
        </p>
      </div>

      <form
        onSubmit={handleFilterSubmit}
        className='mt-8 grid gap-4 border border-neutral-200 p-4 sm:grid-cols-2'>
        <div>
          <label
            htmlFor='moderationStatus'
            className='mb-2 block text-sm font-medium'>
            Review status
          </label>

          <select
            id='moderationStatus'
            name='moderationStatus'
            value={filterForm.moderationStatus}
            onChange={handleFilterChange}
            className='w-full border border-neutral-300 bg-white px-3 py-2.5 outline-none focus:border-black'>
            <option value=''>All reviews</option>

            <option value='visible'>Visible</option>

            <option value='hidden'>Hidden</option>
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

      {actionError && (
        <div
          role='alert'
          className='mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          {actionError.message}
        </div>
      )}

      {error && (
        <div
          role='alert'
          className='mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          {error.message}
        </div>
      )}

      {loading && (
        <section className='mt-6 border border-neutral-200 p-8'>
          <p className='text-sm text-neutral-600'>Loading your reviews...</p>
        </section>
      )}

      {!loading && error && reviews.length === 0 && (
        <button
          type='button'
          onClick={loadReviews}
          className='mt-4 bg-black px-4 py-2 text-sm font-medium text-white'>
          Try again
        </button>
      )}

      {!loading && !error && reviews.length === 0 && (
        <section className='mt-6 border border-neutral-200 p-8 text-center'>
          <h2 className='text-lg font-semibold'>
            {filtersActive ? 'No matching reviews' : 'No reviews yet'}
          </h2>

          <p className='mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-600'>
            {filtersActive
              ? 'No reviews match the selected status.'
              : 'Reviews you submit for purchased products will appear here.'}
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
              Browse products
            </Link>
          )}
        </section>
      )}

      {!loading && reviews.length > 0 && (
        <>
          <section className='mt-6 space-y-4'>
            {reviews.map((review) => {
              const editing = editingReviewId === review.id;

              const actionLoading = actionLoadingId === review.id;

              return (
                <article
                  key={review.id}
                  className='border border-neutral-200 p-5 sm:p-6'>
                  <div className='flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between'>
                    <div className='flex min-w-0 gap-4'>
                      {review.product?.primaryImage?.url ? (
                        <img
                          src={review.product.primaryImage.url}
                          alt={
                            review.product.primaryImage.altText ||
                            review.product.name
                          }
                          className='h-20 w-20 shrink-0 object-cover'
                        />
                      ) : (
                        <div className='flex h-20 w-20 shrink-0 items-center justify-center bg-neutral-100 text-xs text-neutral-500'>
                          No image
                        </div>
                      )}

                      <div className='min-w-0'>
                        <p className='font-semibold'>
                          {review.product?.name || 'Product unavailable'}
                        </p>

                        {review.product?.isActive ? (
                          <Link
                            to={`/products/${review.product.id}`}
                            className='mt-2 inline-block text-sm font-medium underline underline-offset-4'>
                            View product
                          </Link>
                        ) : (
                          <p className='mt-2 text-xs text-neutral-500'>
                            This product is not currently available in the
                            storefront.
                          </p>
                        )}
                      </div>
                    </div>

                    <span
                      className={[
                        'inline-flex w-fit px-2.5 py-1 text-xs font-medium capitalize',
                        STATUS_STYLES[review.moderationStatus] ??
                          'bg-neutral-100 text-neutral-700',
                      ].join(' ')}>
                      {review.moderationStatus}
                    </span>
                  </div>

                  {review.moderationStatus === 'hidden' && (
                    <div className='mt-5 border border-amber-200 bg-amber-50 p-4'>
                      <p className='text-sm font-medium text-amber-800'>
                        This review is hidden from the storefront.
                      </p>

                      {review.moderationReason && (
                        <p className='mt-2 text-sm leading-6 text-amber-800'>
                          Reason: {review.moderationReason}
                        </p>
                      )}
                    </div>
                  )}

                  {editing ? (
                    <div className='mt-5 space-y-4 border-t border-neutral-200 pt-5'>
                      <div>
                        <label
                          htmlFor={`rating-${review.id}`}
                          className='mb-2 block text-sm font-medium'>
                          Rating
                        </label>

                        <select
                          id={`rating-${review.id}`}
                          name='rating'
                          value={editForm.rating}
                          disabled={actionLoading}
                          onChange={handleEditChange}
                          className='w-full border border-neutral-300 bg-white px-3 py-2.5 outline-none focus:border-black sm:max-w-xs'>
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
                          htmlFor={`text-${review.id}`}
                          className='mb-2 block text-sm font-medium'>
                          Review
                        </label>

                        <textarea
                          id={`text-${review.id}`}
                          name='text'
                          value={editForm.text}
                          maxLength={1000}
                          rows={5}
                          disabled={actionLoading}
                          onChange={handleEditChange}
                          className='w-full border border-neutral-300 px-3 py-2.5 outline-none focus:border-black'
                        />

                        <p className='mt-1 text-xs text-neutral-500'>
                          {editForm.text.length}
                          /1000
                        </p>
                      </div>

                      {review.moderationStatus === 'hidden' && (
                        <p className='text-sm text-neutral-600'>
                          Editing this review will not automatically make it
                          visible again.
                        </p>
                      )}

                      <div className='flex flex-wrap gap-3'>
                        <button
                          type='button'
                          disabled={actionLoading}
                          onClick={() => handleSaveReview(review.id)}
                          className='bg-black px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50'>
                          {actionLoading ? 'Saving...' : 'Save changes'}
                        </button>

                        <button
                          type='button'
                          disabled={actionLoading}
                          onClick={cancelEditing}
                          className='border border-neutral-300 px-4 py-2.5 text-sm font-medium disabled:opacity-50'>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className='mt-5'>
                        <p
                          className='text-lg tracking-wide'
                          aria-label={`${review.rating} out of 5 stars`}>
                          {'★'.repeat(review.rating)}
                          <span className='text-neutral-300'>
                            {'★'.repeat(5 - review.rating)}
                          </span>
                        </p>

                        <p className='mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-700'>
                          {review.text}
                        </p>

                        <p className='mt-3 text-xs text-neutral-500'>
                          Submitted{' '}
                          {dateFormatter.format(new Date(review.createdAt))}
                          {review.updatedAt !== review.createdAt && ' · Edited'}
                        </p>
                      </div>

                      <div className='mt-5 flex flex-wrap gap-3 border-t border-neutral-200 pt-5'>
                        <button
                          type='button'
                          disabled={Boolean(actionLoadingId)}
                          onClick={() => startEditing(review)}
                          className='border border-neutral-300 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50'>
                          Edit
                        </button>

                        <button
                          type='button'
                          disabled={Boolean(actionLoadingId)}
                          onClick={() => handleDeleteReview(review)}
                          className='border border-red-300 px-4 py-2 text-sm font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-50'>
                          {actionLoading ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </>
                  )}
                </article>
              );
            })}
          </section>

          <div className='mt-5 flex flex-col gap-3 border border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between'>
            <p className='text-sm text-neutral-600'>
              {meta.totalItems} review
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

export default ReviewsPage;
