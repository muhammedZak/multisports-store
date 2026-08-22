import { Link } from 'react-router';

import { RefundStatusBadge } from './RefundStatusBadge.jsx';

import {
  formatRefundAmount,
  formatRefundLabel,
  getRefundScopeSummary,
  refundDateFormatter,
} from '../refund.utils.js';

import { getAdminRefundReasonSummary } from '../adminRefund.utils.js';

export function AdminRefundTable({ refunds }) {
  return (
    <>
      <div className='grid gap-5 md:hidden'>
        {refunds.map((refund) => (
          <article
            key={refund.id}
            className='border-y border-[var(--color-border)] py-5'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <p className='mb-0 font-black'>
                  {refund.order?.orderNumber ?? 'System compensation'}
                </p>

                <p className='mt-1 mb-0 text-xs text-[var(--color-muted)]'>
                  {refundDateFormatter.format(new Date(refund.requestedAt))}
                </p>
              </div>

              <RefundStatusBadge status={refund.status} />
            </div>

            <dl className='mt-5 grid gap-4 text-sm sm:grid-cols-2'>
              <div>
                <dt className='text-[var(--color-muted)]'>Customer</dt>

                <dd className='mt-1 mb-0 font-semibold'>
                  {refund.customer?.name ?? 'Unavailable'}
                </dd>

                <dd className='mb-0 break-all text-xs text-[var(--color-muted)]'>
                  {refund.customer?.email ?? 'Not available'}
                </dd>
              </div>

              <div>
                <dt className='text-[var(--color-muted)]'>Amount</dt>

                <dd className='mt-1 mb-0 font-black ds-tabular-nums'>
                  {formatRefundAmount(refund.amount, refund.currency)}
                </dd>
              </div>

              <div>
                <dt className='text-[var(--color-muted)]'>Origin</dt>

                <dd className='mt-1 mb-0'>
                  {formatRefundLabel(refund.origin)}
                </dd>
              </div>

              <div>
                <dt className='text-[var(--color-muted)]'>Scope</dt>

                <dd className='mt-1 mb-0'>{getRefundScopeSummary(refund)}</dd>
              </div>
            </dl>

            <p className='mt-4 mb-0 text-sm leading-6 text-[var(--color-ink-soft)]'>
              {getAdminRefundReasonSummary(refund.reason)}
            </p>

            <Link
              to={`/admin/refunds/${refund.id}`}
              className='mt-4 inline-flex text-sm font-semibold underline underline-offset-4'>
              View Refund
            </Link>
          </article>
        ))}
      </div>

      <div className='hidden overflow-x-auto border-y border-[var(--color-border)] md:block'>
        <table className='min-w-full text-left text-sm'>
          <thead className='bg-[var(--color-surface)]'>
            <tr>
              <th className='px-4 py-3 font-bold'>Refund</th>

              <th className='px-4 py-3 font-bold'>Customer</th>

              <th className='px-4 py-3 font-bold'>Origin / scope</th>

              <th className='px-4 py-3 font-bold'>Amount</th>

              <th className='px-4 py-3 font-bold'>Reason</th>

              <th className='px-4 py-3 font-bold'>Status</th>

              <th className='px-4 py-3 font-bold'>Action</th>
            </tr>
          </thead>

          <tbody>
            {refunds.map((refund) => (
              <tr
                key={refund.id}
                className='border-t border-[var(--color-border)] align-top'>
                <td className='min-w-48 px-4 py-4'>
                  <p className='mb-0 font-bold'>
                    {refund.order?.orderNumber ?? 'System compensation'}
                  </p>

                  <p className='mt-1 mb-0 whitespace-nowrap text-xs text-[var(--color-muted)]'>
                    {refundDateFormatter.format(new Date(refund.requestedAt))}
                  </p>
                </td>

                <td className='min-w-48 px-4 py-4'>
                  <p className='mb-0 font-semibold'>
                    {refund.customer?.name ?? 'Unavailable'}
                  </p>

                  <p className='mt-1 mb-0 break-all text-xs text-[var(--color-muted)]'>
                    {refund.customer?.email ?? 'Not available'}
                  </p>
                </td>

                <td className='min-w-44 px-4 py-4'>
                  <p className='mb-0'>{formatRefundLabel(refund.origin)}</p>

                  <p className='mt-1 mb-0 text-xs text-[var(--color-muted)]'>
                    {getRefundScopeSummary(refund)}
                  </p>
                </td>

                <td className='whitespace-nowrap px-4 py-4 font-black ds-tabular-nums'>
                  {formatRefundAmount(refund.amount, refund.currency)}
                </td>

                <td className='max-w-xs px-4 py-4 leading-6'>
                  {getAdminRefundReasonSummary(refund.reason)}
                </td>

                <td className='px-4 py-4'>
                  <RefundStatusBadge status={refund.status} />
                </td>

                <td className='px-4 py-4'>
                  <Link
                    to={`/admin/refunds/${refund.id}`}
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
