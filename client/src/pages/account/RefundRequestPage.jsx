import { useCallback, useEffect, useState } from 'react';

import { Link, useNavigate, useParams } from 'react-router';

import { normalizeApiError } from '../../api/errors.js';
import { fetchMyOrder } from '../../api/orderApi.js';
import { createRefundRequest } from '../../api/refundApi.js';

import { formatInrFromPaise } from '../../utils/money.js';

function formatOptionName(name) {
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function RefundRequestPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [scope, setScope] = useState('order');
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [reason, setReason] = useState('');
  const [explanation, setExplanation] = useState('');
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const item = await fetchMyOrder(orderId);

      setOrder(item);
    } catch (requestError) {
      setOrder(null);
      setLoadError(
        normalizeApiError(
          requestError,
          'Unable to load this Order. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadOrder();
  }, [loadOrder]);

  function handleScopeChange(event) {
    const nextScope = event.target.value;

    setScope(nextScope);
    setFormError(null);

    if (nextScope === 'order') {
      setSelectedItemIds([]);
    }
  }

  function handleItemSelection(itemId) {
    setSelectedItemIds((current) =>
      current.includes(itemId)
        ? current.filter((selectedId) => selectedId !== itemId)
        : [...current, itemId],
    );
    setFormError(null);
  }

  function handleReloadOrderData() {
    setSelectedItemIds([]);
    setFormError(null);
    loadOrder();
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitting || !order) {
      return;
    }

    const normalizedReason = reason.trim();
    const normalizedExplanation = explanation.trim();

    if (!normalizedReason) {
      setFormError({
        code: 'VALIDATION_ERROR',
        message: 'Enter a reason for your Refund request.',
      });

      return;
    }

    if (scope === 'items' && selectedItemIds.length === 0) {
      setFormError({
        code: 'REFUND_SCOPE_INVALID',
        message: 'Select at least one complete Order item line.',
      });

      return;
    }

    const payload = {
      scope,
      ...(scope === 'items'
        ? {
            orderItemIds: selectedItemIds,
          }
        : {}),
      reason: normalizedReason,
      ...(normalizedExplanation
        ? {
            explanation: normalizedExplanation,
          }
        : {}),
    };

    setSubmitting(true);
    setFormError(null);

    try {
      const refund = await createRefundRequest(order.id, payload);

      navigate(`/account/refunds/${refund.id}`, {
        state: {
          successMessage: 'Refund request submitted successfully.',
        },
      });
    } catch (requestError) {
      setFormError(
        normalizeApiError(
          requestError,
          'Unable to submit your Refund request. Please try again.',
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className='mx-auto max-w-5xl p-6'>
        <Link
          to={`/account/orders/${orderId}`}
          className='text-sm font-medium underline underline-offset-4'>
          Back to Order details
        </Link>

        <section className='mt-8 border border-neutral-200 p-8'>
          <p className='text-sm text-neutral-600'>Loading Order details...</p>
        </section>
      </main>
    );
  }

  if (loadError?.code === 'ORDER_NOT_FOUND') {
    return (
      <main className='mx-auto max-w-3xl p-6'>
        <Link
          to='/account/orders'
          className='text-sm font-medium underline underline-offset-4'>
          Back to Orders
        </Link>

        <section className='mt-8 border border-neutral-200 p-8 text-center'>
          <h1 className='text-2xl font-semibold'>Order not found</h1>

          <p className='mx-auto mt-3 max-w-lg text-sm leading-6 text-neutral-600'>
            This Order does not exist or is not available in your account.
          </p>

          <Link
            to='/account/orders'
            className='mt-5 inline-flex bg-black px-5 py-3 text-sm font-medium text-white'>
            View my Orders
          </Link>
        </section>
      </main>
    );
  }

  if (loadError || !order) {
    return (
      <main className='mx-auto max-w-3xl p-6'>
        <Link
          to='/account/orders'
          className='text-sm font-medium underline underline-offset-4'>
          Back to Orders
        </Link>

        <section className='mt-8 border border-red-200 bg-red-50 p-6'>
          <p role='alert' className='text-sm text-red-700'>
            {loadError?.message ?? 'Unable to load this Order.'}
          </p>

          <button
            type='button'
            onClick={loadOrder}
            className='mt-4 bg-black px-4 py-2 text-sm font-medium text-white'>
            Try again
          </button>
        </section>
      </main>
    );
  }

  const refundEligible =
    order.orderStatus === 'delivered' &&
    order.payment?.status === 'succeeded';

  if (!refundEligible) {
    return (
      <main className='mx-auto max-w-3xl p-6'>
        <Link
          to={`/account/orders/${order.id}`}
          className='text-sm font-medium underline underline-offset-4'>
          Back to Order details
        </Link>

        <section className='mt-8 border border-amber-200 bg-amber-50 p-8 text-center'>
          <h1 className='text-2xl font-semibold'>Refund not available yet</h1>

          <p className='mx-auto mt-3 max-w-lg text-sm leading-6 text-neutral-700'>
            Customer Refund requests are available only after the Order is
            delivered and its Payment is successfully verified.
          </p>

          <Link
            to={`/account/orders/${order.id}`}
            className='mt-5 inline-flex bg-black px-5 py-3 text-sm font-medium text-white'>
            Return to Order details
          </Link>
        </section>
      </main>
    );
  }

  const scopeConflict = formError?.code === 'REFUND_SCOPE_CONFLICT';
  const itemNotFound = formError?.code === 'REFUND_ITEM_NOT_FOUND';
  const scopeInvalid = formError?.code === 'REFUND_SCOPE_INVALID';
  const refundNotEligible = formError?.code === 'REFUND_NOT_ELIGIBLE';
  const submissionOrderNotFound = formError?.code === 'ORDER_NOT_FOUND';

  return (
    <main className='mx-auto max-w-5xl p-6'>
      <Link
        to={`/account/orders/${order.id}`}
        className='text-sm font-medium underline underline-offset-4'>
        Back to Order details
      </Link>

      <div className='mt-8'>
        <p className='text-sm font-medium uppercase tracking-[0.2em] text-neutral-500'>
          Refund request
        </p>

        <h1 className='mt-3 text-3xl font-semibold'>Request a Refund</h1>

        <p className='mt-3 text-sm leading-6 text-neutral-600'>
          Order <span className='font-medium'>{order.orderNumber}</span>
        </p>
      </div>

      {formError && (
        <section
          role='alert'
          className='mt-6 border border-red-200 bg-red-50 p-4 text-sm text-red-700'>
          <p>{formError.message}</p>

          {scopeInvalid && (
            <p className='mt-2'>
              Review the selected scope and complete item-line selections.
            </p>
          )}

          {scopeConflict && (
            <Link
              to='/account/refunds'
              className='mt-3 inline-block font-medium underline underline-offset-4'>
              View My Refunds
            </Link>
          )}

          {itemNotFound && (
            <div className='mt-3 flex flex-wrap gap-4'>
              <button
                type='button'
                disabled={submitting}
                onClick={handleReloadOrderData}
                className='font-medium underline underline-offset-4'>
                Reload Order
              </button>

              <Link
                to={`/account/orders/${order.id}`}
                className='font-medium underline underline-offset-4'>
                Back to Order
              </Link>
            </div>
          )}

          {(refundNotEligible || submissionOrderNotFound) && (
            <Link
              to={
                submissionOrderNotFound
                  ? '/account/orders'
                  : `/account/orders/${order.id}`
              }
              className='mt-3 inline-block font-medium underline underline-offset-4'>
              {submissionOrderNotFound
                ? 'View My Orders'
                : 'Back to Order details'}
            </Link>
          )}
        </section>
      )}

      <div className='mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start'>
        <form onSubmit={handleSubmit} className='space-y-8'>
          <fieldset className='border border-neutral-200 p-5 sm:p-6'>
            <legend className='px-2 text-lg font-semibold'>Refund scope</legend>

            <div className='mt-2 grid gap-3 sm:grid-cols-2'>
              <label className='flex cursor-pointer gap-3 border border-neutral-300 p-4'>
                <input
                  type='radio'
                  name='scope'
                  value='order'
                  checked={scope === 'order'}
                  disabled={submitting}
                  onChange={handleScopeChange}
                  className='mt-1'
                />

                <span>
                  <span className='block font-medium'>Whole Order</span>
                  <span className='mt-1 block text-sm leading-5 text-neutral-600'>
                    Request a Refund for every item line in this Order.
                  </span>
                </span>
              </label>

              <label className='flex cursor-pointer gap-3 border border-neutral-300 p-4'>
                <input
                  type='radio'
                  name='scope'
                  value='items'
                  checked={scope === 'items'}
                  disabled={submitting}
                  onChange={handleScopeChange}
                  className='mt-1'
                />

                <span>
                  <span className='block font-medium'>Selected items</span>
                  <span className='mt-1 block text-sm leading-5 text-neutral-600'>
                    Select one or more complete stored Order lines.
                  </span>
                </span>
              </label>
            </div>
          </fieldset>

          {scope === 'items' && (
            <fieldset className='border border-neutral-200 p-5 sm:p-6'>
              <legend className='px-2 text-lg font-semibold'>Select items</legend>

              <p className='mt-2 text-sm leading-6 text-neutral-600'>
                Each selection includes the entire stored line and its full
                quantity. Partial-quantity Refunds are not available.
              </p>

              <div className='mt-4 divide-y divide-neutral-200 border-y border-neutral-200'>
                {order.items.map((item) => {
                  const options = Object.entries(item.variant?.options ?? {});

                  return (
                    <label
                      key={item.id}
                      className='flex cursor-pointer gap-4 py-5'>
                      <input
                        type='checkbox'
                        checked={selectedItemIds.includes(item.id)}
                        disabled={submitting}
                        onChange={() => handleItemSelection(item.id)}
                        className='mt-1 h-4 w-4 shrink-0'
                      />

                      <span className='flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:justify-between'>
                        <span>
                          <span className='block font-semibold'>
                            {item.product.name}
                          </span>

                          <span className='mt-1 block text-sm text-neutral-500'>
                            {item.product.brand}
                          </span>

                          {options.length > 0 && (
                            <span className='mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600'>
                              {options.map(([name, value]) => (
                                <span key={name}>
                                  {formatOptionName(name)}: {String(value)}
                                </span>
                              ))}
                            </span>
                          )}

                          <span className='mt-2 block text-sm text-neutral-600'>
                            Full line quantity: {item.quantity}
                          </span>
                        </span>

                        <span className='font-semibold sm:text-right'>
                          {formatInrFromPaise(item.pricing.lineTotal)}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          <section className='space-y-5 border border-neutral-200 p-5 sm:p-6'>
            <div>
              <label htmlFor='reason' className='mb-2 block font-medium'>
                Reason
              </label>

              <input
                id='reason'
                type='text'
                value={reason}
                disabled={submitting}
                onChange={(event) => setReason(event.target.value)}
                className='w-full border border-neutral-300 px-3 py-2.5 outline-none focus:border-black'
                required
              />
            </div>

            <div>
              <label htmlFor='explanation' className='mb-2 block font-medium'>
                Explanation <span className='font-normal'>(optional)</span>
              </label>

              <textarea
                id='explanation'
                value={explanation}
                disabled={submitting}
                onChange={(event) => setExplanation(event.target.value)}
                rows={5}
                className='w-full border border-neutral-300 px-3 py-2.5 outline-none focus:border-black'
              />
            </div>

            <button
              type='submit'
              disabled={submitting}
              className='bg-black px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50'>
              {submitting ? 'Submitting request...' : 'Submit Refund request'}
            </button>
          </section>
        </form>

        <aside className='border border-neutral-200 p-5 sm:p-6 lg:sticky lg:top-6'>
          <h2 className='font-semibold'>Original Order total</h2>

          <p className='mt-3 text-2xl font-semibold'>
            {formatInrFromPaise(order.pricing.totalAmount)}
          </p>

          <p className='mt-4 text-sm leading-6 text-neutral-600'>
            This amount is context only. The backend calculates the final
            Refund amount from original Order pricing, Coupon allocation, and
            your selected scope.
          </p>

          <p className='mt-3 text-sm leading-6 text-neutral-600'>
            React does not estimate or submit the Refund amount.
          </p>
        </aside>
      </div>
    </main>
  );
}

export default RefundRequestPage;
