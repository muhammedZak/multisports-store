import { useCallback, useEffect, useState } from 'react';

import { Link, useLocation, useParams } from 'react-router';

import { normalizeApiError } from '../../api/errors.js';
import { fetchMyRefund } from '../../api/refundApi.js';

import { formatInrFromPaise } from '../../utils/money.js';

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const REFUND_STATUS_PRESENTATION = {
  requested: {
    label: 'Requested',
    className: 'bg-blue-50 text-blue-700',
    description: 'Waiting for Admin review.',
  },
  approved: {
    label: 'Approved',
    className: 'bg-indigo-50 text-indigo-700',
    description: 'Approved and waiting for payment-provider processing.',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-50 text-red-700',
    description: 'This Refund request was not approved.',
  },
  processing: {
    label: 'Processing',
    className: 'bg-amber-50 text-amber-700',
    description: 'The payment provider is processing this Refund.',
  },
  refunded: {
    label: 'Refunded',
    className: 'bg-green-50 text-green-700',
    description: 'This Refund has been completed.',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-50 text-red-700',
    description: 'Refund processing failed and may need attention.',
  },
};

function formatLabel(value) {
  if (!value) {
    return 'Not available';
  }

  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatOptionName(name) {
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatAmount(amount, currency) {
  if (currency === 'INR') {
    return formatInrFromPaise(amount);
  }

  return `${amount} ${currency}`;
}

function RefundDetailsPage() {
  const { refundId } = useParams();
  const location = useLocation();

  const [refund, setRefund] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadRefund = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const item = await fetchMyRefund(refundId);

      setRefund(item);
    } catch (requestError) {
      setRefund(null);
      setError(
        normalizeApiError(
          requestError,
          'Unable to load this Refund. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [refundId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRefund();
  }, [loadRefund]);

  if (loading) {
    return (
      <main className='mx-auto max-w-5xl p-6'>
        <Link
          to='/account/refunds'
          className='text-sm font-medium underline underline-offset-4'>
          Back to Refunds
        </Link>

        <section className='mt-8 border border-neutral-200 p-8'>
          <p className='text-sm text-neutral-600'>Loading Refund details...</p>
        </section>
      </main>
    );
  }

  if (error?.code === 'REFUND_NOT_FOUND') {
    return (
      <main className='mx-auto max-w-3xl p-6'>
        <Link
          to='/account/refunds'
          className='text-sm font-medium underline underline-offset-4'>
          Back to Refunds
        </Link>

        <section className='mt-8 border border-neutral-200 p-8 text-center'>
          <h1 className='text-2xl font-semibold'>Refund not found</h1>

          <p className='mx-auto mt-3 max-w-lg text-sm leading-6 text-neutral-600'>
            This Refund does not exist or is not available in your account.
          </p>

          <Link
            to='/account/refunds'
            className='mt-5 inline-flex bg-black px-5 py-3 text-sm font-medium text-white'>
            View My Refunds
          </Link>
        </section>
      </main>
    );
  }

  if (error || !refund) {
    return (
      <main className='mx-auto max-w-3xl p-6'>
        <Link
          to='/account/refunds'
          className='text-sm font-medium underline underline-offset-4'>
          Back to Refunds
        </Link>

        <section className='mt-8 border border-red-200 bg-red-50 p-6'>
          <p role='alert' className='text-sm text-red-700'>
            {error?.message ?? 'Unable to load this Refund.'}
          </p>

          <button
            type='button'
            onClick={loadRefund}
            className='mt-4 bg-black px-4 py-2 text-sm font-medium text-white'>
            Try again
          </button>
        </section>
      </main>
    );
  }

  const statusPresentation = REFUND_STATUS_PRESENTATION[refund.status] ?? {
    label: formatLabel(refund.status),
    className: 'bg-neutral-100 text-neutral-700',
    description: 'Current Refund status is available above.',
  };

  return (
    <main className='mx-auto max-w-5xl p-6'>
      <Link
        to='/account/refunds'
        className='text-sm font-medium underline underline-offset-4'>
        Back to Refunds
      </Link>

      {location.state?.successMessage && (
        <div
          role='status'
          className='mt-6 border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700'>
          {location.state.successMessage}
        </div>
      )}

      <div className='mt-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <p className='text-sm font-medium uppercase tracking-[0.2em] text-neutral-500'>
            Refund details
          </p>

          <h1 className='mt-3 break-all text-2xl font-semibold sm:text-3xl'>
            Refund {refund.id}
          </h1>

          <p className='mt-2 text-sm text-neutral-600'>
            Requested {dateFormatter.format(new Date(refund.requestedAt))}
          </p>
        </div>

        <span
          className={`inline-flex w-fit px-3 py-1.5 text-sm font-medium ${statusPresentation.className}`}>
          {statusPresentation.label}
        </span>
      </div>

      <section className='mt-6 border border-neutral-200 p-5 sm:p-6'>
        <h2 className='font-semibold'>Current status</h2>

        <p className='mt-2 text-sm leading-6 text-neutral-700'>
          {statusPresentation.description}
        </p>

        {refund.status === 'rejected' && refund.adminDecisionNote && (
          <p className='mt-3 border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700'>
            Admin note: {refund.adminDecisionNote}
          </p>
        )}

        {refund.status === 'refunded' && refund.refundedAt && (
          <p className='mt-3 text-sm text-neutral-600'>
            Completed {dateFormatter.format(new Date(refund.refundedAt))}
          </p>
        )}
      </section>

      <div className='mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start'>
        <div className='space-y-8'>
          <section className='border border-neutral-200 p-5 sm:p-6'>
            <h2 className='text-xl font-semibold'>Request</h2>

            <dl className='mt-5 grid gap-5 text-sm sm:grid-cols-2'>
              <div>
                <dt className='text-neutral-500'>Origin</dt>
                <dd className='mt-1 font-medium'>
                  {formatLabel(refund.origin)}
                </dd>
              </div>

              <div>
                <dt className='text-neutral-500'>Scope</dt>
                <dd className='mt-1 font-medium'>
                  {refund.scope === 'order'
                    ? 'Whole Order'
                    : refund.scope === 'items'
                      ? `${refund.orderItemIds?.length ?? 0} complete item line${(refund.orderItemIds?.length ?? 0) === 1 ? '' : 's'}`
                      : 'Not tied to Order items'}
                </dd>
              </div>

              <div className='sm:col-span-2'>
                <dt className='text-neutral-500'>Reason</dt>
                <dd className='mt-1 whitespace-pre-wrap font-medium'>
                  {refund.reason}
                </dd>
              </div>

              <div className='sm:col-span-2'>
                <dt className='text-neutral-500'>Explanation</dt>
                <dd className='mt-1 whitespace-pre-wrap text-neutral-700'>
                  {refund.explanation || 'No additional explanation provided.'}
                </dd>
              </div>

              {refund.adminDecisionNote && (
                <div className='sm:col-span-2'>
                  <dt className='text-neutral-500'>Admin decision note</dt>
                  <dd className='mt-1 whitespace-pre-wrap text-neutral-700'>
                    {refund.adminDecisionNote}
                  </dd>
                </div>
              )}

              {refund.reviewedAt && (
                <div>
                  <dt className='text-neutral-500'>Reviewed</dt>
                  <dd className='mt-1 font-medium'>
                    {dateFormatter.format(new Date(refund.reviewedAt))}
                  </dd>
                </div>
              )}

              {refund.refundedAt && (
                <div>
                  <dt className='text-neutral-500'>Refunded</dt>
                  <dd className='mt-1 font-medium'>
                    {dateFormatter.format(new Date(refund.refundedAt))}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          <section className='border border-neutral-200 p-5 sm:p-6'>
            <h2 className='text-xl font-semibold'>Affected items</h2>

            {refund.affectedItems.length > 0 ? (
              <div className='mt-4 divide-y divide-neutral-200'>
                {refund.affectedItems.map((item) => {
                  const options = Object.entries(item.variant?.options ?? {});

                  return (
                    <article
                      key={item.id}
                      className='flex flex-col gap-4 py-5 first:pt-0 last:pb-0 sm:flex-row sm:justify-between'>
                      <div>
                        <p className='font-semibold'>{item.product.name}</p>
                        <p className='mt-1 text-sm text-neutral-500'>
                          {item.product.brand}
                        </p>

                        {options.length > 0 && (
                          <div className='mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600'>
                            {options.map(([name, value]) => (
                              <span key={name}>
                                {formatOptionName(name)}: {String(value)}
                              </span>
                            ))}
                          </div>
                        )}

                        <p className='mt-2 text-sm text-neutral-600'>
                          Historical quantity: {item.quantity}
                        </p>
                      </div>

                      <div className='sm:text-right'>
                        <p className='font-semibold'>
                          {formatInrFromPaise(item.pricing.lineTotal)}
                        </p>
                        <p className='mt-1 text-xs text-neutral-500'>
                          Historical line price
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className='mt-4 text-sm leading-6 text-neutral-600'>
                No Order item snapshots apply to this Refund.
              </p>
            )}
          </section>

          <section className='border border-neutral-200 p-5 sm:p-6'>
            <h2 className='text-xl font-semibold'>Payment</h2>

            {refund.payment ? (
              <dl className='mt-5 grid gap-5 text-sm sm:grid-cols-2'>
                <div>
                  <dt className='text-neutral-500'>Status</dt>
                  <dd className='mt-1 font-medium'>
                    {formatLabel(refund.payment.status)}
                  </dd>
                </div>

                <div>
                  <dt className='text-neutral-500'>Amount</dt>
                  <dd className='mt-1 font-medium'>
                    {formatAmount(
                      refund.payment.amount,
                      refund.payment.currency,
                    )}
                  </dd>
                </div>

                <div className='sm:col-span-2'>
                  <dt className='text-neutral-500'>Payment reference</dt>
                  <dd className='mt-1 break-all font-medium'>
                    {refund.payment.id}
                  </dd>
                </div>

                <div className='sm:col-span-2'>
                  <dt className='text-neutral-500'>Verified</dt>
                  <dd className='mt-1 font-medium'>
                    {refund.payment.verifiedAt
                      ? dateFormatter.format(
                          new Date(refund.payment.verifiedAt),
                        )
                      : 'Not available'}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className='mt-4 text-sm text-neutral-600'>
                Payment context is unavailable.
              </p>
            )}
          </section>
        </div>

        <aside className='border border-neutral-200 p-5 sm:p-6 lg:sticky lg:top-6'>
          <p className='text-sm text-neutral-500'>Refund amount</p>

          <p className='mt-2 text-2xl font-semibold'>
            {formatAmount(refund.amount, refund.currency)}
          </p>

          <p className='mt-1 text-xs text-neutral-500'>{refund.currency}</p>

          <div className='mt-6 border-t border-neutral-200 pt-6'>
            <h2 className='font-semibold'>Order context</h2>

            {refund.order ? (
              <div className='mt-3 text-sm'>
                <p className='break-all font-medium'>
                  {refund.order.orderNumber}
                </p>
                <p className='mt-2 text-neutral-600'>
                  {formatLabel(refund.order.orderStatus)}
                </p>
                <p className='mt-2 text-neutral-600'>
                  Placed{' '}
                  {dateFormatter.format(new Date(refund.order.placedAt))}
                </p>
                <p className='mt-2 font-medium'>
                  Order total:{' '}
                  {formatInrFromPaise(refund.order.pricing.totalAmount)}
                </p>

                <Link
                  to={`/account/orders/${refund.order.id}`}
                  className='mt-4 inline-block font-medium underline underline-offset-4'>
                  View Order details
                </Link>
              </div>
            ) : (
              <p className='mt-3 text-sm leading-6 text-neutral-600'>
                This Refund is not linked to an Order, which can occur for
                system compensation.
              </p>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}

export default RefundDetailsPage;
