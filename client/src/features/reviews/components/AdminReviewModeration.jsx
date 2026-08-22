import { Alert } from '../../../components/ui/Alert.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Textarea } from '../../../components/ui/Textarea.jsx';

import { reviewDateFormatter } from '../review.utils.js';

export function AdminReviewModeration({ model }) {
  const { review } = model;

  return (
    <section className='mt-10 border-t border-[var(--color-border)] pt-6'>
      <h2 className='mb-0 text-lg font-black'>Moderation</h2>

      {review.moderationStatus === 'hidden' ? (
        <>
          <Alert
            variant='warning'
            title='Hidden from storefront'
            className='mt-5'>
            {review.moderationReason
              ? `Reason: ${review.moderationReason}`
              : 'This Review is hidden from public Product Reviews.'}
          </Alert>

          <Button
            type='button'
            disabled={model.moderationLoading}
            onClick={model.restoreReview}
            className='mt-5'>
            {model.moderationLoading ? 'Restoring...' : 'Restore Review'}
          </Button>
        </>
      ) : (
        <form onSubmit={model.hideReview} className='mt-5 max-w-2xl'>
          <Textarea
            id='moderation-reason'
            label='Reason for hiding'
            rows={4}
            required
            value={model.reason}
            disabled={model.moderationLoading}
            placeholder='Explain why this Review should be hidden.'
            hint='Hiding changes only storefront visibility. Customer rating and text remain unchanged.'
            onChange={model.handleReasonChange}
          />

          <Button
            type='submit'
            variant='secondary'
            disabled={model.moderationLoading || !model.reason.trim()}
            className='mt-4 text-[var(--color-danger)]'>
            {model.moderationLoading ? 'Hiding...' : 'Hide Review'}
          </Button>
        </form>
      )}

      <dl className='mt-7 grid gap-5 border-t border-[var(--color-border)] pt-5 text-sm sm:grid-cols-2'>
        <div>
          <dt className='text-[var(--color-muted)]'>Last moderated by</dt>

          <dd className='mt-1 mb-0'>
            {review.moderatedBy
              ? `${review.moderatedBy.name} (${review.moderatedBy.email})`
              : 'Never moderated'}
          </dd>
        </div>

        <div>
          <dt className='text-[var(--color-muted)]'>Last moderated at</dt>

          <dd className='mt-1 mb-0'>
            {review.moderatedAt
              ? reviewDateFormatter.format(new Date(review.moderatedAt))
              : '—'}
          </dd>
        </div>
      </dl>
    </section>
  );
}
