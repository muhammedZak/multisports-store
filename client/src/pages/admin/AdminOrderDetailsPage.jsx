import { useCallback, useEffect, useState } from 'react';

import { Link, useParams } from 'react-router';

import { normalizeApiError } from '../../api/errors.js';

import { fetchAdminOrder } from '../../api/orderApi.js';

import { formatInrFromPaise } from '../../utils/money.js';

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatDate(value) {
  if (!value) {
    return '—';
  }

  return dateFormatter.format(new Date(value));
}

function formatStatus(value) {
  if (!value) {
    return 'Unknown';
  }

  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatOptionName(name) {
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getOrderStatusClass(status) {
  const classes = {
    placed: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-indigo-100 text-indigo-700',
    processing: 'bg-amber-100 text-amber-700',
    shipped: 'bg-purple-100 text-purple-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  return classes[status] ?? 'bg-neutral-100 text-neutral-700';
}

function getPaymentStatusClass(status) {
  if (status === 'succeeded') {
    return 'bg-green-100 text-green-700';
  }

  if (status === 'created' || status === 'pending') {
    return 'bg-amber-100 text-amber-700';
  }

  if (
    status === 'failed' ||
    status === 'cancelled' ||
    status === 'verification_failed'
  ) {
    return 'bg-red-100 text-red-700';
  }

  return 'bg-neutral-100 text-neutral-700';
}

function getCouponValueLabel(coupon) {
  if (!coupon) {
    return '—';
  }

  if (coupon.discountType === 'percentage') {
    return `${coupon.discountValue}%`;
  }

  return formatInrFromPaise(coupon.discountValue);
}

function AdminOrderDetailsPage() {
  const { orderId } = useParams();

  const [order, setOrder] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const item = await fetchAdminOrder(orderId);

      setOrder(item);
    } catch (requestError) {
      setOrder(null);

      setError(
        normalizeApiError(
          requestError,
          'Unable to load this order. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  if (loading) {
    return (
      <main className='p-5 sm:p-6'>
        <p className='text-sm text-neutral-600'>Loading order...</p>
      </main>
    );
  }

  if (error && !order) {
    return (
      <main className='p-5 sm:p-6'>
        <div
          role='alert'
          className='border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          {error.code === 'ORDER_NOT_FOUND'
            ? 'Order not found.'
            : error.message}
        </div>

        <div className='mt-5 flex flex-wrap gap-4'>
          {error.code !== 'ORDER_NOT_FOUND' && (
            <button
              type='button'
              onClick={loadOrder}
              className='bg-black px-4 py-2 text-sm font-medium text-white'>
              Try again
            </button>
          )}

          <Link
            to='/admin/orders'
            className='px-4 py-2 text-sm font-medium underline underline-offset-4'>
            Back to orders
          </Link>
        </div>
      </main>
    );
  }

  const itemCount = order.items.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  return (
    <main className='p-5 sm:p-6'>
      <Link
        to='/admin/orders'
        className='text-sm font-medium underline underline-offset-4'>
        Back to orders
      </Link>

      <div className='mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div className='min-w-0'>
          <p className='text-sm font-medium uppercase tracking-[0.2em] text-neutral-500'>
            Order details
          </p>

          <h1 className='mt-3 break-all text-2xl font-semibold sm:text-3xl'>
            {order.orderNumber}
          </h1>

          <p className='mt-2 text-sm text-neutral-600'>
            Placed {formatDate(order.placedAt)}
          </p>
        </div>

        <span
          className={[
            'inline-flex w-fit px-3 py-1.5 text-sm font-medium',
            getOrderStatusClass(order.orderStatus),
          ].join(' ')}>
          {formatStatus(order.orderStatus)}
        </span>
      </div>

      {order.orderStatus === 'cancelled' && (
        <div className='mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          Order cancelled
          {order.cancelledAt ? ` on ${formatDate(order.cancelledAt)}.` : '.'}
        </div>
      )}

      <section className='mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <div className='border border-neutral-200 p-5'>
          <p className='text-sm text-neutral-500'>Order total</p>

          <p className='mt-2 text-2xl font-semibold'>
            {formatInrFromPaise(order.pricing.totalAmount)}
          </p>
        </div>

        <div className='border border-neutral-200 p-5'>
          <p className='text-sm text-neutral-500'>Items</p>

          <p className='mt-2 text-2xl font-semibold'>{itemCount}</p>
        </div>

        <div className='border border-neutral-200 p-5'>
          <p className='text-sm text-neutral-500'>Payment</p>

          <span
            className={[
              'mt-3 inline-flex px-2.5 py-1 text-xs font-medium',
              getPaymentStatusClass(order.payment?.status),
            ].join(' ')}>
            {order.payment?.status
              ? formatStatus(order.payment.status)
              : 'Unavailable'}
          </span>
        </div>

        <div className='border border-neutral-200 p-5'>
          <p className='text-sm text-neutral-500'>Fulfillment status</p>

          <p className='mt-2 font-semibold'>
            {formatStatus(order.orderStatus)}
          </p>
        </div>
      </section>

      <div className='mt-6 grid gap-6 xl:grid-cols-2'>
        <section className='border border-neutral-200 p-5'>
          <div>
            <h2 className='text-lg font-semibold'>Customer</h2>

            <p className='mt-1 text-xs text-neutral-500'>
              Current account contact information
            </p>
          </div>

          {order.customer ? (
            <dl className='mt-5 space-y-4 text-sm'>
              <div>
                <dt className='text-neutral-500'>Name</dt>

                <dd className='mt-1 font-medium'>{order.customer.name}</dd>
              </div>

              <div>
                <dt className='text-neutral-500'>Email</dt>

                <dd className='mt-1 break-all'>{order.customer.email}</dd>
              </div>

              <div>
                <dt className='text-neutral-500'>Phone</dt>

                <dd className='mt-1'>{order.customer.phone ?? '—'}</dd>
              </div>

              <div>
                <dt className='text-neutral-500'>Customer ID</dt>

                <dd className='mt-1 break-all font-mono text-xs'>
                  {order.customer.id}
                </dd>
              </div>
            </dl>
          ) : (
            <p className='mt-4 text-sm text-neutral-600'>
              Customer account information is unavailable.
            </p>
          )}
        </section>

        <section className='border border-neutral-200 p-5'>
          <div>
            <h2 className='text-lg font-semibold'>Shipping address</h2>

            <p className='mt-1 text-xs text-neutral-500'>
              Historical address captured at checkout
            </p>
          </div>

          <div className='mt-5 space-y-1 text-sm leading-6 text-neutral-700'>
            <p className='font-medium'>{order.shippingAddress.fullName}</p>

            <p>{order.shippingAddress.address}</p>

            <p>
              {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
              {order.shippingAddress.postalCode}
            </p>

            <p>{order.shippingAddress.country}</p>

            <p className='pt-2'>{order.shippingAddress.phone}</p>
          </div>
        </section>
      </div>

      <section className='mt-6 border border-neutral-200 p-5 sm:p-6'>
        <div>
          <h2 className='text-lg font-semibold'>Purchased items</h2>

          <p className='mt-1 text-xs text-neutral-500'>
            Historical product, variant, quantity, and pricing snapshots
          </p>
        </div>

        <div className='mt-4'>
          {order.items.map((item) => {
            const options = Object.entries(item.variant?.options ?? {});

            return (
              <article
                key={item.id}
                className='border-b border-neutral-200 py-5 last:border-0'>
                <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                  <div className='min-w-0'>
                    <p className='font-semibold'>{item.product.name}</p>

                    <p className='mt-1 text-sm text-neutral-500'>
                      {item.product.brand}
                    </p>

                    <p className='mt-1 text-xs capitalize text-neutral-500'>
                      {item.product.sport} · {item.product.category.name}
                    </p>

                    {options.length > 0 && (
                      <div className='mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-600'>
                        {options.map(([name, value]) => (
                          <span key={name}>
                            {formatOptionName(name)}:{' '}
                            <span className='font-medium text-black'>
                              {String(value)}
                            </span>
                          </span>
                        ))}
                      </div>
                    )}

                    <p className='mt-3 text-sm text-neutral-600'>
                      Quantity:{' '}
                      <span className='font-medium text-neutral-900'>
                        {item.quantity}
                      </span>
                    </p>
                  </div>

                  <dl className='grid min-w-52 gap-2 text-sm lg:text-right'>
                    <div>
                      <dt className='text-neutral-500'>Unit price</dt>

                      <dd className='font-medium'>
                        {formatInrFromPaise(item.pricing.unitPrice)}
                      </dd>
                    </div>

                    {item.pricing.itemDiscount > 0 && (
                      <div>
                        <dt className='text-neutral-500'>Product discount</dt>

                        <dd className='text-green-700'>
                          {formatInrFromPaise(item.pricing.itemDiscount)} each
                        </dd>
                      </div>
                    )}

                    <div>
                      <dt className='text-neutral-500'>Line total</dt>

                      <dd className='font-semibold'>
                        {formatInrFromPaise(item.pricing.lineTotal)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className='mt-6 grid gap-6 xl:grid-cols-2'>
        <section className='border border-neutral-200 p-5'>
          <h2 className='text-lg font-semibold'>Payment</h2>

          {order.payment ? (
            <dl className='mt-5 grid gap-5 text-sm sm:grid-cols-2'>
              <div>
                <dt className='text-neutral-500'>Status</dt>

                <dd className='mt-2'>
                  <span
                    className={[
                      'inline-flex px-2.5 py-1 text-xs font-medium',
                      getPaymentStatusClass(order.payment.status),
                    ].join(' ')}>
                    {formatStatus(order.payment.status)}
                  </span>
                </dd>
              </div>

              <div>
                <dt className='text-neutral-500'>Provider</dt>

                <dd className='mt-1 font-medium capitalize'>
                  {order.payment.provider}
                </dd>
              </div>

              <div>
                <dt className='text-neutral-500'>Amount</dt>

                <dd className='mt-1 font-medium'>
                  {formatInrFromPaise(order.payment.amount)}
                </dd>
              </div>

              <div>
                <dt className='text-neutral-500'>Currency</dt>

                <dd className='mt-1 font-medium'>{order.payment.currency}</dd>
              </div>

              <div className='sm:col-span-2'>
                <dt className='text-neutral-500'>Provider order ID</dt>

                <dd className='mt-1 break-all font-mono text-xs'>
                  {order.payment.providerOrderId ?? '—'}
                </dd>
              </div>

              <div className='sm:col-span-2'>
                <dt className='text-neutral-500'>Provider payment ID</dt>

                <dd className='mt-1 break-all font-mono text-xs'>
                  {order.payment.providerPaymentId ?? '—'}
                </dd>
              </div>

              <div className='sm:col-span-2'>
                <dt className='text-neutral-500'>Backend verified</dt>

                <dd className='mt-1'>{formatDate(order.payment.verifiedAt)}</dd>
              </div>
            </dl>
          ) : (
            <p className='mt-4 text-sm text-neutral-600'>
              Payment information is unavailable.
            </p>
          )}
        </section>

        <section className='border border-neutral-200 p-5'>
          <h2 className='text-lg font-semibold'>Order summary</h2>

          <dl className='mt-5 space-y-3'>
            <div className='flex justify-between gap-4'>
              <dt className='text-sm text-neutral-600'>Subtotal</dt>

              <dd className='font-medium'>
                {formatInrFromPaise(order.pricing.subtotal)}
              </dd>
            </div>

            {order.pricing.discountAmount > 0 && (
              <div className='flex justify-between gap-4'>
                <dt className='text-sm text-neutral-600'>Coupon discount</dt>

                <dd className='font-medium text-green-700'>
                  −{formatInrFromPaise(order.pricing.discountAmount)}
                </dd>
              </div>
            )}

            {order.coupon && (
              <div className='mt-4 border border-green-200 bg-green-50 p-4'>
                <p className='font-medium text-green-800'>
                  {order.coupon.code}
                </p>

                <p className='mt-1 text-xs text-green-700'>
                  {formatStatus(order.coupon.discountType)} ·{' '}
                  {getCouponValueLabel(order.coupon)}
                </p>

                <p className='mt-2 text-sm text-green-800'>
                  Order discount:{' '}
                  {formatInrFromPaise(order.coupon.discountAmount)}
                </p>
              </div>
            )}

            <div className='flex justify-between gap-4 border-t border-neutral-200 pt-4'>
              <dt className='font-semibold'>Total</dt>

              <dd className='text-xl font-semibold'>
                {formatInrFromPaise(order.pricing.totalAmount)}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section className='mt-6 border border-neutral-200 p-5'>
        <h2 className='text-lg font-semibold'>Fulfillment workflow</h2>

        <p className='mt-2 text-sm leading-6 text-neutral-600'>
          Current status:{' '}
          <span className='font-medium text-neutral-900'>
            {formatStatus(order.orderStatus)}
          </span>
        </p>

        {order.allowedNextStatuses.length > 0 ? (
          <div className='mt-4'>
            <p className='text-sm text-neutral-500'>Permitted next statuses</p>

            <div className='mt-3 flex flex-wrap gap-2'>
              {order.allowedNextStatuses.map((status) => (
                <span
                  key={status}
                  className='border border-neutral-300 px-3 py-1.5 text-sm font-medium'>
                  {formatStatus(status)}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className='mt-4 text-sm text-neutral-600'>
            This Order has no further permitted fulfillment transitions.
          </p>
        )}
      </section>
    </main>
  );
}

export default AdminOrderDetailsPage;
