import { Link } from 'react-router';

import { reviewDateFormatter } from '../review.utils.js';

export function AdminReviewDetailsView({ review }) {
  return (
    <div className='mt-8 space-y-10'>
      <section className='border-y border-[var(--color-border)] py-6'>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <h2 className='mb-0 text-lg font-black'>Customer content</h2>

          <p
            className='mb-0 text-lg font-black'
            aria-label={`${review.rating} out of 5 stars`}>
            ★ {review.rating}/5
          </p>
        </div>

        <p className='mt-5 mb-0 whitespace-pre-wrap text-sm leading-7 text-[var(--color-ink-soft)]'>
          {review.text}
        </p>

        <p className='mt-5 mb-0 text-xs text-[var(--color-muted)]'>
          Last Customer update:{' '}
          {reviewDateFormatter.format(new Date(review.updatedAt))}
        </p>

        <p className='mt-2 mb-0 text-xs font-semibold text-[var(--color-muted)]'>
          Rating and Review text are Customer-owned and cannot be edited by
          Admins.
        </p>
      </section>

      <div className='grid gap-10 xl:grid-cols-2'>
        <section className='border-t border-[var(--color-border)] pt-6'>
          <h2 className='mb-0 text-lg font-black'>Customer</h2>

          {review.customer ? (
            <dl className='mt-5 space-y-4 text-sm'>
              <div>
                <dt className='text-[var(--color-muted)]'>Name</dt>

                <dd className='mt-1 mb-0 font-semibold'>
                  {review.customer.name}
                </dd>
              </div>

              <div>
                <dt className='text-[var(--color-muted)]'>Email</dt>

                <dd className='mt-1 mb-0 break-all'>{review.customer.email}</dd>
              </div>

              <div>
                <dt className='text-[var(--color-muted)]'>Customer ID</dt>

                <dd className='mt-1 mb-0 break-all text-xs'>
                  {review.customer.id}
                </dd>
              </div>
            </dl>
          ) : (
            <p className='mt-4 mb-0 text-sm text-[var(--color-muted)]'>
              Customer information is unavailable.
            </p>
          )}
        </section>

        <section className='border-t border-[var(--color-border)] pt-6'>
          <h2 className='mb-0 text-lg font-black'>Product</h2>

          {review.product ? (
            <div className='mt-5 flex gap-4'>
              {review.product.primaryImage?.url ? (
                <img
                  src={review.product.primaryImage.url}
                  alt={
                    review.product.primaryImage.altText || review.product.name
                  }
                  className='size-20 object-cover'
                />
              ) : null}

              <div className='min-w-0'>
                <p className='mb-0 font-bold'>{review.product.name}</p>

                <p className='mt-1 mb-0 text-sm text-[var(--color-muted)]'>
                  {review.product.brand} ·{' '}
                  <span className='capitalize'>{review.product.sport}</span>
                </p>

                <p className='mt-2 mb-0 text-xs text-[var(--color-muted)]'>
                  {review.product.isActive ? 'Active' : 'Inactive'}
                </p>

                <Link
                  to={`/admin/products/${review.product.id}`}
                  className='mt-3 inline-flex text-sm font-semibold underline underline-offset-4'>
                  View Product
                </Link>
              </div>
            </div>
          ) : (
            <p className='mt-4 mb-0 text-sm text-[var(--color-muted)]'>
              Product information is unavailable.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
