import { useLocation, useParams } from 'react-router';

import { Link } from 'react-router';

import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

import { AccountPageHeader } from '../../features/account/components/AccountPageHeader.jsx';

import { RefundDetailsView } from '../../features/refunds/components/RefundDetailsView.jsx';
import { RefundStatusBadge } from '../../features/refunds/components/RefundStatusBadge.jsx';

import { useRefundDetails } from '../../features/refunds/hooks/useRefundDetails.js';

import { refundDateFormatter } from '../../features/refunds/refund.utils.js';

function RefundDetailsPage() {
  const { refundId } = useParams();

  const location = useLocation();

  const details = useRefundDetails(refundId);

  if (details.loading) {
    return (
      <div className='max-w-5xl'>
        <Skeleton className='h-4 w-32' />
        <Skeleton className='mt-7 h-10 w-60' />
        <Skeleton className='mt-8 h-80 w-full' />
      </div>
    );
  }

  if (details.error?.code === 'REFUND_NOT_FOUND') {
    return (
      <div className='max-w-3xl'>
        <AccountPageHeader
          title='Refund not found'
          backTo='/account/refunds'
          backLabel='Refunds'
        />

        <section className='mt-7 border-y border-[var(--color-border)] py-12 text-center'>
          <p className='mx-auto mb-0 max-w-lg text-sm leading-6 text-[var(--color-muted)]'>
            This Refund does not exist or is not available in your account.
          </p>

          <Link
            to='/account/refunds'
            className='mt-5 inline-flex min-h-11 items-center border border-[var(--color-ink)] bg-[var(--color-ink)] px-5 text-sm font-bold text-white'>
            View My Refunds
          </Link>
        </section>
      </div>
    );
  }

  if (details.error || !details.refund) {
    return (
      <div className='max-w-3xl'>
        <AccountPageHeader
          title='Refund details'
          backTo='/account/refunds'
          backLabel='Refunds'
        />

        <Alert
          variant='danger'
          title='Unable to load Refund'
          className='mt-6'
          actions={
            <Button
              type='button'
              variant='secondary'
              size='sm'
              onClick={details.loadRefund}>
              Try again
            </Button>
          }>
          {details.error?.message ?? 'Unable to load this Refund.'}
        </Alert>
      </div>
    );
  }

  const { refund } = details;

  return (
    <div className='max-w-5xl'>
      {location.state?.successMessage ? (
        <Alert variant='success' className='mb-6'>
          {location.state.successMessage}
        </Alert>
      ) : null}

      <AccountPageHeader
        eyebrow='Refund details'
        title={`Refund ${refund.id}`}
        description={`Requested ${refundDateFormatter.format(
          new Date(refund.requestedAt),
        )}`}
        backTo='/account/refunds'
        backLabel='Refunds'
        action={<RefundStatusBadge status={refund.status} />}
      />

      <RefundDetailsView refund={refund} />
    </div>
  );
}

export default RefundDetailsPage;
