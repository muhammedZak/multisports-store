import { useCallback, useEffect, useState } from 'react';

import { Link, useParams } from 'react-router';

import { normalizeApiError } from '../../api/errors.js';
import { cancelMyOrder, fetchMyOrder } from '../../api/orderApi.js';

import { formatInrFromPaise } from '../../utils/money.js';

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const ORDER_STATUS_STYLES = {
  placed: 'bg-blue-50 text-blue-700',
  confirmed: 'bg-indigo-50 text-indigo-700',
  processing: 'bg-amber-50 text-amber-700',
  shipped: 'bg-purple-50 text-purple-700',
  delivered: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
};

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

function OrderDetailsPage() {
  const { orderId } = useParams();

  const [order, setOrder] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [actionError, setActionError] = useState(null);

  const [message, setMessage] = useState('');

  const [cancelling, setCancelling] = useState(false);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const item = await fetchMyOrder(orderId);

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

  async function handleCancelOrder() {
    if (!order || order.orderStatus !== 'placed' || cancelling) {
      return;
    }

    const confirmed = window.confirm(
      `Cancel order ${order.orderNumber}? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setCancelling(true);
    setActionError(null);
    setMessage('');

    try {
      const updatedOrder = await cancelMyOrder(order.id);

      setOrder(updatedOrder);

      setMessage('Order cancelled successfully.');
    } catch (requestError) {
      const normalizedError = normalizeApiError(
        requestError,
        'Unable to cancel this order. Please try again.',
      );

      setActionError(normalizedError);

      /*
       * Another process may have changed the Order
       * between the initial page load and this click.
       *
       * Refresh backend authority rather than leaving
       * a stale "placed" Order on screen.
       */
      if (normalizedError.code === 'ORDER_NOT_CANCELLABLE') {
        await loadOrder();
      }
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <main className='mx-auto max-w-5xl p-6'>
        <Link
          to='/account/orders'
          className='text-sm font-medium underline underline-offset-4'>
          Back to orders
        </Link>

        <section className='mt-8 border border-neutral-200 p-8'>
          <p className='text-sm text-neutral-600'>Loading order details...</p>
        </section>
      </main>
    );
  }

  if (error?.code === 'ORDER_NOT_FOUND') {
    return (
      <main className='mx-auto max-w-3xl p-6'>
        <Link
          to='/account/orders'
          className='text-sm font-medium underline underline-offset-4'>
          Back to orders
        </Link>

        <section className='mt-8 border border-neutral-200 p-8 text-center'>
          <h1 className='text-2xl font-semibold'>Order not found</h1>

          <p className='mx-auto mt-3 max-w-lg text-sm leading-6 text-neutral-600'>
            This order does not exist or is not available in your account.
          </p>

          <Link
            to='/account/orders'
            className='mt-5 inline-flex bg-black px-5 py-3 text-sm font-medium text-white'>
            View my orders
          </Link>
        </section>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className='mx-auto max-w-3xl p-6'>
        <Link
          to='/account/orders'
          className='text-sm font-medium underline underline-offset-4'>
          Back to orders
        </Link>

        <section className='mt-8 border border-red-200 bg-red-50 p-6'>
          <p role='alert' className='text-sm text-red-700'>
            {error?.message ?? 'Unable to load this order.'}
          </p>

          <button
            type='button'
            onClick={loadOrder}
            className='mt-4 bg-black px-4 py-2 text-sm font-medium text-white'>
            Try again
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className='mx-auto max-w-5xl p-6'>
      <Link
        to='/account/orders'
        className='text-sm font-medium underline underline-offset-4'>
        Back to orders
      </Link>

      <div className='mt-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <p className='text-sm font-medium uppercase tracking-[0.2em] text-neutral-500'>
            Order details
          </p>

          <h1 className='mt-3 break-all text-2xl font-semibold sm:text-3xl'>
            {order.orderNumber}
          </h1>

          <p className='mt-2 text-sm text-neutral-600'>
            Placed {dateFormatter.format(new Date(order.placedAt))}
          </p>
        </div>

        <span
          className={[
            'inline-flex w-fit px-3 py-1.5 text-sm font-medium',
            ORDER_STATUS_STYLES[order.orderStatus] ??
              'bg-neutral-100 text-neutral-700',
          ].join(' ')}>
          {formatStatus(order.orderStatus)}
        </span>
      </div>

      {order.orderStatus === 'cancelled' && (
        <section className='mt-6 border border-red-200 bg-red-50 p-4 text-sm text-red-700'>
          This order was cancelled
          {order.cancelledAt
            ? ` on ${dateFormatter.format(new Date(order.cancelledAt))}.`
            : '.'}
        </section>
      )}

      {message && (
        <div
          role='status'
          className='mt-6 border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700'>
          {message}
        </div>
      )}

      {actionError && (
        <div
          role='alert'
          className='mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          {actionError.message}
        </div>
      )}

      <div className='mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start'>
        <div className='space-y-8'>
          <section className='border border-neutral-200 p-5 sm:p-6'>
            <h2 className='text-xl font-semibold'>Items</h2>

            <div className='mt-4'>
              {order.items.map((item) => {
                const options = Object.entries(item.variant?.options ?? {});

                return (
                  <article
                    key={item.id}
                    className='border-b border-neutral-200 py-5 last:border-0'>
                    <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                      <div>
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
                          Quantity: {item.quantity}
                        </p>
                      </div>

                      <div className='sm:text-right'>
                        <p className='font-semibold'>
                          {formatInrFromPaise(item.pricing.lineTotal)}
                        </p>

                        <p className='mt-1 text-xs text-neutral-500'>
                          {formatInrFromPaise(item.pricing.unitPrice)} each
                        </p>

                        {item.pricing.itemDiscount > 0 && (
                          <p className='mt-1 text-xs text-green-700'>
                            Item discount:{' '}
                            {formatInrFromPaise(item.pricing.itemDiscount)} each
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className='border border-neutral-200 p-5 sm:p-6'>
            <h2 className='text-xl font-semibold'>Shipping address</h2>

            <div className='mt-4 space-y-1 text-sm leading-6 text-neutral-700'>
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

          <section className='border border-neutral-200 p-5 sm:p-6'>
            <h2 className='text-xl font-semibold'>Payment</h2>

            {order.payment ? (
              <dl className='mt-5 grid gap-5 text-sm sm:grid-cols-2'>
                <div>
                  <dt className='text-neutral-500'>Status</dt>

                  <dd className='mt-1 font-medium'>
                    {formatStatus(order.payment.status)}
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
                  <dt className='text-neutral-500'>Payment reference</dt>

                  <dd className='mt-1 break-all font-medium'>
                    {order.payment.providerPaymentId ?? 'Not available'}
                  </dd>
                </div>

                <div className='sm:col-span-2'>
                  <dt className='text-neutral-500'>Verified</dt>

                  <dd className='mt-1 font-medium'>
                    {order.payment.verifiedAt
                      ? dateFormatter.format(new Date(order.payment.verifiedAt))
                      : 'Not verified'}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className='mt-4 text-sm text-neutral-600'>
                Payment information is unavailable.
              </p>
            )}
          </section>
        </div>

        <aside className='border border-neutral-200 p-5 sm:p-6 lg:sticky lg:top-6'>
          <h2 className='text-lg font-semibold'>Order summary</h2>

          <div className='mt-5 space-y-3'>
            <div className='flex justify-between gap-4'>
              <span className='text-sm text-neutral-600'>Subtotal</span>

              <span className='font-medium'>
                {formatInrFromPaise(order.pricing.subtotal)}
              </span>
            </div>

            {order.pricing.discountAmount > 0 && (
              <div className='flex justify-between gap-4'>
                <span className='text-sm text-neutral-600'>
                  Coupon discount
                </span>

                <span className='font-medium text-green-700'>
                  −{formatInrFromPaise(order.pricing.discountAmount)}
                </span>
              </div>
            )}

            {order.coupon && (
              <div className='border border-green-200 bg-green-50 p-3 text-sm text-green-800'>
                Coupon <span className='font-medium'>{order.coupon.code}</span>{' '}
                applied
              </div>
            )}

            <div className='flex justify-between gap-4 border-t border-neutral-200 pt-4'>
              <span className='font-semibold'>Total</span>

              <span className='text-xl font-semibold'>
                {formatInrFromPaise(order.pricing.totalAmount)}
              </span>
            </div>
          </div>

          <Link
            to='/shop'
            className='mt-6 inline-flex w-full justify-center border border-neutral-300 px-5 py-3 text-sm font-medium'>
            Continue shopping
          </Link>

          {order.orderStatus === 'placed' && (
            <div className='mt-6 border-t border-neutral-200 pt-6'>
              <h3 className='font-semibold'>Need to cancel?</h3>

              <p className='mt-2 text-sm leading-6 text-neutral-600'>
                This order can still be cancelled because fulfillment has not
                started.
              </p>

              <button
                type='button'
                disabled={cancelling}
                onClick={handleCancelOrder}
                className='mt-4 w-full border border-red-300 px-5 py-3 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50'>
                {cancelling ? 'Cancelling order...' : 'Cancel order'}
              </button>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

export default OrderDetailsPage;
