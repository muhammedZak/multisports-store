import { useCallback, useEffect, useState } from 'react';

import { Link } from 'react-router';

import {
  createProductReview,
  fetchMyReviews,
  fetchPublicProductReviews,
} from '../../../api/reviewApi.js';

import { normalizeApiError } from '../../../api/errors.js';

const DEFAULT_QUERY = {
  page: 1,
  limit: 10,
  rating: '',
  sort: 'createdAt',
  order: 'desc',
};

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
});

function RatingStars({ rating }) {
  return (
    <span aria-label={`${rating} out of 5 stars`} className='tracking-wide'>
      <span aria-hidden='true'>{'★'.repeat(rating)}</span>

      <span aria-hidden='true' className='text-neutral-300'>
        {'★'.repeat(5 - rating)}
      </span>
    </span>
  );
}

function ProductReviewsSection({
  productId,
  user,
  authInitialized,
  averageRating,
  reviewCount,
  onRatingSummaryChange,
}) {
  const [reviews, setReviews] = useState([]);

  const [query, setQuery] = useState(DEFAULT_QUERY);

  const [meta, setMeta] = useState({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 0,
  });

  const [ratingSummary, setRatingSummary] = useState({
    averageRating,
    reviewCount,
  });

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [reloadKey, setReloadKey] = useState(0);

  const [ownReview, setOwnReview] = useState(null);

  const [ownReviewLoading, setOwnReviewLoading] = useState(false);

  const [ownReviewError, setOwnReviewError] = useState(null);

  const [form, setForm] = useState({
    rating: 5,
    text: '',
  });

  const [formError, setFormError] = useState(null);

  const [submitting, setSubmitting] = useState(false);

  const [successMessage, setSuccessMessage] = useState('');

  const [reviewCreationUnavailable, setReviewCreationUnavailable] =
    useState(false);

  useEffect(() => {
    setRatingSummary({
      averageRating,
      reviewCount,
    });
  }, [averageRating, reviewCount, productId]);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchPublicProductReviews(productId, query);

      setReviews(result.items);
      setMeta(result.meta);

      setRatingSummary(result.ratingSummary);

      onRatingSummaryChange?.(result.ratingSummary);
    } catch (requestError) {
      setError(
        normalizeApiError(requestError, 'Unable to load product reviews.'),
      );
    } finally {
      setLoading(false);
    }
  }, [onRatingSummaryChange, productId, query]);

  useEffect(() => {
    // reloadKey intentionally retriggers this effect after a review mutation.
    void reloadKey;

    loadReviews();
  }, [loadReviews, reloadKey]);

  const loadOwnReview = useCallback(async () => {
    if (!authInitialized || user?.role !== 'customer') {
      setOwnReview(null);
      setOwnReviewError(null);
      setOwnReviewLoading(false);

      return;
    }

    setOwnReviewLoading(true);
    setOwnReviewError(null);

    try {
      const result = await fetchMyReviews({
        page: 1,
        limit: 1,
        productId,
      });

      setOwnReview(result.items[0] ?? null);
    } catch (requestError) {
      setOwnReviewError(
        normalizeApiError(requestError, 'Unable to check your Review status.'),
      );
    } finally {
      setOwnReviewLoading(false);
    }
  }, [authInitialized, productId, user?.role]);

  useEffect(() => {
    setOwnReview(null);

    setReviewCreationUnavailable(false);

    setSuccessMessage('');
    setFormError(null);

    setForm({
      rating: 5,
      text: '',
    });

    loadOwnReview();
  }, [loadOwnReview, productId, user?.id]);

  function handleRatingFilterChange(event) {
    setQuery((current) => ({
      ...current,
      page: 1,
      rating: event.target.value,
    }));
  }

  function handleSortChange(event) {
    const [sort, order] = event.target.value.split(':');

    setQuery((current) => ({
      ...current,
      page: 1,
      sort,
      order,
    }));
  }

  function changePage(page) {
    setQuery((current) => ({
      ...current,
      page,
    }));
  }

  function handleFormChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,

      [name]: name === 'rating' ? Number(value) : value,
    }));

    setFormError(null);
    setSuccessMessage('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (user?.role !== 'customer' || submitting || ownReview) {
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setSuccessMessage('');

    try {
      const review = await createProductReview(productId, {
        rating: form.rating,
        text: form.text,
      });

      setOwnReview(review);

      setForm({
        rating: 5,
        text: '',
      });

      setSuccessMessage('Your review has been submitted.');

      /*
       * Return to the normal newest-first
       * list so the new Review can be seen.
       */
      setQuery(DEFAULT_QUERY);

      setReloadKey((current) => current + 1);
    } catch (requestError) {
      const normalized = normalizeApiError(
        requestError,
        'Unable to submit your review.',
      );

      if (normalized.code === 'REVIEW_NOT_ELIGIBLE') {
        setReviewCreationUnavailable(true);
      }

      if (normalized.code === 'DUPLICATE_REVIEW') {
        await loadOwnReview();
      }

      setFormError(normalized);
    } finally {
      setSubmitting(false);
    }
  }

  const reviewSortValue = `${query.sort}:${query.order}`;

  const customer = user?.role === 'customer';

  return (
    <section id='reviews' className='mt-10 border-t border-neutral-200 pt-8'>
      <div className='flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <p className='text-sm font-medium uppercase tracking-[0.16em] text-neutral-500'>
            Customer feedback
          </p>

          <h2 className='mt-2 text-2xl font-semibold'>Reviews</h2>

          {ratingSummary.reviewCount > 0 ? (
            <div className='mt-3 flex flex-wrap items-center gap-2 text-sm'>
              <span aria-hidden='true' className='text-lg'>
                ★
              </span>

              <span className='font-semibold'>
                {Number(ratingSummary.averageRating).toFixed(1)}
              </span>

              <span className='text-neutral-500'>
                out of 5 · {ratingSummary.reviewCount} review
                {ratingSummary.reviewCount === 1 ? '' : 's'}
              </span>
            </div>
          ) : (
            <p className='mt-3 text-sm text-neutral-500'>No reviews yet.</p>
          )}
        </div>

        <div className='flex flex-wrap gap-3'>
          <div>
            <label htmlFor='review-rating-filter' className='sr-only'>
              Filter Review rating
            </label>

            <select
              id='review-rating-filter'
              value={query.rating}
              onChange={handleRatingFilterChange}
              className='border border-neutral-300 bg-white px-3 py-2.5 text-sm'>
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
            <label htmlFor='review-sort' className='sr-only'>
              Sort Reviews
            </label>

            <select
              id='review-sort'
              value={reviewSortValue}
              onChange={handleSortChange}
              className='border border-neutral-300 bg-white px-3 py-2.5 text-sm'>
              <option value='createdAt:desc'>Newest</option>

              <option value='createdAt:asc'>Oldest</option>

              <option value='rating:desc'>Highest rating</option>

              <option value='rating:asc'>Lowest rating</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div
          role='alert'
          className='mt-6 border border-red-200 bg-red-50 p-4 text-sm text-red-700'>
          <p>{error.message}</p>

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
          <p className='text-sm text-neutral-600'>Loading reviews...</p>
        </div>
      )}

      {!loading && !error && reviews.length === 0 && (
        <div className='mt-6 border border-neutral-200 p-6'>
          <p className='text-sm text-neutral-600'>
            {query.rating
              ? `No ${query.rating}-star reviews yet.`
              : 'Be the first Customer to review this product.'}
          </p>
        </div>
      )}

      {!loading && !error && reviews.length > 0 && (
        <>
          <div className='mt-6 divide-y divide-neutral-200 border-y border-neutral-200'>
            {reviews.map((review) => (
              <article key={review.id} className='py-6'>
                <div className='flex items-start gap-3'>
                  {review.reviewer?.profilePhotoUrl ? (
                    <img
                      src={review.reviewer.profilePhotoUrl}
                      alt=''
                      className='h-10 w-10 rounded-full object-cover'
                    />
                  ) : (
                    <div
                      aria-hidden='true'
                      className='flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-sm font-semibold'>
                      {review.reviewer?.name
                        ?.trim()
                        ?.charAt(0)
                        ?.toUpperCase() || '?'}
                    </div>
                  )}

                  <div>
                    <p className='text-sm font-medium'>
                      {review.reviewer?.name || 'Customer'}
                    </p>

                    <p className='mt-1 text-xs text-neutral-500'>
                      {dateFormatter.format(new Date(review.createdAt))}
                    </p>
                  </div>
                </div>

                <div className='mt-4 text-amber-600'>
                  <RatingStars rating={review.rating} />
                </div>

                <p className='mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-neutral-700'>
                  {review.text}
                </p>
              </article>
            ))}
          </div>

          <div className='mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <p className='text-sm text-neutral-500'>
              {meta.totalItems} matching review
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

      <div className='mt-10 border-t border-neutral-200 pt-8'>
        <h3 className='text-lg font-semibold'>Write a review</h3>

        {!authInitialized && (
          <p className='mt-3 text-sm text-neutral-600'>
            Checking your account...
          </p>
        )}

        {authInitialized && !user && (
          <div className='mt-4 border border-neutral-200 p-5'>
            <p className='text-sm leading-6 text-neutral-600'>
              Sign in with your Customer account to review a product you have
              purchased.
            </p>

            <Link
              to='/auth/login'
              className='mt-4 inline-flex bg-black px-4 py-2.5 text-sm font-medium text-white'>
              Sign in to review
            </Link>
          </div>
        )}

        {authInitialized && user && !customer && (
          <p className='mt-3 text-sm text-neutral-600'>
            Reviews can be submitted only from Customer accounts.
          </p>
        )}

        {customer && ownReviewLoading && (
          <p className='mt-3 text-sm text-neutral-600'>
            Checking your existing Review...
          </p>
        )}

        {customer && ownReviewError && (
          <div
            role='alert'
            className='mt-4 border border-red-200 bg-red-50 p-4 text-sm text-red-700'>
            <p>{ownReviewError.message}</p>

            <button
              type='button'
              onClick={loadOwnReview}
              className='mt-3 font-medium underline underline-offset-4'>
              Try again
            </button>
          </div>
        )}

        {customer && !ownReviewLoading && !ownReviewError && ownReview && (
          <div className='mt-4 border border-neutral-200 p-5'>
            <p className='text-sm leading-6 text-neutral-600'>
              You have already reviewed this product. One Review is allowed per
              Customer/Product.
            </p>

            <Link
              to='/account/reviews'
              className='mt-4 inline-block text-sm font-medium underline underline-offset-4'>
              Manage my review
            </Link>
          </div>
        )}

        {customer &&
          !ownReviewLoading &&
          !ownReviewError &&
          !ownReview &&
          reviewCreationUnavailable && (
            <div className='mt-4 border border-amber-200 bg-amber-50 p-5'>
              <p className='text-sm leading-6 text-amber-800'>
                You can review this product after a qualifying non-cancelled
                purchase.
              </p>
            </div>
          )}

        {customer &&
          !ownReviewLoading &&
          !ownReviewError &&
          !ownReview &&
          !reviewCreationUnavailable && (
            <form onSubmit={handleSubmit} className='mt-5 max-w-2xl space-y-5'>
              <p className='text-sm leading-6 text-neutral-600'>
                Reviews are available after a qualifying purchase of this
                product.
              </p>

              <div>
                <label
                  htmlFor='new-review-rating'
                  className='mb-2 block text-sm font-medium'>
                  Rating
                </label>

                <select
                  id='new-review-rating'
                  name='rating'
                  value={form.rating}
                  disabled={submitting}
                  onChange={handleFormChange}
                  className='w-full border border-neutral-300 bg-white px-3 py-2.5 sm:max-w-xs'>
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <option key={rating} value={rating}>
                      {rating} star
                      {rating === 1 ? '' : 's'}
                    </option>
                  ))}
                </select>

                {formError?.fields?.rating && (
                  <p className='mt-2 text-sm text-red-600'>
                    {formError.fields.rating}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor='new-review-text'
                  className='mb-2 block text-sm font-medium'>
                  Review
                </label>

                <textarea
                  id='new-review-text'
                  name='text'
                  rows={5}
                  maxLength={1000}
                  value={form.text}
                  disabled={submitting}
                  onChange={handleFormChange}
                  className='w-full border border-neutral-300 px-3 py-2.5 outline-none focus:border-black'
                  placeholder='Share your experience with this product.'
                />

                <div className='mt-2 flex justify-between gap-3'>
                  <p className='text-xs text-neutral-500'>
                    Maximum 1000 characters.
                  </p>

                  <p className='text-xs text-neutral-500'>
                    {form.text.length}
                    /1000
                  </p>
                </div>

                {formError?.fields?.text && (
                  <p className='mt-2 text-sm text-red-600'>
                    {formError.fields.text}
                  </p>
                )}
              </div>

              {formError && (
                <div
                  role='alert'
                  className='border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
                  {formError.message}
                </div>
              )}

              {successMessage && (
                <div
                  role='status'
                  className='border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700'>
                  {successMessage}
                </div>
              )}

              <button
                type='submit'
                disabled={submitting || !form.text.trim()}
                className='bg-black px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50'>
                {submitting ? 'Submitting...' : 'Submit review'}
              </button>
            </form>
          )}

        {customer && ownReview && successMessage && (
          <div
            role='status'
            className='mt-4 border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700'>
            {successMessage}
          </div>
        )}
      </div>
    </section>
  );
}

export default ProductReviewsSection;
