import { Link } from 'react-router';

import { Alert } from '../../../components/ui/Alert.jsx';

import { formatInrFromPaise } from '../../../utils/money.js';

import {
  formatRefundAmount,
  formatRefundLabel,
  formatRefundOptionName,
  getRefundScopeSummary,
  getRefundStatusPresentation,
  refundDateFormatter,
} from '../refund.utils.js';

function RefundRequestDetails({ refund }) {
  return (
    <section className='border-t border-[var(--color-border)] pt-6'>
      <p className='mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]'>
        Request
      </p>

      <h2 className='mb-0 text-xl font-black tracking-[-0.025em]'>
        Refund request
      </h2>

      <dl className='mt-5 grid gap-x-8 gap-y-5 border-y border-[var(--color-border)] py-5 text-sm sm:grid-cols-2'>
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

        {refund.adminDecisionNote ? (
          <div className='sm:col-span-2'>
            <dt className='text-[var(--color-muted)]'>Admin decision note</dt>

            <dd className='mt-1 mb-0 whitespace-pre-wrap text-[var(--color-ink-soft)]'>
              {refund.adminDecisionNote}
            </dd>
          </div>
        ) : null}

        {refund.reviewedAt ? (
          <div>
            <dt className='text-[var(--color-muted)]'>Reviewed</dt>

            <dd className='mt-1 mb-0 font-semibold'>
              {refundDateFormatter.format(new Date(refund.reviewedAt))}
            </dd>
          </div>
        ) : null}

        {refund.refundedAt ? (
          <div>
            <dt className='text-[var(--color-muted)]'>Refunded</dt>

            <dd className='mt-1 mb-0 font-semibold'>
              {refundDateFormatter.format(new Date(refund.refundedAt))}
            </dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}

function AffectedItems({ items }) {
  return (
    <section className='border-t border-[var(--color-border)] pt-6'>
      <p className='mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]'>
        Order snapshots
      </p>

      <h2 className='mb-0 text-xl font-black tracking-[-0.025em]'>
        Affected items
      </h2>

      {items.length === 0 ? (
        <p className='mt-4 mb-0 text-sm leading-6 text-[var(--color-muted)]'>
          No Order item snapshots apply to this Refund.
        </p>
      ) : (
        <div className='mt-5 border-y border-[var(--color-border)]'>
          {items.map((item) => {
            const options = Object.entries(item.variant?.options ?? {});

            return (
              <article
                key={item.id}
                className='border-b border-[var(--color-border)] py-5 last:border-b-0'>
                <div className='flex flex-col gap-4 sm:flex-row sm:justify-between'>
                  <div>
                    <p className='mb-0 font-bold'>{item.product.name}</p>

                    <p className='mt-1 mb-0 text-sm text-[var(--color-muted)]'>
                      {item.product.brand}
                    </p>

                    {options.length > 0 ? (
                      <dl className='mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs'>
                        {options.map(([name, value]) => (
                          <div key={name} className='flex gap-1'>
                            <dt className='text-[var(--color-muted)]'>
                              {formatRefundOptionName(name)}
                            </dt>

                            <dd className='m-0 font-semibold'>
                              {String(value)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}

                    <p className='mt-2 mb-0 text-sm text-[var(--color-muted)]'>
                      Historical quantity: {item.quantity}
                    </p>
                  </div>

                  <div className='sm:text-right'>
                    <p className='mb-0 font-bold ds-tabular-nums'>
                      {formatInrFromPaise(item.pricing.lineTotal)}
                    </p>

                    <p className='mt-1 mb-0 text-xs text-[var(--color-muted)]'>
                      Historical line price
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function RefundPayment({ payment }) {
  return (
    <section className='border-t border-[var(--color-border)] pt-6'>
      <p className='mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]'>
        Payment
      </p>

      <h2 className='mb-0 text-xl font-black tracking-[-0.025em]'>
        Payment context
      </h2>

      {!payment ? (
        <p className='mt-4 mb-0 text-sm text-[var(--color-muted)]'>
          Payment context is unavailable.
        </p>
      ) : (
        <dl className='mt-5 grid gap-x-8 gap-y-5 border-y border-[var(--color-border)] py-5 text-sm sm:grid-cols-2'>
          <div>
            <dt className='text-[var(--color-muted)]'>Status</dt>

            <dd className='mt-1 mb-0 font-semibold'>
              {formatRefundLabel(payment.status)}
            </dd>
          </div>

          <div>
            <dt className='text-[var(--color-muted)]'>Amount</dt>

            <dd className='mt-1 mb-0 font-semibold ds-tabular-nums'>
              {formatRefundAmount(payment.amount, payment.currency)}
            </dd>
          </div>

          <div className='sm:col-span-2'>
            <dt className='text-[var(--color-muted)]'>Payment reference</dt>

            <dd className='mt-1 mb-0 break-all font-semibold'>{payment.id}</dd>
          </div>

          <div className='sm:col-span-2'>
            <dt className='text-[var(--color-muted)]'>Verified</dt>

            <dd className='mt-1 mb-0 font-semibold'>
              {payment.verifiedAt
                ? refundDateFormatter.format(new Date(payment.verifiedAt))
                : 'Not available'}
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}

export function RefundDetailsView({ refund }) {
  const status = getRefundStatusPresentation(refund.status);

  return (
    <>
      <section className='mt-6 border-y border-[var(--color-border)] py-5'>
        <h2 className='mb-0 font-black'>Current status</h2>

        <p className='mt-2 mb-0 text-sm leading-6 text-[var(--color-muted)]'>
          {status.description}
        </p>

        {refund.status === 'rejected' && refund.adminDecisionNote ? (
          <Alert variant='danger' className='mt-4'>
            Admin note: {refund.adminDecisionNote}
          </Alert>
        ) : null}

        {refund.status === 'refunded' && refund.refundedAt ? (
          <p className='mt-3 mb-0 text-sm text-[var(--color-muted)]'>
            Completed {refundDateFormatter.format(new Date(refund.refundedAt))}
          </p>
        ) : null}
      </section>

      <div className='mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start xl:gap-16'>
        <div className='space-y-10'>
          <RefundRequestDetails refund={refund} />

          <AffectedItems items={refund.affectedItems ?? []} />

          <RefundPayment payment={refund.payment} />
        </div>

        <aside className='border-t border-[var(--color-ink)] pt-5 lg:sticky lg:top-24'>
          <p className='mb-1 text-sm text-[var(--color-muted)]'>
            Refund amount
          </p>

          <p className='mb-0 text-2xl font-black tracking-[-0.03em] ds-tabular-nums'>
            {formatRefundAmount(refund.amount, refund.currency)}
          </p>

          <p className='mt-1 mb-0 text-xs text-[var(--color-muted)]'>
            {refund.currency}
          </p>

          <section className='mt-7 border-t border-[var(--color-border)] pt-6'>
            <h2 className='mb-0 font-black'>Order context</h2>

            {refund.order ? (
              <div className='mt-3 text-sm'>
                <p className='mb-0 break-all font-bold'>
                  {refund.order.orderNumber}
                </p>

                <p className='mt-2 mb-0 text-[var(--color-muted)]'>
                  {formatRefundLabel(refund.order.orderStatus)}
                </p>

                <p className='mt-2 mb-0 text-[var(--color-muted)]'>
                  Placed{' '}
                  {refundDateFormatter.format(new Date(refund.order.placedAt))}
                </p>

                <p className='mt-2 mb-0 font-semibold'>
                  Order total:{' '}
                  {formatInrFromPaise(refund.order.pricing.totalAmount)}
                </p>

                <Link
                  to={`/account/orders/${refund.order.id}`}
                  className='mt-4 inline-flex font-semibold underline underline-offset-4'>
                  View Order details
                </Link>
              </div>
            ) : (
              <p className='mt-3 mb-0 text-sm leading-6 text-[var(--color-muted)]'>
                This Refund is not linked to an Order, which can occur for
                system compensation.
              </p>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
