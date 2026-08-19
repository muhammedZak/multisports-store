import { Link, Navigate, useLocation, useParams } from 'react-router';

import { formatInrFromPaise } from '../../utils/money.js';

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatOptionName(name) {
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function OrderConfirmationPage() {
  const location = useLocation();

  const { orderId } = useParams();

  const order = location.state?.order ?? null;

  const payment = location.state?.payment ?? null;

  /*
   * Task 8.8 intentionally does not add a
   * Customer Order-detail backend API.
   *
   * Direct refresh therefore cannot recreate
   * this confirmation yet.
   *
   * Task 8.9 only verifies this placement flow;
   * Customer Order history remains later work.
   */
  if (!order) {
    return <Navigate to={`/account/orders/${orderId}`} replace />;
  }

  return (
    <main className='mx-auto max-w-5xl px-5 py-12'>
      <section className='border border-green-200 bg-green-50 p-6 sm:p-8'>
        <p className='text-sm font-medium uppercase tracking-[0.2em] text-green-700'>
          Order placed
        </p>

        <h1 className='mt-3 text-3xl font-semibold'>
          Thank you for your order
        </h1>

        <p className='mt-3 text-sm leading-6 text-green-900'>
          Your Razorpay payment was verified and your Order was placed
          successfully.
        </p>
      </section>

      <div className='mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start'>
        <div className='space-y-8'>
          <section className='border border-neutral-200 p-6'>
            <h2 className='text-xl font-semibold'>Order details</h2>

            <dl className='mt-5 grid gap-4 text-sm sm:grid-cols-2'>
              <div>
                <dt className='text-neutral-500'>Order number</dt>

                <dd className='mt-1 break-all font-medium'>
                  {order.orderNumber}
                </dd>
              </div>

              <div>
                <dt className='text-neutral-500'>Status</dt>

                <dd className='mt-1 font-medium capitalize'>
                  {order.orderStatus}
                </dd>
              </div>

              <div>
                <dt className='text-neutral-500'>Placed</dt>

                <dd className='mt-1 font-medium'>
                  {order.placedAt
                    ? dateFormatter.format(new Date(order.placedAt))
                    : '—'}
                </dd>
              </div>

              <div>
                <dt className='text-neutral-500'>Payment</dt>

                <dd className='mt-1 font-medium capitalize'>
                  {payment?.status ?? 'succeeded'}
                </dd>
              </div>
            </dl>
          </section>

          <section className='border border-neutral-200 p-6'>
            <h2 className='text-xl font-semibold'>Items</h2>

            <div className='mt-4'>
              {order.items.map((item) => {
                const options = Object.entries(item.variant?.options ?? {});

                return (
                  <article
                    key={item.id}
                    className='border-b border-neutral-200 py-5 last:border-0'>
                    <div className='flex items-start justify-between gap-5'>
                      <div>
                        <p className='font-semibold'>{item.product.name}</p>

                        {item.product.brand && (
                          <p className='mt-1 text-sm text-neutral-500'>
                            {item.product.brand}
                          </p>
                        )}

                        {options.length > 0 && (
                          <div className='mt-2 flex flex-wrap gap-3 text-sm text-neutral-600'>
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

                        <p className='mt-2 text-sm text-neutral-600'>
                          Quantity: {item.quantity}
                        </p>
                      </div>

                      <div className='text-right'>
                        <p className='font-semibold'>
                          {formatInrFromPaise(item.pricing.lineTotal)}
                        </p>

                        <p className='mt-1 text-xs text-neutral-500'>
                          {formatInrFromPaise(item.pricing.unitPrice)} each
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className='border border-neutral-200 p-6'>
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
        </div>

        <aside className='border border-neutral-200 p-6 lg:sticky lg:top-6'>
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
                <span className='font-medium'>{order.coupon.code}</span> applied
              </div>
            )}

            <div className='flex justify-between gap-4 border-t border-neutral-200 pt-4'>
              <span className='font-semibold'>Total paid</span>

              <span className='text-xl font-semibold'>
                {formatInrFromPaise(order.pricing.totalAmount)}
              </span>
            </div>
          </div>

          <Link
            to='/shop'
            className='mt-6 inline-flex w-full justify-center bg-black px-5 py-3 text-sm font-medium text-white'>
            Continue shopping
          </Link>

          <Link
            to={`/account/orders/${order.id}`}
            className='mt-3 inline-flex w-full justify-center border border-neutral-300 px-5 py-3 text-sm font-medium'>
            View order details
          </Link>
        </aside>
      </div>
    </main>
  );
}

export default OrderConfirmationPage;
