import { Link } from 'react-router';

import { Alert } from '../../../components/ui/Alert.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Skeleton } from '../../../components/ui/Skeleton.jsx';

import { CheckoutItemList } from './CheckoutItemList.jsx';

function CheckoutReviewSkeleton() {
  return (
    <div className='mt-6 space-y-5'>
      {Array.from({
        length: 2,
      }).map((_, index) => (
        <div key={index} className='border-b border-[var(--color-border)] pb-5'>
          <Skeleton className='h-5 w-2/3' />

          <Skeleton className='mt-2 h-4 w-24' />

          <Skeleton className='mt-4 h-4 w-40' />
        </div>
      ))}
    </div>
  );
}

export function CheckoutOrderReview({
  preview,

  status,
  error,

  controlsLocked,

  onRefresh,
  onRetry,
}) {
  return (
    <section className='border-t border-[var(--color-border)] pt-7'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <p className='mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]'>
            Review
          </p>

          <h2 className='mb-0 text-xl font-black tracking-[-0.025em]'>
            Your Order
          </h2>

          <p className='mt-2 mb-0 text-sm text-[var(--color-muted)]'>
            Current server-approved Cart contents and pricing.
          </p>
        </div>

        <Button
          type='button'
          variant='quiet'
          size='sm'
          disabled={status === 'loading' || controlsLocked}
          onClick={onRefresh}>
          {status === 'loading' ? 'Refreshing...' : 'Refresh checkout'}
        </Button>
      </div>

      {status === 'loading' ? <CheckoutReviewSkeleton /> : null}

      {error ? (
        <Alert
          variant='danger'
          title='Unable to prepare checkout'
          className='mt-5'
          actions={
            <Button
              type='button'
              variant='secondary'
              size='sm'
              disabled={controlsLocked}
              onClick={onRetry}>
              Try again
            </Button>
          }>
          {error.message}
        </Alert>
      ) : null}

      {preview?.issues?.length > 0 ? (
        <Alert
          variant='warning'
          title='Checkout needs your attention'
          className='mt-5'>
          <div className='space-y-1'>
            {preview.issues.map((issue, index) => (
              <p key={`${issue.code}-${index}`} className='mb-0'>
                {issue.message}
              </p>
            ))}
          </div>

          <Link
            to='/cart'
            className='mt-3 inline-flex font-semibold underline underline-offset-4'>
            Review Cart
          </Link>
        </Alert>
      ) : null}

      <CheckoutItemList items={preview?.items ?? []} />
    </section>
  );
}
