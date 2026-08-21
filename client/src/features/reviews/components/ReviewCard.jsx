import { Link } from 'react-router';

import { Alert } from '../../../components/ui/Alert.jsx';
import { Badge } from '../../../components/ui/Badge.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import { Textarea } from '../../../components/ui/Textarea.jsx';

import {
  getReviewStatusVariant,
  reviewDateFormatter,
} from '../review.utils.js';

export function ReviewCard({
  review,

  editing,

  editForm,

  actionLoading,

  anyActionLoading,

  onStartEditing,

  onCancelEditing,

  onEditChange,

  onSave,

  onDelete,
}) {
  return (
    <article className='border-t border-[var(--color-border)] py-7 first:border-t-0 first:pt-0'>
      <div className='flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between'>
        <div className='flex min-w-0 gap-4'>
          {review.product?.primaryImage?.url ? (
            <img
              src={review.product.primaryImage.url}
              alt={review.product.primaryImage.altText || review.product.name}
              className='size-20 shrink-0 object-cover'
            />
          ) : (
            <div className='grid size-20 shrink-0 place-items-center bg-[var(--color-surface)] text-xs text-[var(--color-muted)]'>
              No image
            </div>
          )}

          <div className='min-w-0'>
            <h2 className='mb-0 font-black tracking-[-0.015em]'>
              {review.product?.name || 'Product unavailable'}
            </h2>

            {review.product?.isActive ? (
              <Link
                to={`/products/${review.product.id}`}
                className='mt-2 inline-flex text-sm font-semibold underline decoration-[var(--color-border-strong)] underline-offset-4'>
                View product
              </Link>
            ) : (
              <p className='mt-2 mb-0 text-xs leading-5 text-[var(--color-muted)]'>
                This Product is not currently available in the storefront.
              </p>
            )}
          </div>
        </div>

        <Badge variant={getReviewStatusVariant(review.moderationStatus)}>
          {review.moderationStatus}
        </Badge>
      </div>

      {review.moderationStatus === 'hidden' ? (
        <Alert
          variant='warning'
          title='Hidden from storefront'
          className='mt-5'>
          {review.moderationReason
            ? `Reason: ${review.moderationReason}`
            : 'This Review is currently hidden from public Product Reviews.'}
        </Alert>
      ) : null}

      {editing ? (
        <section className='mt-5 space-y-4 border-t border-[var(--color-border)] pt-5'>
          <Select
            id={`rating-${review.id}`}
            name='rating'
            label='Rating'
            value={editForm.rating}
            disabled={actionLoading}
            onChange={onEditChange}
            className='sm:max-w-xs'>
            {[5, 4, 3, 2, 1].map((rating) => (
              <option key={rating} value={rating}>
                {rating} star
                {rating === 1 ? '' : 's'}
              </option>
            ))}
          </Select>

          <Textarea
            id={`review-text-${review.id}`}
            name='text'
            label='Review'
            value={editForm.text}
            maxLength={1000}
            rows={5}
            disabled={actionLoading}
            hint={`${editForm.text.length}/1000`}
            onChange={onEditChange}
          />

          {review.moderationStatus === 'hidden' ? (
            <p className='mb-0 text-sm text-[var(--color-muted)]'>
              Editing this Review will not automatically make it visible again.
            </p>
          ) : null}

          <div className='flex flex-wrap gap-3'>
            <Button type='button' disabled={actionLoading} onClick={onSave}>
              {actionLoading ? 'Saving...' : 'Save changes'}
            </Button>

            <Button
              type='button'
              variant='secondary'
              disabled={actionLoading}
              onClick={onCancelEditing}>
              Cancel
            </Button>
          </div>
        </section>
      ) : (
        <>
          <div className='mt-5'>
            <p
              className='mb-0 text-lg tracking-wide'
              aria-label={`${review.rating} out of 5 stars`}>
              <span className='text-[var(--color-warning)]'>
                {'★'.repeat(review.rating)}
              </span>

              <span className='text-[var(--color-border)]'>
                {'★'.repeat(5 - review.rating)}
              </span>
            </p>

            <p className='mt-3 mb-0 whitespace-pre-wrap text-sm leading-7 text-[var(--color-ink-soft)]'>
              {review.text}
            </p>

            <p className='mt-3 mb-0 text-xs text-[var(--color-muted)]'>
              Submitted {reviewDateFormatter.format(new Date(review.createdAt))}
              {review.updatedAt !== review.createdAt ? ' · Edited' : ''}
            </p>
          </div>

          <div className='mt-5 flex flex-wrap gap-2 border-t border-[var(--color-border)] pt-4'>
            <Button
              type='button'
              variant='secondary'
              size='sm'
              disabled={anyActionLoading}
              onClick={onStartEditing}>
              Edit
            </Button>

            <Button
              type='button'
              variant='quiet'
              size='sm'
              disabled={anyActionLoading}
              onClick={onDelete}
              className='text-[var(--color-danger)]'>
              {actionLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </>
      )}
    </article>
  );
}
