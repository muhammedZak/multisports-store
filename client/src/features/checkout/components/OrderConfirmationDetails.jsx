import { Badge } from '../../../components/ui/Badge.jsx';

import { orderDateFormatter } from '../checkout.utils.js';

export function OrderConfirmationDetails({ order, payment }) {
  return (
    <section className='border-t border-[var(--color-border)] pt-7'>
      <p className='mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]'>
        Order record
      </p>

      <h2 className='mb-0 text-xl font-black tracking-[-0.025em]'>
        Order details
      </h2>

      <dl className='mt-5 grid gap-x-8 gap-y-5 border-y border-[var(--color-border)] py-5 text-sm sm:grid-cols-2'>
        <div>
          <dt className='text-[var(--color-muted)]'>Order number</dt>

          <dd className='mt-1 mb-0 break-all font-bold'>{order.orderNumber}</dd>
        </div>

        <div>
          <dt className='text-[var(--color-muted)]'>Order status</dt>

          <dd className='mt-2 mb-0'>
            <Badge variant='success'>{order.orderStatus}</Badge>
          </dd>
        </div>

        <div>
          <dt className='text-[var(--color-muted)]'>Placed</dt>

          <dd className='mt-1 mb-0 font-semibold'>
            {order.placedAt
              ? orderDateFormatter.format(new Date(order.placedAt))
              : '—'}
          </dd>
        </div>

        <div>
          <dt className='text-[var(--color-muted)]'>Payment</dt>

          <dd className='mt-2 mb-0'>
            <Badge variant='success'>{payment?.status ?? 'succeeded'}</Badge>
          </dd>
        </div>
      </dl>
    </section>
  );
}

export function OrderConfirmationShipping({ address }) {
  return (
    <section className='border-t border-[var(--color-border)] pt-7'>
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
