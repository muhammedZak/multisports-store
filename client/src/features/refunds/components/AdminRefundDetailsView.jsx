import { Link } from 'react-router';

import { formatInrFromPaise } from '../../../utils/money.js';

import {
  formatRefundAmount,
  formatRefundLabel,
  formatRefundOptionName,
  getRefundScopeSummary,
  refundDateFormatter,
} from '../refund.utils.js';

import { formatAdminRefundRestockDecision } from '../adminRefund.utils.js';

export function AdminRefundDetailsView({ refund }) {
  const affectedItems = refund.affectedItems ?? [];

  return (
    <div className='mt-8 grid gap-12 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start'>
      <div className='space-y-10'>
        <section className='border-t border-[var(--color-border)] pt-6'>
          <h2 className='mb-0 text-lg font-black'>Refund request</h2>

          <dl className='mt-5 grid gap-5 border-y border-[var(--color-border)] py-5 text-sm sm:grid-cols-2'>
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
              <dt className='text-[var(--color-muted)]'>Refund amount</dt>

              <dd className='mt-1 mb-0 font-black ds-tabular-nums'>
                {formatRefundAmount(refund.amount, refund.currency)}
              </dd>
            </div>

            <div>
              <dt className='text-[var(--color-muted)]'>
                Restock on completion
              </dt>

              <dd className='mt-1 mb-0 font-semibold'>
                {formatAdminRefundRestockDecision(refund.restockOnCompletion)}
              </dd>
            </div>

            <div className='sm:col-span-2'>
              <dt className='text-[var(--color-muted)]'>Reason</dt>

              <dd className='mt-1 mb-0 whitespace-pre-wrap font-semibold'>
                {refund.reason}
              </dd>
            </div>

            <div className='sm:col-span-2'>
              <dt className='text-[var(--color-muted)]'>Explanation</dt>

              <dd className='mt-1 mb-0 whitespace-pre-wrap text-[var(--color-ink-soft)]'>
                {refund.explanation || 'No additional explanation provided.'}
              </dd>
            </div>

            <div className='sm:col-span-2'>
              <dt className='text-[var(--color-muted)]'>Admin decision note</dt>

              <dd className='mt-1 mb-0 whitespace-pre-wrap text-[var(--color-ink-soft)]'>
                {refund.adminDecisionNote || 'No Admin decision note.'}
              </dd>
            </div>
          </dl>
        </section>

        <section className='border-t border-[var(--color-border)] pt-6'>
          <h2 className='mb-0 text-lg font-black'>Affected items</h2>

          {affectedItems.length > 0 ? (
            <div className='mt-5 border-y border-[var(--color-border)]'>
              {affectedItems.map((item) => {
                const options = Object.entries(item.variant?.options ?? {});

                return (
                  <article
                    key={item.id}
                    className='flex flex-col gap-4 border-b border-[var(--color-border)] py-5 last:border-b-0 sm:flex-row sm:justify-between'>
                    <div>
                      <p className='mb-0 font-bold'>{item.product.name}</p>

                      <p className='mt-1 mb-0 text-sm text-[var(--color-muted)]'>
                        {item.product.brand}
                      </p>

                      {options.length > 0 ? (
                        <div className='mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-muted)]'>
                          {options.map(([name, value]) => (
                            <span key={name}>
                              {formatRefundOptionName(name)}: {String(value)}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <p className='mt-2 mb-0 text-sm text-[var(--color-muted)]'>
                        Historical quantity: {item.quantity}
                      </p>
                    </div>

                    <div className='sm:text-right'>
                      <p className='mb-0 font-black ds-tabular-nums'>
                        {formatInrFromPaise(item.pricing.lineTotal)}
                      </p>

                      <p className='mt-1 mb-0 text-xs text-[var(--color-muted)]'>
                        Historical line price
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className='mt-4 mb-0 text-sm text-[var(--color-muted)]'>
              No immutable Order item snapshots apply to this Refund.
            </p>
          )}
        </section>

        <section className='border-t border-[var(--color-border)] pt-6'>
          <h2 className='mb-0 text-lg font-black'>Decision history</h2>

          <dl className='mt-5 grid gap-5 text-sm sm:grid-cols-2'>
            <div>
              <dt className='text-[var(--color-muted)]'>Reviewed by</dt>

              <dd className='mt-1 mb-0'>
                {refund.reviewedBy
                  ? `${refund.reviewedBy.name} (${refund.reviewedBy.email})`
                  : 'Not reviewed'}
              </dd>
            </div>

            <div>
              <dt className='text-[var(--color-muted)]'>Reviewed at</dt>

              <dd className='mt-1 mb-0'>
                {refund.reviewedAt
                  ? refundDateFormatter.format(new Date(refund.reviewedAt))
                  : 'Not available'}
              </dd>
            </div>

            <div>
              <dt className='text-[var(--color-muted)]'>Refunded at</dt>

              <dd className='mt-1 mb-0'>
                {refund.refundedAt
                  ? refundDateFormatter.format(new Date(refund.refundedAt))
                  : 'Not available'}
              </dd>
            </div>

            <div>
              <dt className='text-[var(--color-muted)]'>Last updated</dt>

              <dd className='mt-1 mb-0'>
                {refund.updatedAt
                  ? refundDateFormatter.format(new Date(refund.updatedAt))
                  : 'Not available'}
              </dd>
            </div>

            <div className='sm:col-span-2'>
              <dt className='text-[var(--color-muted)]'>Provider Refund ID</dt>

              <dd className='mt-1 mb-0 break-all font-semibold'>
                {refund.providerRefundId ?? 'Not assigned'}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <aside className='space-y-8 xl:sticky xl:top-24'>
        <section className='border-t border-[var(--color-ink)] pt-5'>
          <h2 className='mb-0 font-black'>Customer</h2>

          {refund.customer ? (
            <dl className='mt-4 space-y-4 text-sm'>
              <div>
                <dt className='text-[var(--color-muted)]'>Name</dt>

                <dd className='mt-1 mb-0 font-semibold'>
                  {refund.customer.name}
                </dd>
              </div>

              <div>
                <dt className='text-[var(--color-muted)]'>Email</dt>

                <dd className='mt-1 mb-0 break-all'>{refund.customer.email}</dd>
              </div>

              <div>
                <dt className='text-[var(--color-muted)]'>Customer ID</dt>

                <dd className='mt-1 mb-0 break-all text-xs'>
                  {refund.customer.id}
                </dd>
              </div>
            </dl>
          ) : (
            <p className='mt-4 mb-0 text-sm text-[var(--color-muted)]'>
              Customer information is unavailable.
            </p>
          )}
        </section>

        <section className='border-t border-[var(--color-border)] pt-5'>
          <h2 className='mb-0 font-black'>Order</h2>

          {refund.order ? (
            <div className='mt-4 text-sm'>
              <p className='mb-0 font-bold'>{refund.order.orderNumber}</p>

              <p className='mt-2 mb-0 text-[var(--color-muted)]'>
                Status: {formatRefundLabel(refund.order.orderStatus)}
              </p>

              <p className='mt-2 mb-0 text-[var(--color-muted)]'>
                Placed:{' '}
                {refundDateFormatter.format(new Date(refund.order.placedAt))}
              </p>

              <dl className='mt-4 space-y-2 border-t border-[var(--color-border)] pt-4'>
                <div className='flex justify-between gap-4'>
                  <dt>Subtotal</dt>

                  <dd className='m-0 ds-tabular-nums'>
                    {formatInrFromPaise(refund.order.pricing.subtotal)}
                  </dd>
                </div>

                <div className='flex justify-between gap-4'>
                  <dt>Discount</dt>

                  <dd className='m-0 ds-tabular-nums'>
                    {formatInrFromPaise(refund.order.pricing.discountAmount)}
                  </dd>
                </div>

                <div className='flex justify-between gap-4 font-black'>
                  <dt>Total</dt>

                  <dd className='m-0 ds-tabular-nums'>
                    {formatInrFromPaise(refund.order.pricing.totalAmount)}
                  </dd>
                </div>
              </dl>

              <Link
                to={`/admin/orders/${refund.order.id}`}
                className='mt-4 inline-flex font-semibold underline underline-offset-4'>
                View Order
              </Link>
            </div>
          ) : (
            <p className='mt-4 mb-0 text-sm leading-6 text-[var(--color-muted)]'>
              No Order is linked. This is valid for system compensation.
            </p>
          )}
        </section>

        <section className='border-t border-[var(--color-border)] pt-5'>
          <h2 className='mb-0 font-black'>Payment</h2>

          {refund.payment ? (
            <dl className='mt-4 space-y-4 text-sm'>
              <div>
                <dt className='text-[var(--color-muted)]'>Provider</dt>

                <dd className='mt-1 mb-0 font-semibold'>
                  {formatRefundLabel(refund.payment.provider)}
                </dd>
              </div>

              <div>
                <dt className='text-[var(--color-muted)]'>Status</dt>

                <dd className='mt-1 mb-0 font-semibold'>
                  {formatRefundLabel(refund.payment.status)}
                </dd>
              </div>

              <div>
                <dt className='text-[var(--color-muted)]'>Payment amount</dt>

                <dd className='mt-1 mb-0 font-semibold ds-tabular-nums'>
                  {formatRefundAmount(
                    refund.payment.amount,
                    refund.payment.currency,
                  )}
                </dd>
              </div>

              <div>
                <dt className='text-[var(--color-muted)]'>
                  Provider Payment ID
                </dt>

                <dd className='mt-1 mb-0 break-all text-xs'>
                  {refund.payment.providerPaymentId ?? 'Not available'}
                </dd>
              </div>

              <div>
                <dt className='text-[var(--color-muted)]'>Verified at</dt>

                <dd className='mt-1 mb-0'>
                  {refund.payment.verifiedAt
                    ? refundDateFormatter.format(
                        new Date(refund.payment.verifiedAt),
                      )
                    : 'Not available'}
                </dd>
              </div>
            </dl>
          ) : (
            <p className='mt-4 mb-0 text-sm text-[var(--color-muted)]'>
              Payment context is unavailable.
            </p>
          )}
        </section>
      </aside>
    </div>
  );
}
