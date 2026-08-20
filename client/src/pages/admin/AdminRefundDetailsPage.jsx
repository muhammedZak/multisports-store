import { useCallback, useEffect, useState } from 'react';

import { Link, useParams } from 'react-router';

import { normalizeApiError } from '../../api/errors.js';
import { decideAdminRefund, fetchAdminRefund } from '../../api/refundApi.js';

import { formatInrFromPaise } from '../../utils/money.js';

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const REFUND_STATUS_CLASSES = {
  requested: 'bg-blue-100 text-blue-700',
  approved: 'bg-indigo-100 text-indigo-700',
  rejected: 'bg-red-100 text-red-700',
  processing: 'bg-amber-100 text-amber-700',
  refunded: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

function formatLabel(value) {
  if (!value) {
    return 'Unavailable';
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

function formatDate(value) {
  return value ? dateFormatter.format(new Date(value)) : 'Not available';
}

function formatAmount(amount, currency) {
  return currency === 'INR'
    ? formatInrFromPaise(amount)
    : `${amount} ${currency}`;
}

function formatRestockDecision(value) {
  if (value === true) {
    return 'Yes';
  }

  if (value === false) {
    return 'No';
  }

  return 'Not decided';
}

function getScopeSummary(refund) {
  if (refund.scope === 'order') {
    return 'Whole Order';
  }

  if (refund.scope === 'items') {
    const lineCount = refund.orderItemIds?.length ?? 0;

    return `${lineCount} complete item line${lineCount === 1 ? '' : 's'}`;
  }

  return 'No Order scope';
}

function getApprovalResultMessage(status) {
  if (status === 'processing') {
    return 'Refund approved. Razorpay processing is pending.';
  }

  if (status === 'refunded') {
    return 'Refund approved and completed by Razorpay.';
  }

  if (status === 'failed') {
    return 'Refund approved, but Razorpay reported a terminal failure.';
  }

  return 'The business approval is saved. Provider processing is unconfirmed.';
}

function AdminRefundDetailsPage() {
  const { refundId } = useParams();

  const [refund, setRefund] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [approveNote, setApproveNote] = useState('');
  const [approveRestock, setApproveRestock] = useState('');
  const [rejectNote, setRejectNote] = useState('');
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [decisionError, setDecisionError] = useState(null);
  const [message, setMessage] = useState('');

  const loadRefund = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const item = await fetchAdminRefund(refundId);

      setRefund(item);
    } catch (requestError) {
      setRefund(null);
      setError(normalizeApiError(requestError, 'Unable to load this Refund.'));
    } finally {
      setLoading(false);
    }
  }, [refundId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRefund();
  }, [loadRefund]);

  async function refreshAfterStaleDecision(normalizedError) {
    try {
      const authoritativeRefund = await fetchAdminRefund(refund.id);

      setRefund(authoritativeRefund);
      setDecisionError({
        ...normalizedError,
        message:
          'This Refund was decided elsewhere. The authoritative status has been reloaded.',
      });
    } catch (refreshError) {
      setDecisionError(
        normalizeApiError(
          refreshError,
          'The Refund changed, but its current state could not be reloaded.',
        ),
      );
    }
  }

  async function refreshAfterProviderUncertainty(normalizedError) {
    try {
      const authoritativeRefund = await fetchAdminRefund(refund.id);

      setRefund(authoritativeRefund);

      if (authoritativeRefund.status === 'approved') {
        setDecisionError({
          ...normalizedError,
          message:
            'The business approval is saved, but provider processing is unconfirmed. Retry Provider Processing when ready.',
        });
      } else {
        setMessage(getApprovalResultMessage(authoritativeRefund.status));
      }
    } catch (refreshError) {
      setDecisionError(
        normalizeApiError(
          refreshError,
          'Provider processing is unconfirmed, and the authoritative Refund state could not be reloaded.',
        ),
      );
    }
  }

  async function submitDecision(payload, successMessage) {
    if (!refund || decisionLoading) {
      return;
    }

    setDecisionLoading(true);
    setDecisionError(null);
    setMessage('');

    try {
      const updatedRefund = await decideAdminRefund(refund.id, payload);

      setRefund(updatedRefund);
      setApproveNote('');
      setApproveRestock('');
      setRejectNote('');
      setMessage(
        typeof successMessage === 'function'
          ? successMessage(updatedRefund)
          : successMessage,
      );
    } catch (requestError) {
      const normalizedError = normalizeApiError(
        requestError,
        'Unable to record this Refund decision.',
      );

      if (normalizedError.code === 'REFUND_ALREADY_PROCESSED') {
        await refreshAfterStaleDecision(normalizedError);
      } else if (
        normalizedError.code === 'EXTERNAL_SERVICE_ERROR' &&
        payload.decision === 'approve'
      ) {
        await refreshAfterProviderUncertainty(normalizedError);
      } else {
        setDecisionError(normalizedError);
      }
    } finally {
      setDecisionLoading(false);
    }
  }

  async function handleApprove(event) {
    event.preventDefault();

    if (approveRestock !== 'yes' && approveRestock !== 'no') {
      setDecisionError({
        code: 'VALIDATION_ERROR',
        message: 'Choose whether Inventory should be restocked on completion.',
      });
      return;
    }

    const confirmed = window.confirm(
      'Approve this Refund request with the selected restock decision?',
    );

    if (!confirmed) {
      return;
    }

    const normalizedNote = approveNote.trim();

    await submitDecision(
      {
        decision: 'approve',
        restockOnCompletion: approveRestock === 'yes',
        ...(normalizedNote ? { adminDecisionNote: normalizedNote } : {}),
      },
      (updatedRefund) => getApprovalResultMessage(updatedRefund.status),
    );
  }

  async function handleRetryProviderProcessing() {
    const confirmed = window.confirm(
      'Retry reconciliation for this already-approved Refund?',
    );

    if (!confirmed) {
      return;
    }

    await submitDecision(
      {
        decision: 'approve',
        restockOnCompletion: refund.restockOnCompletion,
        ...(refund.adminDecisionNote
          ? { adminDecisionNote: refund.adminDecisionNote }
          : {}),
      },
      (updatedRefund) => getApprovalResultMessage(updatedRefund.status),
    );
  }

  async function handleReject(event) {
    event.preventDefault();

    const normalizedNote = rejectNote.trim();

    if (!normalizedNote) {
      setDecisionError({
        code: 'VALIDATION_ERROR',
        message: 'Enter a meaningful rejection note.',
      });
      return;
    }

    const confirmed = window.confirm(
      'Reject this Refund request and release its claimed scope?',
    );

    if (!confirmed) {
      return;
    }

    await submitDecision(
      {
        decision: 'reject',
        adminDecisionNote: normalizedNote,
      },
      'Refund request rejected and its scope released.',
    );
  }

  if (loading) {
    return (
      <main className='p-5 sm:p-6'>
        <p className='text-sm text-neutral-600'>Loading Refund details...</p>
      </main>
    );
  }

  if (error && !refund) {
    return (
      <main className='p-5 sm:p-6'>
        <div
          role='alert'
          className='border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          {error.code === 'REFUND_NOT_FOUND'
            ? 'Refund not found.'
            : error.message}
        </div>

        <div className='mt-5 flex flex-wrap gap-3'>
          {error.code !== 'REFUND_NOT_FOUND' && (
            <button
              type='button'
              onClick={loadRefund}
              className='bg-black px-4 py-2 text-sm font-medium text-white'>
              Try again
            </button>
          )}
          <Link
            to='/admin/refunds'
            className='px-4 py-2 text-sm font-medium underline underline-offset-4'>
            Back to Refunds
          </Link>
        </div>
      </main>
    );
  }

  const canDecide =
    refund.status === 'requested' && refund.origin === 'customer_request';
  const canRetryProvider =
    refund.status === 'approved' && refund.origin === 'customer_request';
  const affectedItems = refund.affectedItems ?? [];

  return (
    <main className='p-5 sm:p-6'>
      <Link
        to='/admin/refunds'
        className='text-sm font-medium underline underline-offset-4'>
        Back to Refunds
      </Link>

      <div className='mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <p className='text-sm font-medium uppercase tracking-[0.2em] text-neutral-500'>
            Refund management
          </p>
          <h1 className='mt-3 text-2xl font-semibold sm:text-3xl'>
            Refund details
          </h1>
          <p className='mt-2 break-all text-xs text-neutral-500'>
            Refund ID: {refund.id}
          </p>
          <p className='mt-2 text-sm text-neutral-500'>
            Requested {formatDate(refund.requestedAt)}
          </p>
        </div>
        <span
          className={`inline-flex w-fit px-3 py-1.5 text-sm font-medium ${REFUND_STATUS_CLASSES[refund.status] ?? 'bg-neutral-100 text-neutral-700'}`}>
          {formatLabel(refund.status)}
        </span>
      </div>

      {message && (
        <div
          role='status'
          className='mt-6 border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700'>
          {message}
        </div>
      )}

      {decisionError && (
        <div
          role='alert'
          className='mt-6 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800'>
          {decisionError.message}
        </div>
      )}

      <div className='mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start'>
        <div className='space-y-6'>
          <section className='border border-neutral-200 p-5'>
            <h2 className='text-lg font-semibold'>Refund request</h2>
            <dl className='mt-5 grid gap-5 text-sm sm:grid-cols-2'>
              <div>
                <dt className='text-neutral-500'>Origin</dt>
                <dd className='mt-1 font-medium'>
                  {formatLabel(refund.origin)}
                </dd>
              </div>
              <div>
                <dt className='text-neutral-500'>Scope</dt>
                <dd className='mt-1 font-medium'>{getScopeSummary(refund)}</dd>
              </div>
              <div>
                <dt className='text-neutral-500'>Refund amount</dt>
                <dd className='mt-1 font-semibold'>
                  {formatAmount(refund.amount, refund.currency)}
                </dd>
              </div>
              <div>
                <dt className='text-neutral-500'>Restock on completion</dt>
                <dd className='mt-1 font-medium'>
                  {formatRestockDecision(refund.restockOnCompletion)}
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
              <div className='sm:col-span-2'>
                <dt className='text-neutral-500'>Admin decision note</dt>
                <dd className='mt-1 whitespace-pre-wrap text-neutral-700'>
                  {refund.adminDecisionNote || 'No Admin decision note.'}
                </dd>
              </div>
            </dl>
          </section>

          <section className='border border-neutral-200 p-5'>
            <h2 className='text-lg font-semibold'>Affected items</h2>
            {affectedItems.length > 0 ? (
              <div className='mt-4 divide-y divide-neutral-200'>
                {affectedItems.map((item) => {
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
              <p className='mt-4 text-sm text-neutral-600'>
                No immutable Order item snapshots apply to this Refund.
              </p>
            )}
          </section>

          <section className='border border-neutral-200 p-5'>
            <h2 className='text-lg font-semibold'>Decision history</h2>
            <dl className='mt-5 grid gap-5 text-sm sm:grid-cols-2'>
              <div>
                <dt className='text-neutral-500'>Reviewed by</dt>
                <dd className='mt-1'>
                  {refund.reviewedBy
                    ? `${refund.reviewedBy.name} (${refund.reviewedBy.email})`
                    : 'Not reviewed'}
                </dd>
              </div>
              <div>
                <dt className='text-neutral-500'>Reviewed at</dt>
                <dd className='mt-1'>{formatDate(refund.reviewedAt)}</dd>
              </div>
              <div>
                <dt className='text-neutral-500'>Refunded at</dt>
                <dd className='mt-1'>{formatDate(refund.refundedAt)}</dd>
              </div>
              <div>
                <dt className='text-neutral-500'>Last updated</dt>
                <dd className='mt-1'>{formatDate(refund.updatedAt)}</dd>
              </div>
              <div className='sm:col-span-2'>
                <dt className='text-neutral-500'>Provider Refund ID</dt>
                <dd className='mt-1 break-all font-medium'>
                  {refund.providerRefundId ?? 'Not assigned'}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <aside className='space-y-6 xl:sticky xl:top-6'>
          <section className='border border-neutral-200 p-5'>
            <h2 className='text-lg font-semibold'>Customer</h2>
            {refund.customer ? (
              <dl className='mt-5 space-y-4 text-sm'>
                <div>
                  <dt className='text-neutral-500'>Name</dt>
                  <dd className='mt-1 font-medium'>{refund.customer.name}</dd>
                </div>
                <div>
                  <dt className='text-neutral-500'>Email</dt>
                  <dd className='mt-1 break-all'>{refund.customer.email}</dd>
                </div>
                <div>
                  <dt className='text-neutral-500'>Customer ID</dt>
                  <dd className='mt-1 break-all text-xs'>
                    {refund.customer.id}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className='mt-4 text-sm text-neutral-600'>
                Customer information is unavailable.
              </p>
            )}
          </section>

          <section className='border border-neutral-200 p-5'>
            <h2 className='text-lg font-semibold'>Order</h2>
            {refund.order ? (
              <div className='mt-4 text-sm'>
                <p className='font-semibold'>{refund.order.orderNumber}</p>
                <p className='mt-2 text-neutral-600'>
                  Status: {formatLabel(refund.order.orderStatus)}
                </p>
                <p className='mt-2 text-neutral-600'>
                  Placed: {formatDate(refund.order.placedAt)}
                </p>
                <dl className='mt-4 space-y-2 border-t border-neutral-200 pt-4'>
                  <div className='flex justify-between gap-4'>
                    <dt>Subtotal</dt>
                    <dd>{formatInrFromPaise(refund.order.pricing.subtotal)}</dd>
                  </div>
                  <div className='flex justify-between gap-4'>
                    <dt>Discount</dt>
                    <dd>
                      {formatInrFromPaise(refund.order.pricing.discountAmount)}
                    </dd>
                  </div>
                  <div className='flex justify-between gap-4 font-semibold'>
                    <dt>Total</dt>
                    <dd>
                      {formatInrFromPaise(refund.order.pricing.totalAmount)}
                    </dd>
                  </div>
                </dl>
                <Link
                  to={`/admin/orders/${refund.order.id}`}
                  className='mt-4 inline-block font-medium underline underline-offset-4'>
                  View Order
                </Link>
              </div>
            ) : (
              <p className='mt-4 text-sm leading-6 text-neutral-600'>
                No Order is linked. This is valid for system compensation.
              </p>
            )}
          </section>

          <section className='border border-neutral-200 p-5'>
            <h2 className='text-lg font-semibold'>Payment</h2>
            {refund.payment ? (
              <dl className='mt-5 space-y-4 text-sm'>
                <div>
                  <dt className='text-neutral-500'>Provider</dt>
                  <dd className='mt-1 font-medium'>
                    {formatLabel(refund.payment.provider)}
                  </dd>
                </div>
                <div>
                  <dt className='text-neutral-500'>Status</dt>
                  <dd className='mt-1 font-medium'>
                    {formatLabel(refund.payment.status)}
                  </dd>
                </div>
                <div>
                  <dt className='text-neutral-500'>Payment amount</dt>
                  <dd className='mt-1 font-medium'>
                    {formatAmount(
                      refund.payment.amount,
                      refund.payment.currency,
                    )}
                  </dd>
                </div>
                <div>
                  <dt className='text-neutral-500'>Provider Payment ID</dt>
                  <dd className='mt-1 break-all text-xs'>
                    {refund.payment.providerPaymentId ?? 'Not available'}
                  </dd>
                </div>
                <div>
                  <dt className='text-neutral-500'>Verified at</dt>
                  <dd className='mt-1'>
                    {formatDate(refund.payment.verifiedAt)}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className='mt-4 text-sm text-neutral-600'>
                Payment context is unavailable.
              </p>
            )}
          </section>
        </aside>
      </div>

      <section className='mt-6 border border-neutral-200 p-5 sm:p-6'>
        <h2 className='text-lg font-semibold'>Admin decision</h2>

        {canDecide ? (
          <div className='mt-5 grid gap-6 xl:grid-cols-2'>
            <form
              onSubmit={handleApprove}
              className='border border-green-200 bg-green-50 p-5'>
              <h3 className='font-semibold text-green-900'>Approve request</h3>
              <p className='mt-2 text-sm leading-6 text-green-800'>
                Approval is saved before Razorpay Refund processing starts.
                Inventory is not restored in this step.
              </p>

              <fieldset className='mt-5'>
                <legend className='text-sm font-medium text-green-900'>
                  Restock on Refund completion
                </legend>
                <div className='mt-3 flex flex-col gap-3 sm:flex-row'>
                  <label className='flex items-center gap-2 text-sm'>
                    <input
                      type='radio'
                      name='approve-restock'
                      value='yes'
                      checked={approveRestock === 'yes'}
                      disabled={decisionLoading}
                      onChange={(event) => {
                        setApproveRestock(event.target.value);
                        setDecisionError(null);
                        setMessage('');
                      }}
                    />
                    Yes
                  </label>
                  <label className='flex items-center gap-2 text-sm'>
                    <input
                      type='radio'
                      name='approve-restock'
                      value='no'
                      checked={approveRestock === 'no'}
                      disabled={decisionLoading}
                      onChange={(event) => {
                        setApproveRestock(event.target.value);
                        setDecisionError(null);
                        setMessage('');
                      }}
                    />
                    No
                  </label>
                </div>
              </fieldset>

              <label
                htmlFor='approve-note'
                className='mt-5 block text-sm font-medium text-green-900'>
                Admin note (optional)
              </label>
              <textarea
                id='approve-note'
                rows={4}
                value={approveNote}
                disabled={decisionLoading}
                onChange={(event) => {
                  setApproveNote(event.target.value);
                  setDecisionError(null);
                  setMessage('');
                }}
                className='mt-2 w-full border border-green-300 bg-white px-3 py-2.5 outline-none focus:border-green-700'
              />

              <button
                type='submit'
                disabled={decisionLoading || !approveRestock}
                className='mt-4 inline-flex w-full items-center justify-center bg-black px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-neutral-400 disabled:text-white'>
                {decisionLoading ? 'Recording decision...' : 'Approve Refund'}
              </button>
            </form>

            <form
              onSubmit={handleReject}
              className='border border-red-200 bg-red-50 p-5'>
              <h3 className='font-semibold text-red-900'>Reject request</h3>
              <p className='mt-2 text-sm leading-6 text-red-800'>
                Rejection releases the claimed Refund scope so the Customer can
                submit a new request for it.
              </p>

              <label
                htmlFor='reject-note'
                className='mt-5 block text-sm font-medium text-red-900'>
                Rejection note
              </label>
              <textarea
                id='reject-note'
                rows={5}
                required
                value={rejectNote}
                disabled={decisionLoading}
                onChange={(event) => {
                  setRejectNote(event.target.value);
                  setDecisionError(null);
                  setMessage('');
                }}
                placeholder='Explain why this Refund request is rejected.'
                className='mt-2 w-full border border-red-300 bg-white px-3 py-2.5 outline-none focus:border-red-700'
              />

              <button
                type='submit'
                disabled={decisionLoading || !rejectNote.trim()}
                className='mt-4 inline-flex w-full items-center justify-center border-red-400 bg-white px-5 py-2.5 text-sm font-medium text-red-800 disabled:cursor-not-allowed disabled:bg-neutral-400 disabled:text-white'>
                {decisionLoading ? 'Recording decision...' : 'Reject Refund'}
              </button>
            </form>
          </div>
        ) : canRetryProvider ? (
          <div className='mt-5 border border-indigo-200 bg-indigo-50 p-5'>
            <h3 className='font-semibold text-indigo-900'>
              Provider processing unconfirmed
            </h3>
            <p className='mt-2 text-sm leading-6 text-indigo-800'>
              The business approval and original restock decision are already
              saved. This action reconciles the same Razorpay Refund operation
              and cannot change the approval details.
            </p>
            <button
              type='button'
              disabled={decisionLoading}
              onClick={handleRetryProviderProcessing}
              className='mt-4 inline-flex items-center justify-center bg-black px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-neutral-400'>
              {decisionLoading
                ? 'Reconciling provider Refund...'
                : 'Retry Provider Processing'}
            </button>
          </div>
        ) : (
          <p className='mt-4 text-sm leading-6 text-neutral-600'>
            {refund.status === 'processing' &&
              'Razorpay is processing this Refund. No duplicate initiation action is available.'}
            {refund.status === 'refunded' &&
              'This Refund completed successfully and is read-only.'}
            {refund.status === 'failed' &&
              'Razorpay reported a terminal Refund failure. This Refund is read-only.'}
            {!['processing', 'refunded', 'failed'].includes(refund.status) &&
              'This Refund is read-only. Only requested Customer Refunds await an Admin approve or reject decision.'}
          </p>
        )}
      </section>
    </main>
  );
}

export default AdminRefundDetailsPage;
