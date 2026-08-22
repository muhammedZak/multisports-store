import { Link } from 'react-router';

import { formatInrFromPaise } from '../../../utils/money.js';

import { orderDateFormatter } from '../order.utils.js';

import { OrderStatusBadge } from './OrderStatusBadge.jsx';

import { PaymentStatusBadge } from './PaymentStatusBadge.jsx';

export function AdminOrderTable({ orders }) {
  return (
    <>
      <div className='grid gap-5 md:hidden'>
        {orders.map((order) => (
          <article
            key={order.id}
            className='border-y border-[var(--color-border)] py-5'>
            <div className='flex items-start justify-between gap-4'>
              <div className='min-w-0'>
                <p className='mb-0 break-all font-black'>{order.orderNumber}</p>

                <p className='mt-1 mb-0 text-xs text-[var(--color-muted)]'>
                  {orderDateFormatter.format(new Date(order.placedAt))}
                </p>
              </div>

              <OrderStatusBadge status={order.orderStatus} />
            </div>

            <dl className='mt-5 grid gap-4 text-sm sm:grid-cols-2'>
              <div>
                <dt className='text-[var(--color-muted)]'>Customer</dt>

                <dd className='mt-1 mb-0 font-semibold'>
                  {order.customer?.name ?? 'Unavailable'}
                </dd>

                <dd className='mb-0 break-all text-xs text-[var(--color-muted)]'>
                  {order.customer?.email ?? '—'}
                </dd>
              </div>

              <div>
                <dt className='text-[var(--color-muted)]'>Items</dt>

                <dd className='mt-1 mb-0 font-semibold'>{order.itemCount}</dd>
              </div>

              <div>
                <dt className='text-[var(--color-muted)]'>Total</dt>

                <dd className='mt-1 mb-0 font-black ds-tabular-nums'>
                  {formatInrFromPaise(order.pricing.totalAmount)}
                </dd>
              </div>

              <div>
                <dt className='text-[var(--color-muted)]'>Payment</dt>

                <dd className='mt-2 mb-0'>
                  <PaymentStatusBadge status={order.payment?.status} />
                </dd>
              </div>
            </dl>

            <Link
              to={`/admin/orders/${order.id}`}
              className='mt-5 inline-flex text-sm font-semibold underline underline-offset-4'>
              View Order
            </Link>
          </article>
        ))}
      </div>

      <div className='hidden overflow-x-auto border-y border-[var(--color-border)] md:block'>
        <table className='min-w-full text-left text-sm'>
          <thead className='bg-[var(--color-surface)]'>
            <tr>
              <th className='px-4 py-3 font-bold'>Order</th>

              <th className='px-4 py-3 font-bold'>Customer</th>

              <th className='px-4 py-3 font-bold'>Items</th>

              <th className='px-4 py-3 font-bold'>Total</th>

              <th className='px-4 py-3 font-bold'>Payment</th>

              <th className='px-4 py-3 font-bold'>Status</th>

              <th className='px-4 py-3 font-bold'>Action</th>
            </tr>
          </thead>

          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                className='border-t border-[var(--color-border)] align-top'>
                <td className='min-w-52 px-4 py-4'>
                  <p className='mb-0 break-all font-bold'>
                    {order.orderNumber}
                  </p>

                  <p className='mt-1 mb-0 whitespace-nowrap text-xs text-[var(--color-muted)]'>
                    {orderDateFormatter.format(new Date(order.placedAt))}
                  </p>
                </td>

                <td className='min-w-48 px-4 py-4'>
                  <p className='mb-0 font-semibold'>
                    {order.customer?.name ?? 'Unavailable'}
                  </p>

                  <p className='mt-1 mb-0 break-all text-xs text-[var(--color-muted)]'>
                    {order.customer?.email ?? '—'}
                  </p>
                </td>

                <td className='px-4 py-4'>{order.itemCount}</td>

                <td className='whitespace-nowrap px-4 py-4 font-bold ds-tabular-nums'>
                  {formatInrFromPaise(order.pricing.totalAmount)}
                </td>

                <td className='px-4 py-4'>
                  <PaymentStatusBadge status={order.payment?.status} />
                </td>

                <td className='px-4 py-4'>
                  <OrderStatusBadge status={order.orderStatus} />
                </td>

                <td className='px-4 py-4'>
                  <Link
                    to={`/admin/orders/${order.id}`}
                    className='font-semibold underline underline-offset-4'>
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}