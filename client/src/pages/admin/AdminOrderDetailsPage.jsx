import { useParams } from 'react-router';

import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

import { AdminPageHeader } from '../../components/shared/AdminPageHeader.jsx';

import { AdminOrderDetailsView } from '../../features/orders/components/AdminOrderDetailsView.jsx';
import { AdminOrderStatusActions } from '../../features/orders/components/AdminOrderStatusActions.jsx';
import { OrderStatusBadge } from '../../features/orders/components/OrderStatusBadge.jsx';

import { useAdminOrderDetails } from '../../features/orders/hooks/useAdminOrderDetails.js';

import { orderDateFormatter } from '../../features/orders/order.utils.js';

function AdminOrderDetailsPage() {
  const { orderId } = useParams();

  const details = useAdminOrderDetails(orderId);

  if (details.loading) {
    return (
      <main className='p-5 sm:p-6'>
        <Skeleton className='h-8 w-64' />
        <Skeleton className='mt-8 h-80 w-full' />
      </main>
    );
  }

  if (details.error && !details.order) {
    return (
      <main className='p-5 sm:p-6'>
        <AdminPageHeader
          eyebrow='Order management'
          title='Order unavailable'
          backTo='/admin/orders'
          backLabel='Orders'
        />

        <Alert variant='danger' className='mt-6'>
          {details.error.code === 'ORDER_NOT_FOUND'
            ? 'Order not found.'
            : details.error.message}
        </Alert>

        {details.error.code !== 'ORDER_NOT_FOUND' ? (
          <Button type='button' className='mt-5' onClick={details.loadOrder}>
            Try again
          </Button>
        ) : null}
      </main>
    );
  }

  const { order } = details;

  return (
    <main className='p-5 sm:p-6'>
      <AdminPageHeader
        eyebrow='Order details'
        title={order.orderNumber}
        description={`Placed ${orderDateFormatter.format(
          new Date(order.placedAt),
        )}`}
        backTo='/admin/orders'
        backLabel='Orders'
        action={<OrderStatusBadge status={order.orderStatus} />}
      />

      {order.orderStatus === 'cancelled' ? (
        <Alert variant='danger' className='mt-6'>
          Order cancelled
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

      <AdminOrderDetailsView order={order} />

      <div className='mt-10'>
        <AdminOrderStatusActions
          order={order}
          statusUpdating={details.statusUpdating}
          onUpdate={details.updateStatus}
        />
      </div>
    </main>
  );
}

export default AdminOrderDetailsPage;
