import { Link } from 'react-router';

import { formatInrFromPaise } from '../../../utils/money.js';

import { CartCouponSection } from './CartCouponSection.jsx';

export function CartSummary({
  isCustomer,
  isGuest,

  itemsCount,

  summarySubtotal,
  summaryDiscountAmount,
  summaryTotalAmount,

  hasCouponPricing,

  customerCartHasIssues,
  customerCanCheckout,

  coupon,
}) {
  return (
    <aside className='border-t border-[var(--color-ink)] pt-5 lg:sticky lg:top-24'>
      <div className='flex items-baseline justify-between gap-4'>
        <h2 className='mb-0 text-xl font-black tracking-[-0.025em]'>Summary</h2>

        <p className='mb-0 text-xs text-[var(--color-muted)]'>
          {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
        </p>
      </div>

      <div className='mt-5 space-y-5'>
        <div className='flex justify-between gap-4'>
          <span className='text-sm text-[var(--color-muted)]'>Subtotal</span>

          <span className='font-bold ds-tabular-nums'>
            {formatInrFromPaise(summarySubtotal)}
          </span>
        </div>

        <CartCouponSection
          isCustomer={isCustomer}
          isGuest={isGuest}
          itemsCount={itemsCount}
          customerCartHasIssues={customerCartHasIssues}
          coupon={coupon}
        />

        {hasCouponPricing ? (
          <div className='space-y-3 border-t border-[var(--color-border)] pt-5'>
            <div className='flex justify-between gap-4'>
              <span className='text-sm text-[var(--color-muted)]'>
                Coupon discount
              </span>

              <span className='font-semibold text-[var(--color-success)] ds-tabular-nums'>
                −{formatInrFromPaise(summaryDiscountAmount)}
              </span>
            </div>

            <div className='flex items-baseline justify-between gap-4 border-t border-[var(--color-border)] pt-4'>
              <span className='font-bold'>
                {isGuest ? 'Preview total' : 'Cart total'}
              </span>

              <span className='text-xl font-black tracking-[-0.025em] ds-tabular-nums'>
                {formatInrFromPaise(summaryTotalAmount)}
              </span>
            </div>

            {isGuest ? (
              <p className='mb-0 text-xs leading-5 text-[var(--color-muted)]'>
                Guest Coupon validation is temporary. It does not reserve stock,
                save the Coupon, or consume Coupon usage.
              </p>
            ) : (
              <p className='mb-0 text-xs leading-5 text-[var(--color-muted)]'>
                Coupon pricing is recalculated from current server-side Product,
                Inventory, and Coupon state.
              </p>
            )}
          </div>
        ) : null}

        {isCustomer && !coupon.customerCoupon ? (
          <div className='flex items-baseline justify-between gap-4 border-t border-[var(--color-border)] pt-5'>
            <span className='font-bold'>Cart total</span>

            <span className='text-xl font-black tracking-[-0.025em] ds-tabular-nums'>
              {formatInrFromPaise(summaryTotalAmount)}
            </span>
          </div>
        ) : null}
      </div>

      <p className='mt-5 mb-0 text-xs leading-5 text-[var(--color-muted)]'>
        Prices shown use the latest Product pricing successfully resolved for
        this Cart view. Refresh any item that needs attention.
      </p>

      {isCustomer ? (
        customerCanCheckout && !customerCartHasIssues ? (
          <Link
            to='/checkout'
            className='mt-6 inline-flex min-h-12 w-full items-center justify-center border border-[var(--color-ink)] bg-[var(--color-ink)] px-5 text-sm font-bold text-white transition hover:bg-[#2b2b2b]'>
            Checkout
          </Link>
        ) : (
          <div className='mt-6'>
            <button
              type='button'
              disabled
              className='min-h-12 w-full cursor-not-allowed border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-5 text-sm font-bold text-[var(--color-muted)]'>
              Checkout
            </button>

            <p className='mt-2 mb-0 text-xs leading-5 text-[var(--color-muted)]'>
              Resolve unavailable items or Cart issues before checkout.
            </p>
          </div>
        )
      ) : null}

      {isGuest ? (
        <Link
          to='/checkout'
          className='mt-6 inline-flex min-h-12 w-full items-center justify-center border border-[var(--color-ink)] bg-[var(--color-ink)] px-5 text-sm font-bold text-white transition hover:bg-[#2b2b2b]'>
          Sign in to checkout
        </Link>
      ) : null}

      <Link
        to='/shop'
        className='mt-3 inline-flex min-h-11 w-full items-center justify-center border border-[var(--color-border-strong)] bg-white px-5 text-sm font-semibold transition hover:border-[var(--color-ink)]'>
        Continue shopping
      </Link>
    </aside>
  );
}
