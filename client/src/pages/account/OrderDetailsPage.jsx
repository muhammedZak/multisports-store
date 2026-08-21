import { Link, useParams } from 'react-router';

import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

import { AccountPageHeader } from '../../features/account/components/AccountPageHeader.jsx';

import { OrderDetailsView } from '../../features/orders/components/OrderDetailsView.jsx';
import { OrderStatusBadge } from '../../features/orders/components/OrderStatusBadge.jsx';

import { useOrderDetails } from '../../features/orders/hooks/useOrderDetails.js';

import { orderDateFormatter } from '../../features/orders/order.utils.js';

function OrderDetailsPage() {
  const { orderId } = useParams();

  const details = useOrderDetails(orderId);

  if (details.loading) {
    return (
      <div className='max-w-5xl'>
        <Skeleton className='h-4 w-32' />
        <Skeleton className='mt-7 h-10 w-60' />
        <Skeleton className='mt-8 h-72 w-full' />
      </div>
    );
  }

  if (details.error?.code === 'ORDER_NOT_FOUND') {
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
            View my orders
          </Link>
        </section>
      </div>
    );
  }

  if (details.error || !details.order) {
    return (
      <div className='max-w-3xl'>
        <AccountPageHeader
          title='Order details'
          backTo='/account/orders'
          backLabel='Orders'
        />

        <Alert
          variant='danger'
          title='Unable to load order'
          className='mt-6'
          actions={
            <Button
              type='button'
              variant='secondary'
              size='sm'
              onClick={details.loadOrder}>
              Try again
            </Button>
          }>
          {details.error?.message ?? 'Unable to load this order.'}
        </Alert>
      </div>
    );
  }

  const { order } = details;

  return (
    <div className='max-w-5xl'>
      <AccountPageHeader
        eyebrow='Order details'
        title={order.orderNumber}
        description={`Placed ${orderDateFormatter.format(
          new Date(order.placedAt),
        )}`}
        backTo='/account/orders'
        backLabel='Orders'
        action={<OrderStatusBadge status={order.orderStatus} />}
      />

      {order.orderStatus === 'cancelled' ? (
        <Alert variant='danger' className='mt-6'>
          This Order was cancelled
          {order.cancelledAt
            ? ` on ${orderDateFormatter.format(new Date(order.cancelledAt))}.`
            : '.'}
        </Alert>
      ) : null}

      {details.message ? (
        <Alert variant='success' className='mt-6'>
          {details.message}
        </Alert>
      ) : null}

      {details.actionError ? (
        <Alert variant='danger' className='mt-6'>
          {details.actionError.message}
        </Alert>
      ) : null}

      <OrderDetailsView
        order={order}
        cancelling={details.cancelling}
        onCancel={details.cancelOrder}
      />
    </div>
  );
}

export default OrderDetailsPage;
