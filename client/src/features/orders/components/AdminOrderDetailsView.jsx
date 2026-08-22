import { Badge } from '../../../components/ui/Badge.jsx';

import { formatInrFromPaise } from '../../../utils/money.js';

import {
  formatOrderLabel,
  formatOrderOptionName,
  orderDateFormatter,
} from '../order.utils.js';

import {
  getAdminOrderCouponValueLabel,
  getAdminOrderItemCount,
} from '../adminOrder.utils.js';

import { PaymentStatusBadge } from './PaymentStatusBadge.jsx';

export function AdminOrderDetailsView({ order }) {
  const itemCount = getAdminOrderItemCount(order);

  return (
    <div className='mt-8 space-y-10'>
      <section className='grid gap-5 sm:grid-cols-2 xl:grid-cols-4'>
        <div className='border-t border-[var(--color-ink)] pt-4'>
          <p className='mb-0 text-sm text-[var(--color-muted)]'>Order total</p>

          <p className='mt-2 mb-0 text-2xl font-black ds-tabular-nums'>
            {formatInrFromPaise(order.pricing.totalAmount)}
          </p>
        </div>

        <div className='border-t border-[var(--color-border)] pt-4'>
          <p className='mb-0 text-sm text-[var(--color-muted)]'>Quantity</p>

          <p className='mt-2 mb-0 text-2xl font-black ds-tabular-nums'>
            {itemCount}
          </p>
        </div>

        <div className='border-t border-[var(--color-border)] pt-4'>
          <p className='mb-2 text-sm text-[var(--color-muted)]'>Payment</p>

          <PaymentStatusBadge status={order.payment?.status} />
        </div>

        <div className='border-t border-[var(--color-border)] pt-4'>
          <p className='mb-0 text-sm text-[var(--color-muted)]'>Fulfillment</p>

          <p className='mt-2 mb-0 font-bold'>
            {formatOrderLabel(order.orderStatus)}
          </p>
        </div>
      </section>

      <div className='grid gap-10 xl:grid-cols-2'>
        <section className='border-t border-[var(--color-border)] pt-6'>
          <h2 className='mb-0 text-lg font-black'>Customer</h2>

          <p className='mt-1 mb-0 text-xs text-[var(--color-muted)]'>
            Current account contact information
          </p>

          {order.customer ? (
            <dl className='mt-5 space-y-4 text-sm'>
              <div>
                <dt className='text-[var(--color-muted)]'>Name</dt>

                <dd className='mt-1 mb-0 font-semibold'>
                  {order.customer.name}
                </dd>
              </div>

              <div>
                <dt className='text-[var(--color-muted)]'>Email</dt>

                <dd className='mt-1 mb-0 break-all'>{order.customer.email}</dd>
              </div>

              <div>
                <dt className='text-[var(--color-muted)]'>Phone</dt>

                <dd className='mt-1 mb-0'>{order.customer.phone ?? '—'}</dd>
              </div>

              <div>
                <dt className='text-[var(--color-muted)]'>Customer ID</dt>

                <dd className='mt-1 mb-0 break-all font-mono text-xs'>
                  {order.customer.id}
                </dd>
              </div>
            </dl>
          ) : (
            <p className='mt-4 mb-0 text-sm text-[var(--color-muted)]'>
              Customer account information is unavailable.
            </p>
          )}
        </section>

        <section className='border-t border-[var(--color-border)] pt-6'>
          <h2 className='mb-0 text-lg font-black'>Shipping address</h2>

          <p className='mt-1 mb-0 text-xs text-[var(--color-muted)]'>
            Historical checkout snapshot
          </p>

          <div className='mt-5 space-y-1 text-sm leading-6 text-[var(--color-muted)]'>
            <p className='mb-0 font-bold text-[var(--color-ink)]'>
              {order.shippingAddress.fullName}
            </p>

            <p className='mb-0'>{order.shippingAddress.address}</p>

            <p className='mb-0'>
              {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
              {order.shippingAddress.postalCode}
            </p>

            <p className='mb-0'>{order.shippingAddress.country}</p>

            <p className='mt-2 mb-0 font-semibold text-[var(--color-ink)]'>
              {order.shippingAddress.phone}
            </p>
          </div>
        </section>
      </div>

      <section className='border-t border-[var(--color-border)] pt-6'>
        <h2 className='mb-0 text-lg font-black'>Purchased items</h2>

        <p className='mt-1 mb-0 text-xs text-[var(--color-muted)]'>
          Historical Product, Variant, quantity and pricing snapshots
        </p>

        <div className='mt-5 border-y border-[var(--color-border)]'>
          {order.items.map((item) => {
            const options = Object.entries(item.variant?.options ?? {});

            return (
              <article
                key={item.id}
                className='border-b border-[var(--color-border)] py-5 last:border-b-0'>
                <div className='flex flex-col gap-4 lg:flex-row lg:justify-between'>
                  <div>
                    <p className='mb-0 font-bold'>{item.product.name}</p>

                    <p className='mt-1 mb-0 text-sm text-[var(--color-muted)]'>
                      {item.product.brand}
                    </p>

                    <p className='mt-1 mb-0 text-xs capitalize text-[var(--color-muted)]'>
                      {item.product.sport} · {item.product.category.name}
                    </p>

                    {options.length > 0 ? (
                      <dl className='mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm'>
                        {options.map(([name, value]) => (
                          <div key={name} className='flex gap-1.5'>
                            <dt className='text-[var(--color-muted)]'>
                              {formatOrderOptionName(name)}
                            </dt>

                            <dd className='m-0 font-semibold'>
                              {String(value)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}

                    <p className='mt-3 mb-0 text-sm'>
                      Quantity: <strong>{item.quantity}</strong>
                    </p>
                  </div>

                  <dl className='min-w-52 space-y-3 text-sm lg:text-right'>
                    <div>
                      <dt className='text-[var(--color-muted)]'>Unit price</dt>

                      <dd className='mt-1 mb-0 font-semibold ds-tabular-nums'>
                        {formatInrFromPaise(item.pricing.unitPrice)}
                      </dd>
                    </div>

                    {item.pricing.itemDiscount > 0 ? (
                      <div>
                        <dt className='text-[var(--color-muted)]'>
                          Product discount
                        </dt>

                        <dd className='mt-1 mb-0 font-semibold text-[var(--color-success)] ds-tabular-nums'>
                          {formatInrFromPaise(item.pricing.itemDiscount)} each
                        </dd>
                      </div>
                    ) : null}

                    <div>
                      <dt className='text-[var(--color-muted)]'>Line total</dt>

                      <dd className='mt-1 mb-0 font-black ds-tabular-nums'>
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

      <div className='grid gap-10 border-t border-[var(--color-border)] pt-6 xl:grid-cols-2'>
        <section>
          <h2 className='mb-0 text-lg font-black'>Payment</h2>

          {!order.payment ? (
            <p className='mt-4 mb-0 text-sm text-[var(--color-muted)]'>
              Payment information is unavailable.
            </p>
          ) : (
            <dl className='mt-5 grid gap-5 text-sm sm:grid-cols-2'>
              <div>
                <dt className='text-[var(--color-muted)]'>Status</dt>

                <dd className='mt-2 mb-0'>
                  <PaymentStatusBadge status={order.payment.status} />
                </dd>
              </div>

              <div>
                <dt className='text-[var(--color-muted)]'>Provider</dt>

                <dd className='mt-1 mb-0 capitalize font-semibold'>
                  {order.payment.provider}
                </dd>
              </div>

              <div>
                <dt className='text-[var(--color-muted)]'>Amount</dt>

                <dd className='mt-1 mb-0 font-semibold ds-tabular-nums'>
                  {formatInrFromPaise(order.payment.amount)}
                </dd>
              </div>

              <div>
                <dt className='text-[var(--color-muted)]'>Currency</dt>

                <dd className='mt-1 mb-0 font-semibold'>
                  {order.payment.currency}
                </dd>
              </div>

              <div className='sm:col-span-2'>
                <dt className='text-[var(--color-muted)]'>Provider Order ID</dt>

                <dd className='mt-1 mb-0 break-all font-mono text-xs'>
                  {order.payment.providerOrderId ?? '—'}
                </dd>
              </div>

              <div className='sm:col-span-2'>
                <dt className='text-[var(--color-muted)]'>
                  Provider Payment ID
                </dt>

                <dd className='mt-1 mb-0 break-all font-mono text-xs'>
                  {order.payment.providerPaymentId ?? '—'}
                </dd>
              </div>

              <div className='sm:col-span-2'>
                <dt className='text-[var(--color-muted)]'>Backend verified</dt>

                <dd className='mt-1 mb-0'>
                  {order.payment.verifiedAt
                    ? orderDateFormatter.format(
                        new Date(order.payment.verifiedAt),
                      )
                    : '—'}
                </dd>
              </div>
            </dl>
          )}
        </section>

        <section>
          <h2 className='mb-0 text-lg font-black'>Order summary</h2>

          <dl className='mt-5 space-y-4'>
            <div className='flex justify-between gap-4'>
              <dt className='text-sm text-[var(--color-muted)]'>Subtotal</dt>

              <dd className='m-0 font-semibold ds-tabular-nums'>
                {formatInrFromPaise(order.pricing.subtotal)}
              </dd>
            </div>

            {order.pricing.discountAmount > 0 ? (
              <div className='flex justify-between gap-4'>
                <dt className='text-sm text-[var(--color-muted)]'>
                  Coupon discount
                </dt>

                <dd className='m-0 font-semibold text-[var(--color-success)] ds-tabular-nums'>
                  −{formatInrFromPaise(order.pricing.discountAmount)}
                </dd>
              </div>
            ) : null}

            {order.coupon ? (
              <div className='border-y border-[var(--color-border)] py-4'>
                <Badge variant='success'>{order.coupon.code}</Badge>

                <p className='mt-2 mb-0 text-xs text-[var(--color-muted)]'>
                  {formatOrderLabel(order.coupon.discountType)} ·{' '}
                  {getAdminOrderCouponValueLabel(order.coupon)}
                </p>

                <p className='mt-2 mb-0 text-sm font-semibold'>
                  Order discount:{' '}
                  {formatInrFromPaise(order.coupon.discountAmount)}
                </p>
              </div>
            ) : null}

            <div className='flex justify-between gap-4 border-t border-[var(--color-border)] pt-5'>
              <dt className='font-black'>Total</dt>

              <dd className='m-0 text-xl font-black ds-tabular-nums'>
                {formatInrFromPaise(order.pricing.totalAmount)}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
