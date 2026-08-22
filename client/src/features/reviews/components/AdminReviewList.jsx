import { Link } from 'react-router';

import { Badge } from '../../../components/ui/Badge.jsx';

import {
  getReviewStatusVariant,
  reviewDateFormatter,
} from '../review.utils.js';

function ReviewStatusBadge({ status }) {
  return <Badge variant={getReviewStatusVariant(status)}>{status}</Badge>;
}

export function AdminReviewList({ reviews }) {
  return (
    <>
      <div className='grid gap-5 lg:hidden'>
        {reviews.map((review) => (
          <article
            key={review.id}
            className='border-y border-[var(--color-border)] py-5'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <p className='mb-0 font-black'>
                  {review.product?.name || 'Product unavailable'}
                </p>

                <p className='mt-1 mb-0 text-sm text-[var(--color-muted)]'>
                  Customer: {review.customer?.name || 'Unavailable'}
                </p>

                {review.customer?.email ? (
                  <p className='mt-1 mb-0 break-all text-xs text-[var(--color-muted)]'>
                    {review.customer.email}
                  </p>
                ) : null}
              </div>

              <ReviewStatusBadge status={review.moderationStatus} />
            </div>

            <p
              className='mt-4 mb-0 font-black'
              aria-label={`${review.rating} out of 5 stars`}>
              ★ {review.rating}/5
            </p>

            <p className='mt-3 mb-0 text-sm leading-6 text-[var(--color-ink-soft)]'>
              {review.text.length > 180
                ? `${review.text.slice(0, 180)}…`
                : review.text}
            </p>

            {review.moderationStatus === 'hidden' && review.moderationReason ? (
              <p className='mt-3 mb-0 text-sm text-[var(--color-warning)]'>
                Hidden reason: {review.moderationReason}
              </p>
            ) : null}

            <div className='mt-5 flex items-center justify-between gap-4 border-t border-[var(--color-border)] pt-4'>
              <p className='mb-0 text-xs text-[var(--color-muted)]'>
                {reviewDateFormatter.format(new Date(review.createdAt))}
              </p>

              <Link
                to={`/admin/reviews/${review.id}`}
                className='text-sm font-semibold underline underline-offset-4'>
                View Review
              </Link>
            </div>
          </article>
        ))}
      </div>

      <div className='hidden overflow-x-auto border-y border-[var(--color-border)] lg:block'>
        <table className='min-w-full text-left text-sm'>
          <thead className='bg-[var(--color-surface)]'>
            <tr>
              <th className='px-4 py-3 font-bold'>Product</th>

              <th className='px-4 py-3 font-bold'>Customer</th>

              <th className='px-4 py-3 font-bold'>Rating</th>

              <th className='px-4 py-3 font-bold'>Review</th>

              <th className='px-4 py-3 font-bold'>Status</th>

              <th className='px-4 py-3 font-bold'>Submitted</th>

              <th className='px-4 py-3 font-bold'>Action</th>
            </tr>
          </thead>

          <tbody>
            {reviews.map((review) => (
              <tr
                key={review.id}
                className='border-t border-[var(--color-border)] align-top'>
                <td className='min-w-48 px-4 py-4'>
                  <p className='mb-0 font-semibold'>
                    {review.product?.name || 'Unavailable'}
                  </p>
                </td>

                <td className='min-w-48 px-4 py-4'>
                  <p className='mb-0 font-semibold'>
                    {review.customer?.name || 'Unavailable'}
                  </p>

                  <p className='mt-1 mb-0 break-all text-xs text-[var(--color-muted)]'>
                    {review.customer?.email ?? '—'}
                  </p>
                </td>

                <td className='whitespace-nowrap px-4 py-4 font-black'>
                  ★ {review.rating}/5
                </td>

                <td className='max-w-md px-4 py-4 leading-6'>
                  {review.text.length > 120
                    ? `${review.text.slice(0, 120)}…`
                    : review.text}
                </td>

                <td className='px-4 py-4'>
                  <ReviewStatusBadge status={review.moderationStatus} />
                </td>

                <td className='whitespace-nowrap px-4 py-4 text-[var(--color-muted)]'>
                  {reviewDateFormatter.format(new Date(review.createdAt))}
                </td>

                <td className='px-4 py-4'>
                  <Link
                    to={`/admin/reviews/${review.id}`}
                    className='font-semibold underline underline-offset-4'>
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
