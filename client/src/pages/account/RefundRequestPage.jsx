import { Link, useParams } from 'react-router';

import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

import { AccountPageHeader } from '../../features/account/components/AccountPageHeader.jsx';

import { RefundRequestForm } from '../../features/refunds/components/RefundRequestForm.jsx';

import { useRefundRequest } from '../../features/refunds/hooks/useRefundRequest.js';

function RefundRequestPage() {
  const { orderId } = useParams();

  const request = useRefundRequest(orderId);

  if (request.loading) {
    return (
      <div className='max-w-5xl'>
        <Skeleton className='h-4 w-40' />
        <Skeleton className='mt-7 h-10 w-52' />
        <Skeleton className='mt-8 h-80 w-full' />
      </div>
    );
  }

  if (request.loadError?.code === 'ORDER_NOT_FOUND') {
    return (
      <div className='max-w-3xl'>
        <AccountPageHeader
          title='Order not found'
          backTo='/account/orders'
          backLabel='Orders'
        />

        <section className='mt-7 border-y border-[var(--color-border)] py-12 text-center'>
          <p className='mx-auto mb-0 max-w-lg text-sm leading-6 text-[var(--color-muted)]'>
            This Order does not exist or is not available in your account.
          </p>

          <Link
            to='/account/orders'
            className='mt-5 inline-flex min-h-11 items-center border border-[var(--color-ink)] bg-[var(--color-ink)] px-5 text-sm font-bold text-white'>
            View my Orders
          </Link>
        </section>
      </div>
    );
  }

  if (request.loadError || !request.order) {
    return (
      <div className='max-w-3xl'>
        <AccountPageHeader
          title='Request a Refund'
          backTo='/account/orders'
          backLabel='Orders'
        />

        <Alert
          variant='danger'
          title='Unable to load Order'
          className='mt-6'
          actions={
            <Button
              type='button'
              variant='secondary'
              size='sm'
              onClick={request.loadOrder}>
              Try again
            </Button>
          }>
          {request.loadError?.message ?? 'Unable to load this Order.'}
        </Alert>
      </div>
    );
  }

  if (!request.refundEligible) {
    return (
      <div className='max-w-3xl'>
        <AccountPageHeader
          title='Refund not available yet'
          backTo={`/account/orders/${request.order.id}`}
          backLabel='Order details'
        />

        <Alert variant='warning' className='mt-6'>
          <p className='mb-4'>
            Customer Refund requests are available only after the Order is
            delivered and its Payment is successfully verified.
          </p>

          <Link
            to={`/account/orders/${request.order.id}`}
            className='font-semibold underline underline-offset-4'>
            Return to Order details
          </Link>
        </Alert>
      </div>
    );
  }

  return (
    <div className='max-w-5xl'>
      <AccountPageHeader
        eyebrow='Refund request'
        title='Request a Refund'
        description={
          <>
            Order{' '}
            <strong className='text-[var(--color-ink)]'>
              {request.order.orderNumber}
            </strong>
          </>
        }
        backTo={`/account/orders/${request.order.id}`}
        backLabel='Order details'
      />

      <RefundRequestForm request={request} />
    </div>
  );
}

export default RefundRequestPage;
