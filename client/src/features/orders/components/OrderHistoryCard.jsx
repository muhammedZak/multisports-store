import { Link } from 'react-router';

import { formatInrFromPaise } from '../../../utils/money.js';

import { formatOrderLabel, orderDateFormatter } from '../order.utils.js';

import { OrderStatusBadge } from './OrderStatusBadge.jsx';

export function OrderHistoryCard({ order }) {
  return (
    <article className='border-t border-[var(--color-border)] py-6 first:border-t-0 first:pt-0'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <p className='mb-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]'>
            Order number
          </p>

          <p className='mb-0 break-all font-black tracking-[-0.01em]'>
            {order.orderNumber}
          </p>

          <p className='mt-2 mb-0 text-sm text-[var(--color-muted)]'>
            {orderDateFormatter.format(new Date(order.placedAt))}
          </p>
        </div>

        <OrderStatusBadge status={order.orderStatus} />
      </div>

      <dl className='mt-5 grid gap-4 border-y border-[var(--color-border)] py-4 text-sm sm:grid-cols-3'>
        <div>
          <dt className='text-[var(--color-muted)]'>Total</dt>

          <dd className='mt-1 mb-0 font-bold ds-tabular-nums'>
            {formatInrFromPaise(order.pricing.totalAmount)}
          </dd>
        </div>

        <div>
          <dt className='text-[var(--color-muted)]'>Items</dt>

          <dd className='mt-1 mb-0 font-semibold'>
            {order.itemCount} item
            {order.itemCount === 1 ? '' : 's'}
          </dd>
        </div>

        <div>
          <dt className='text-[var(--color-muted)]'>Payment</dt>

          <dd className='mt-1 mb-0 font-semibold'>
            {order.payment?.status
              ? formatOrderLabel(order.payment.status)
              : 'Unavailable'}
          </dd>
        </div>
      </dl>

      <Link
        to={`/account/orders/${order.id}`}
        className='mt-4 inline-flex text-sm font-semibold underline decoration-[var(--color-border-strong)] underline-offset-4 hover:decoration-[var(--color-ink)]'>
        View order details
      </Link>
    </article>
  );
}
