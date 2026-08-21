import { Link } from 'react-router';

import {
  formatRefundAmount,
  formatRefundLabel,
  getRefundScopeSummary,
  refundDateFormatter,
} from '../refund.utils.js';

import { RefundStatusBadge } from './RefundStatusBadge.jsx';

export function RefundHistoryCard({ refund }) {
  return (
    <article className='border-t border-[var(--color-border)] py-6 first:border-t-0 first:pt-0'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <p className='mb-0 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]'>
            {refund.order?.orderNumber ?? 'Account compensation'}
          </p>

          <p className='mt-2 mb-0 text-lg font-black tracking-[-0.02em] ds-tabular-nums'>
            {formatRefundAmount(refund.amount, refund.currency)}
          </p>

          <p className='mt-2 mb-0 text-sm text-[var(--color-muted)]'>
            Requested {refundDateFormatter.format(new Date(refund.requestedAt))}
          </p>
        </div>

        <RefundStatusBadge status={refund.status} />
      </div>

      <dl className='mt-5 grid gap-4 border-y border-[var(--color-border)] py-4 text-sm sm:grid-cols-3'>
        <div>
          <dt className='text-[var(--color-muted)]'>Origin</dt>

          <dd className='mt-1 mb-0 font-semibold'>
            {formatRefundLabel(refund.origin)}
          </dd>
        </div>

        <div>
          <dt className='text-[var(--color-muted)]'>Scope</dt>

          <dd className='mt-1 mb-0 font-semibold'>
            {getRefundScopeSummary(refund)}
          </dd>
        </div>

        <div>
          <dt className='text-[var(--color-muted)]'>Currency</dt>

          <dd className='mt-1 mb-0 font-semibold'>{refund.currency}</dd>
        </div>
      </dl>

      <Link
        to={`/account/refunds/${refund.id}`}
        className='mt-4 inline-flex text-sm font-semibold underline decoration-[var(--color-border-strong)] underline-offset-4'>
        View Refund details
      </Link>
    </article>
  );
}
