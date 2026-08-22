import { Link } from 'react-router';

import { formatInrFromPaise } from '../../../utils/money.js';

import { formatCouponDate, getCouponDiscountLabel } from '../coupon.utils.js';

import { CouponStatusBadge } from './CouponStatusBadge.jsx';

export function AdminCouponTable({ model }) {
  return (
    <div className='overflow-x-auto border-y border-[var(--color-border)]'>
      <table className='min-w-full text-left text-sm'>
        <thead className='bg-[var(--color-surface)]'>
          <tr>
            <th className='px-4 py-3 font-bold'>Coupon</th>

            <th className='px-4 py-3 font-bold'>Discount</th>

            <th className='px-4 py-3 font-bold'>Minimum</th>

            <th className='px-4 py-3 font-bold'>Usage</th>

            <th className='px-4 py-3 font-bold'>Expiry</th>

            <th className='px-4 py-3 font-bold'>Status</th>

            <th className='px-4 py-3 font-bold'>Actions</th>
          </tr>
        </thead>

        <tbody>
          {model.coupons.map((coupon) => {
            const updating = model.statusUpdatingId === coupon.id;

            return (
              <tr
                key={coupon.id}
                className='border-t border-[var(--color-border)] align-top'>
                <td className='px-4 py-4'>
                  <p className='mb-0 font-black'>{coupon.code}</p>

                  <p className='mt-1 mb-0 text-xs capitalize text-[var(--color-muted)]'>
                    {coupon.discountType}
                  </p>
                </td>

                <td className='whitespace-nowrap px-4 py-4 font-semibold'>
                  {getCouponDiscountLabel(coupon)}
                </td>

                <td className='whitespace-nowrap px-4 py-4'>
                  {coupon.minimumOrderAmount > 0
                    ? formatInrFromPaise(coupon.minimumOrderAmount)
                    : 'None'}
                </td>

                <td className='whitespace-nowrap px-4 py-4'>
                  {coupon.usedCount}
                  {' / '}
                  {coupon.usageLimit ?? 'Unlimited'}
                </td>

                <td className='min-w-44 px-4 py-4 text-[var(--color-muted)]'>
                  {formatCouponDate(coupon.expiresAt)}
                </td>

                <td className='px-4 py-4'>
                  <CouponStatusBadge isActive={coupon.isActive} />
                </td>

                <td className='px-4 py-4'>
                  <div className='flex min-w-36 flex-col items-start gap-2'>
                    <Link
                      to={`/admin/coupons/${coupon.id}/edit`}
                      className='font-semibold underline underline-offset-4'>
                      Edit
                    </Link>

                    <button
                      type='button'
                      disabled={Boolean(model.statusUpdatingId)}
                      onClick={() => model.changeStatus(coupon)}
                      className='font-semibold underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50'>
                      {updating
                        ? 'Updating...'
                        : coupon.isActive
                          ? 'Deactivate'
                          : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
