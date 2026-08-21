import { Link } from 'react-router';

import { Badge } from '../../../components/ui/Badge.jsx';
import { Button } from '../../../components/ui/Button.jsx';

import { formatInrFromPaise } from '../../../utils/money.js';

import {
  formatOrderLabel,
  formatOrderOptionName,
  isOrderRefundEligible,
  orderDateFormatter,
} from '../order.utils.js';

function OrderItems({ items }) {
  return (
    <section className='border-t border-[var(--color-border)] pt-6'>
      <p className='mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]'>
        Purchase
      </p>

      <h2 className='mb-0 text-xl font-black tracking-[-0.025em]'>Items</h2>

      <div className='mt-5 border-y border-[var(--color-border)]'>
        {items.map((item) => {
          const options = Object.entries(item.variant?.options ?? {});

          return (
            <article
              key={item.id}
              className='border-b border-[var(--color-border)] py-5 last:border-b-0'>
              <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
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

                          <dd className='m-0 font-semibold'>{String(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}

                  <p className='mt-3 mb-0 text-sm text-[var(--color-muted)]'>
                    Quantity:{' '}
                    <span className='font-semibold text-[var(--color-ink)]'>
                      {item.quantity}
                    </span>
                  </p>
                </div>

                <div className='sm:text-right'>
                  <p className='mb-0 font-bold ds-tabular-nums'>
                    {formatInrFromPaise(item.pricing.lineTotal)}
                  </p>

                  <p className='mt-1 mb-0 text-xs text-[var(--color-muted)]'>
                    {formatInrFromPaise(item.pricing.unitPrice)} each
                  </p>

                  {item.pricing.itemDiscount > 0 ? (
                    <p className='mt-1 mb-0 text-xs text-[var(--color-success)]'>
                      Item discount:{' '}
                      {formatInrFromPaise(item.pricing.itemDiscount)} each
                    </p>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ShippingAddress({ address }) {
  return (
    <section className='border-t border-[var(--color-border)] pt-6'>
      <p className='mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]'>
        Delivery
      </p>

      <h2 className='mb-0 text-xl font-black tracking-[-0.025em]'>
        Shipping address
      </h2>

      <div className='mt-5 border-y border-[var(--color-border)] py-5 text-sm leading-6 text-[var(--color-muted)]'>
        <p className='mb-1 font-bold text-[var(--color-ink)]'>
          {address.fullName}
        </p>

        <p className='mb-0'>{address.address}</p>

        <p className='mb-0'>
          {address.city}, {address.state} {address.postalCode}
        </p>

        <p className='mb-0'>{address.country}</p>

        <p className='mt-2 mb-0 font-semibold text-[var(--color-ink-soft)]'>
          {address.phone}
        </p>
      </div>
    </section>
  );
}

function PaymentDetails({ payment }) {
  return (
    <section className='border-t border-[var(--color-border)] pt-6'>
      <p className='mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]'>
        Payment
      </p>

      <h2 className='mb-0 text-xl font-black tracking-[-0.025em]'>
        Payment details
      </h2>

      {!payment ? (
        <p className='mt-4 mb-0 text-sm text-[var(--color-muted)]'>
          Payment information is unavailable.
        </p>
      ) : (
        <dl className='mt-5 grid gap-x-8 gap-y-5 border-y border-[var(--color-border)] py-5 text-sm sm:grid-cols-2'>
          <div>
            <dt className='text-[var(--color-muted)]'>Status</dt>

            <dd className='mt-1 mb-0 font-semibold'>
              {formatOrderLabel(payment.status)}
            </dd>
          </div>

          <div>
            <dt className='text-[var(--color-muted)]'>Provider</dt>

            <dd className='mt-1 mb-0 capitalize font-semibold'>
              {payment.provider}
            </dd>
          </div>

          <div>
            <dt className='text-[var(--color-muted)]'>Amount</dt>

            <dd className='mt-1 mb-0 font-semibold ds-tabular-nums'>
              {formatInrFromPaise(payment.amount)}
            </dd>
          </div>

          <div>
            <dt className='text-[var(--color-muted)]'>Currency</dt>

            <dd className='mt-1 mb-0 font-semibold'>{payment.currency}</dd>
          </div>

          <div className='sm:col-span-2'>
            <dt className='text-[var(--color-muted)]'>Payment reference</dt>

            <dd className='mt-1 mb-0 break-all font-semibold'>
              {payment.providerPaymentId ?? 'Not available'}
            </dd>
          </div>

          <div className='sm:col-span-2'>
            <dt className='text-[var(--color-muted)]'>Verified</dt>

            <dd className='mt-1 mb-0 font-semibold'>
              {payment.verifiedAt
                ? orderDateFormatter.format(new Date(payment.verifiedAt))
                : 'Not verified'}
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}

export function OrderDetailsView({
  order,

  cancelling,

  onCancel,
}) {
  const refundEligible = isOrderRefundEligible(order);

  return (
    <div className='mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start xl:gap-16'>
      <div className='space-y-10'>
        <OrderItems items={order.items} />

        <ShippingAddress address={order.shippingAddress} />

        <PaymentDetails payment={order.payment} />
      </div>

      <aside className='border-t border-[var(--color-ink)] pt-5 lg:sticky lg:top-24'>
        <h2 className='mb-0 text-xl font-black tracking-[-0.025em]'>
          Order summary
        </h2>

        <div className='mt-5 space-y-4'>
          <div className='flex justify-between gap-4'>
            <span className='text-sm text-[var(--color-muted)]'>Subtotal</span>

            <span className='font-bold ds-tabular-nums'>
              {formatInrFromPaise(order.pricing.subtotal)}
            </span>
          </div>

          {order.pricing.discountAmount > 0 ? (
            <div className='flex justify-between gap-4'>
              <span className='text-sm text-[var(--color-muted)]'>
                Coupon discount
              </span>

              <span className='font-semibold text-[var(--color-success)] ds-tabular-nums'>
                −{formatInrFromPaise(order.pricing.discountAmount)}
              </span>
            </div>
          ) : null}

          {order.coupon ? (
            <Badge variant='success'>{order.coupon.code} applied</Badge>
          ) : null}

          <div className='flex items-baseline justify-between gap-4 border-t border-[var(--color-border)] pt-5'>
            <span className='font-bold'>Total</span>

            <span className='text-xl font-black tracking-[-0.025em] ds-tabular-nums'>
              {formatInrFromPaise(order.pricing.totalAmount)}
            </span>
          </div>
        </div>

        <Link
          to='/shop'
          className='mt-6 inline-flex min-h-11 w-full items-center justify-center border border-[var(--color-border-strong)] px-4 text-sm font-semibold hover:border-[var(--color-ink)]'>
          Continue shopping
        </Link>

        <section className='mt-7 border-t border-[var(--color-border)] pt-6'>
          <h3 className='mb-0 font-black'>Refunds</h3>

          {refundEligible ? (
            <>
              <p className='mt-2 mb-0 text-sm leading-6 text-[var(--color-muted)]'>
                Request a Refund for this whole Order or selected complete item
                lines.
              </p>

              <Link
                to={`/account/orders/${order.id}/refund-request`}
                className='mt-4 inline-flex min-h-11 w-full items-center justify-center border border-[var(--color-ink)] bg-[var(--color-ink)] px-4 text-sm font-bold text-white hover:bg-[#2b2b2b]'>
                Request Refund
              </Link>
            </>
          ) : (
            <p className='mt-2 mb-0 text-sm leading-6 text-[var(--color-muted)]'>
              Refund requests become available after delivery when payment is
              successfully verified.
            </p>
          )}
        </section>

        {order.orderStatus === 'placed' ? (
          <section className='mt-7 border-t border-[var(--color-border)] pt-6'>
            <h3 className='mb-0 font-black'>Need to cancel?</h3>

            <p className='mt-2 mb-0 text-sm leading-6 text-[var(--color-muted)]'>
              This Order can still be cancelled because fulfillment has not
              started.
            </p>

            <Button
              type='button'
              variant='secondary'
              disabled={cancelling}
              onClick={onCancel}
              className='mt-4 w-full text-[var(--color-danger)]'>
              {cancelling ? 'Cancelling order...' : 'Cancel order'}
            </Button>
          </section>
        ) : null}
      </aside>
    </div>
  );
}
