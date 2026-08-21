import { Link } from 'react-router';

import { Badge } from '../../../components/ui/Badge.jsx';

import { formatInrFromPaise } from '../../../utils/money.js';

export function OrderConfirmationSummary({ order }) {
  return (
    <aside className='border-t border-[var(--color-ink)] pt-5 lg:sticky lg:top-24'>
      <p className='mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]'>
        Payment
      </p>

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
          <div>
            <Badge variant='success'>{order.coupon.code} applied</Badge>
          </div>
        ) : null}

        <div className='flex items-baseline justify-between gap-4 border-t border-[var(--color-border)] pt-5'>
          <span className='font-bold'>Total paid</span>

          <span className='text-xl font-black tracking-[-0.03em] ds-tabular-nums'>
            {formatInrFromPaise(order.pricing.totalAmount)}
          </span>
        </div>
      </div>

      <Link
        to='/shop'
        className='mt-6 inline-flex min-h-12 w-full items-center justify-center border border-[var(--color-ink)] bg-[var(--color-ink)] px-5 text-sm font-bold text-white transition hover:bg-[#2b2b2b]'>
        Continue shopping
      </Link>

      <Link
        to={`/account/orders/${order.id}`}
        className='mt-3 inline-flex min-h-11 w-full items-center justify-center border border-[var(--color-border-strong)] bg-white px-5 text-sm font-semibold transition hover:border-[var(--color-ink)]'>
        View Order details
      </Link>
    </aside>
  );
}
