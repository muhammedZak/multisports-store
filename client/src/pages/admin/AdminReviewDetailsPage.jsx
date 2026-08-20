import { useCallback, useEffect, useState } from 'react';

import { Link, useParams } from 'react-router';

import { normalizeApiError } from '../../api/errors.js';

import { fetchAdminReview, moderateAdminReview } from '../../api/reviewApi.js';

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

function AdminReviewDetailsPage() {
  const { reviewId } = useParams();

  const [review, setReview] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [reason, setReason] = useState('');

  const [moderationLoading, setModerationLoading] = useState(false);

  const [moderationError, setModerationError] = useState(null);

  const [message, setMessage] = useState('');

  const loadReview = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const item = await fetchAdminReview(reviewId);

      setReview(item);
    } catch (requestError) {
      setReview(null);

      setError(normalizeApiError(requestError, 'Unable to load this Review.'));
    } finally {
      setLoading(false);
    }
  }, [reviewId]);

  useEffect(() => {
    loadReview();
  }, [loadReview]);

  async function handleHide(event) {
    event.preventDefault();

    if (!review || moderationLoading) {
      return;
    }

    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      setModerationError({
        message: 'Enter a moderation reason before hiding this Review.',
      });

      return;
    }

    const confirmed = window.confirm(
      'Hide this Review from the public storefront?',
    );

    if (!confirmed) {
      return;
    }

    setModerationLoading(true);

    setModerationError(null);

    setMessage('');

    try {
      const updated = await moderateAdminReview(review.id, {
        moderationStatus: 'hidden',

        reason: trimmedReason,
      });

      setReview(updated);

      setReason('');

      setMessage('Review hidden successfully.');
    } catch (requestError) {
      setModerationError(
        normalizeApiError(requestError, 'Unable to hide this Review.'),
      );
    } finally {
      setModerationLoading(false);
    }
  }

  async function handleRestore() {
    if (!review || moderationLoading) {
      return;
    }

    const confirmed = window.confirm(
      'Restore this Review to the public storefront?',
    );

    if (!confirmed) {
      return;
    }

    setModerationLoading(true);

    setModerationError(null);

    setMessage('');

    try {
      const updated = await moderateAdminReview(review.id, {
        moderationStatus: 'visible',
      });

      setReview(updated);

      setMessage('Review restored successfully.');
    } catch (requestError) {
      setModerationError(
        normalizeApiError(requestError, 'Unable to restore this Review.'),
      );
    } finally {
      setModerationLoading(false);
    }
  }

  if (loading) {
    return (
      <main className='p-5 sm:p-6'>
        <p className='text-sm text-neutral-600'>Loading Review...</p>
      </main>
    );
  }

  if (error && !review) {
    return (
      <main className='p-5 sm:p-6'>
        <div
          role='alert'
          className='border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          {error.code === 'REVIEW_NOT_FOUND'
            ? 'Review not found.'
            : error.message}
        </div>

        <div className='mt-5 flex flex-wrap gap-3'>
          {error.code !== 'REVIEW_NOT_FOUND' && (
            <button
              type='button'
              onClick={loadReview}
              className='bg-black px-4 py-2 text-sm font-medium text-white'>
              Try again
            </button>
          )}

          <Link
            to='/admin/reviews'
            className='px-4 py-2 text-sm font-medium underline underline-offset-4'>
            Back to Reviews
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className='p-5 sm:p-6'>
      <Link
        to='/admin/reviews'
        className='text-sm font-medium underline underline-offset-4'>
        Back to Reviews
      </Link>

      <div className='mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <p className='text-sm font-medium uppercase tracking-[0.2em] text-neutral-500'>
            Review details
          </p>

          <h1 className='mt-3 text-2xl font-semibold sm:text-3xl'>
            Customer Review
          </h1>

          <p className='mt-2 text-sm text-neutral-500'>
            Submitted {formatDate(review.createdAt)}
          </p>
        </div>

        <span
          className={[
            'inline-flex w-fit px-3 py-1.5 text-sm font-medium capitalize',
            getStatusClass(review.moderationStatus),
          ].join(' ')}>
          {review.moderationStatus}
        </span>
      </div>

      {message && (
        <div
          role='status'
          className='mt-6 border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700'>
          {message}
        </div>
      )}

      {moderationError && (
        <div
          role='alert'
          className='mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          {moderationError.message}
        </div>
      )}

      <section className='mt-8 border border-neutral-200 p-5'>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <h2 className='text-lg font-semibold'>Customer content</h2>

          <p
            className='font-semibold'
            aria-label={`${review.rating} out of 5 stars`}>
            ★ {review.rating}/5
          </p>
        </div>

        <p className='mt-5 whitespace-pre-wrap text-sm leading-7 text-neutral-700'>
          {review.text}
        </p>

        <p className='mt-5 text-xs text-neutral-500'>
          Last Customer update: {formatDate(review.updatedAt)}
        </p>

        <p className='mt-3 text-xs font-medium text-neutral-500'>
          Rating and Review text are Customer-owned and cannot be edited by
          Admins.
        </p>
      </section>

      <div className='mt-6 grid gap-6 xl:grid-cols-2'>
        <section className='border border-neutral-200 p-5'>
          <h2 className='text-lg font-semibold'>Customer</h2>

          {review.customer ? (
            <dl className='mt-5 space-y-4 text-sm'>
              <div>
                <dt className='text-neutral-500'>Name</dt>

                <dd className='mt-1 font-medium'>{review.customer.name}</dd>
              </div>

              <div>
                <dt className='text-neutral-500'>Email</dt>

                <dd className='mt-1 break-all'>{review.customer.email}</dd>
              </div>

              <div>
                <dt className='text-neutral-500'>Customer ID</dt>

                <dd className='mt-1 break-all text-xs'>{review.customer.id}</dd>
              </div>
            </dl>
          ) : (
            <p className='mt-4 text-sm text-neutral-500'>
              Customer information is unavailable.
            </p>
          )}
        </section>

        <section className='border border-neutral-200 p-5'>
          <h2 className='text-lg font-semibold'>Product</h2>

          {review.product ? (
            <div className='mt-5 flex gap-4'>
              {review.product.primaryImage?.url && (
                <img
                  src={review.product.primaryImage.url}
                  alt={
                    review.product.primaryImage.altText || review.product.name
                  }
                  className='h-20 w-20 object-cover'
                />
              )}

              <div className='min-w-0'>
                <p className='font-medium'>{review.product.name}</p>

                <p className='mt-1 text-sm text-neutral-500'>
                  {review.product.brand} ·{' '}
                  <span className='capitalize'>{review.product.sport}</span>
                </p>

                <p className='mt-2 text-xs text-neutral-500'>
                  {review.product.isActive ? 'Active' : 'Inactive'}
                </p>

                <Link
                  to={`/admin/products/${review.product.id}`}
                  className='mt-3 inline-block text-sm font-medium underline underline-offset-4'>
                  View Product
                </Link>
              </div>
            </div>
          ) : (
            <p className='mt-4 text-sm text-neutral-500'>
              Product information is unavailable.
            </p>
          )}
        </section>
      </div>

      <section className='mt-6 border border-neutral-200 p-5'>
        <h2 className='text-lg font-semibold'>Moderation</h2>

        {review.moderationStatus === 'hidden' ? (
          <>
            <div className='mt-5 border border-amber-200 bg-amber-50 p-4'>
              <p className='text-sm font-medium text-amber-800'>
                This Review is hidden from the storefront.
              </p>

              {review.moderationReason && (
                <p className='mt-2 whitespace-pre-wrap text-sm leading-6 text-amber-800'>
                  Reason: {review.moderationReason}
                </p>
              )}
            </div>

            <button
              type='button'
              disabled={moderationLoading}
              onClick={handleRestore}
              className='mt-5 bg-black px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50'>
              {moderationLoading ? 'Restoring...' : 'Restore Review'}
            </button>
          </>
        ) : (
          <form onSubmit={handleHide} className='mt-5 max-w-2xl'>
            <label
              htmlFor='moderation-reason'
              className='block text-sm font-medium'>
              Reason for hiding
            </label>

            <textarea
              id='moderation-reason'
              rows={4}
              value={reason}
              disabled={moderationLoading}
              onChange={(event) => {
                setReason(event.target.value);

                setModerationError(null);

                setMessage('');
              }}
              placeholder='Explain why this Review should be hidden.'
              className='mt-2 w-full border border-neutral-300 px-3 py-2.5 outline-none focus:border-black'
            />

            <p className='mt-2 text-xs leading-5 text-neutral-500'>
              Hiding changes only storefront visibility. Customer rating and
              text remain unchanged.
            </p>

            <button
              type='submit'
              disabled={moderationLoading || !reason.trim()}
              className='mt-4 border border-red-300 px-5 py-2.5 text-sm font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-50'>
              {moderationLoading ? 'Hiding...' : 'Hide Review'}
            </button>
          </form>
        )}

        <dl className='mt-6 space-y-4 border-t border-neutral-200 pt-5 text-sm'>
          <div>
            <dt className='text-neutral-500'>Last moderated by</dt>

            <dd className='mt-1'>
              {review.moderatedBy
                ? `${review.moderatedBy.name} (${review.moderatedBy.email})`
                : 'Never moderated'}
            </dd>
          </div>

          <div>
            <dt className='text-neutral-500'>Last moderated at</dt>

            <dd className='mt-1'>{formatDate(review.moderatedAt)}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}

export default AdminReviewDetailsPage;
