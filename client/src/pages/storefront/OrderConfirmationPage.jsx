import { Navigate, useLocation, useParams } from 'react-router';

import { Badge } from '../../components/ui/Badge.jsx';

import {
  OrderConfirmationDetails,
  OrderConfirmationShipping,
} from '../../features/checkout/components/OrderConfirmationDetails.jsx';

import { OrderConfirmationItems } from '../../features/checkout/components/OrderConfirmationItems.jsx';

import { OrderConfirmationSummary } from '../../features/checkout/components/OrderConfirmationSummary.jsx';

function OrderConfirmationPage() {
  const location = useLocation();

  const { orderId } = useParams();

  const order = location.state?.order ?? null;

  const payment = location.state?.payment ?? null;

  /*
   * Confirmation uses the verified
   * Order returned by payment
   * finalization.
   *
   * A browser refresh loses
   * navigation state, so redirect to
   * the authoritative Customer
   * Order-detail route.
   */
  if (!order) {
    return <Navigate to={`/account/orders/${orderId}`} replace />;
  }

  return (
    <main className='ds-container py-10 lg:py-14'>
      <section className='border-y border-[var(--color-border)] py-8 sm:py-10'>
        <Badge variant='success'>Order placed</Badge>

        <h1 className='mt-4 mb-0 max-w-3xl text-3xl font-black leading-tight tracking-[-0.045em] sm:text-4xl lg:text-5xl'>
          Thank you for your Order
        </h1>

        <p className='mt-4 mb-0 max-w-2xl text-sm leading-6 text-[var(--color-muted)]'>
          Your Razorpay payment was verified and your Order was placed
          successfully.
        </p>

        <p className='mt-5 mb-0 text-sm'>
          Order <span className='font-bold'>{order.orderNumber}</span>
        </p>
      </section>

      <div className='mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start xl:gap-16'>
        <div className='space-y-10'>
          <OrderConfirmationDetails order={order} payment={payment} />

          <OrderConfirmationItems items={order.items ?? []} />

          <OrderConfirmationShipping address={order.shippingAddress} />
        </div>

        <OrderConfirmationSummary order={order} />
      </div>
    </main>
  );
}

export default OrderConfirmationPage;
