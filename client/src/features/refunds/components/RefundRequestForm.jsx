import { Link } from 'react-router';

import { Alert } from '../../../components/ui/Alert.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Textarea } from '../../../components/ui/Textarea.jsx';

import { formatInrFromPaise } from '../../../utils/money.js';

import { formatRefundOptionName } from '../refund.utils.js';

function RefundFormError({
  error,
  order,

  submitting,

  onReloadOrder,
}) {
  if (!error) {
    return null;
  }

  const scopeConflict = error.code === 'REFUND_SCOPE_CONFLICT';

  const itemNotFound = error.code === 'REFUND_ITEM_NOT_FOUND';

  const scopeInvalid = error.code === 'REFUND_SCOPE_INVALID';

  const refundNotEligible = error.code === 'REFUND_NOT_ELIGIBLE';

  const orderNotFound = error.code === 'ORDER_NOT_FOUND';

  return (
    <Alert variant='danger' title='Unable to submit Refund'>
      <p className='mb-0'>{error.message}</p>

      {scopeInvalid ? (
        <p className='mt-2 mb-0'>
          Review the selected scope and complete item-line selections.
        </p>
      ) : null}

      {scopeConflict ? (
        <Link
          to='/account/refunds'
          className='mt-3 inline-flex font-semibold underline underline-offset-4'>
          View My Refunds
        </Link>
      ) : null}

      {itemNotFound ? (
        <div className='mt-3 flex flex-wrap gap-3'>
          <Button
            type='button'
            variant='secondary'
            size='sm'
            disabled={submitting}
            onClick={onReloadOrder}>
            Reload Order
          </Button>

          <Link
            to={`/account/orders/${order.id}`}
            className='inline-flex min-h-9 items-center text-sm font-semibold underline underline-offset-4'>
            Back to Order
          </Link>
        </div>
      ) : null}

      {refundNotEligible || orderNotFound ? (
        <Link
          to={orderNotFound ? '/account/orders' : `/account/orders/${order.id}`}
          className='mt-3 inline-flex font-semibold underline underline-offset-4'>
          {orderNotFound ? 'View My Orders' : 'Back to Order details'}
        </Link>
      ) : null}
    </Alert>
  );
}

export function RefundRequestForm({ request }) {
  const {
    order,

    scope,
    selectedItemIds,

    reason,
    explanation,

    formError,

    submitting,

    setReason,
    setExplanation,

    handleScopeChange,
    toggleItem,

    reloadOrderData,

    submit,
  } = request;

  return (
    <div className='mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start xl:gap-16'>
      <form onSubmit={submit} className='space-y-8'>
        <RefundFormError
          error={formError}
          order={order}
          submitting={submitting}
          onReloadOrder={reloadOrderData}
        />

        <fieldset className='border-y border-[var(--color-border)] py-6'>
          <legend className='px-0 text-lg font-black tracking-[-0.02em]'>
            Refund scope
          </legend>

          <div className='mt-4 grid gap-3 sm:grid-cols-2'>
            <label
              className={[
                'flex cursor-pointer gap-3 border px-4 py-4',
                scope === 'order'
                  ? 'border-[var(--color-ink)] bg-[var(--color-surface)]'
                  : 'border-[var(--color-border-strong)]',
              ].join(' ')}>
              <input
                type='radio'
                name='scope'
                value='order'
                checked={scope === 'order'}
                disabled={submitting}
                onChange={handleScopeChange}
                className='mt-1 size-4 accent-[var(--color-ink)]'
              />

              <span>
                <span className='block font-bold'>Whole Order</span>

                <span className='mt-1 block text-sm leading-5 text-[var(--color-muted)]'>
                  Request a Refund for every item line in this Order.
                </span>
              </span>
            </label>

            <label
              className={[
                'flex cursor-pointer gap-3 border px-4 py-4',
                scope === 'items'
                  ? 'border-[var(--color-ink)] bg-[var(--color-surface)]'
                  : 'border-[var(--color-border-strong)]',
              ].join(' ')}>
              <input
                type='radio'
                name='scope'
                value='items'
                checked={scope === 'items'}
                disabled={submitting}
                onChange={handleScopeChange}
                className='mt-1 size-4 accent-[var(--color-ink)]'
              />

              <span>
                <span className='block font-bold'>Selected items</span>

                <span className='mt-1 block text-sm leading-5 text-[var(--color-muted)]'>
                  Select one or more complete stored Order lines.
                </span>
              </span>
            </label>
          </div>
        </fieldset>

        {scope === 'items' ? (
          <fieldset className='border-y border-[var(--color-border)] py-6'>
            <legend className='px-0 text-lg font-black tracking-[-0.02em]'>
              Select items
            </legend>

            <p className='mt-2 mb-0 text-sm leading-6 text-[var(--color-muted)]'>
              Each selection includes the entire stored line and its full
              quantity. Partial-quantity Refunds are not available.
            </p>

            <div className='mt-4 border-y border-[var(--color-border)]'>
              {order.items.map((item) => {
                const options = Object.entries(item.variant?.options ?? {});

                const selected = selectedItemIds.includes(item.id);

                return (
                  <label
                    key={item.id}
                    className={[
                      'flex cursor-pointer gap-4 border-b border-[var(--color-border)] py-5 last:border-b-0',
                      selected ? 'bg-[var(--color-surface)] px-3' : '',
                    ].join(' ')}>
                    <input
                      type='checkbox'
                      checked={selected}
                      disabled={submitting}
                      onChange={() => toggleItem(item.id)}
                      className='mt-1 size-4 shrink-0 accent-[var(--color-ink)]'
                    />

                    <span className='flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:justify-between'>
                      <span>
                        <span className='block font-bold'>
                          {item.product.name}
                        </span>

                        <span className='mt-1 block text-sm text-[var(--color-muted)]'>
                          {item.product.brand}
                        </span>

                        {options.length > 0 ? (
                          <span className='mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-muted)]'>
                            {options.map(([name, value]) => (
                              <span key={name}>
                                {formatRefundOptionName(name)}: {String(value)}
                              </span>
                            ))}
                          </span>
                        ) : null}

                        <span className='mt-2 block text-sm text-[var(--color-muted)]'>
                          Full line quantity: {item.quantity}
                        </span>
                      </span>

                      <span className='font-bold ds-tabular-nums sm:text-right'>
                        {formatInrFromPaise(item.pricing.lineTotal)}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        <section className='space-y-5'>
          <Input
            id='refund-reason'
            label='Reason'
            value={reason}
            disabled={submitting}
            required
            onChange={(event) => {
              setReason(event.target.value);
            }}
          />

          <Textarea
            id='refund-explanation'
            label='Explanation'
            hint='Optional'
            value={explanation}
            disabled={submitting}
            rows={5}
            onChange={(event) => {
              setExplanation(event.target.value);
            }}
          />

          <Button type='submit' size='lg' disabled={submitting}>
            {submitting ? 'Submitting request...' : 'Submit Refund request'}
          </Button>
        </section>
      </form>

      <aside className='border-t border-[var(--color-ink)] pt-5 lg:sticky lg:top-24'>
        <p className='mb-1 text-sm text-[var(--color-muted)]'>
          Original Order total
        </p>

        <p className='mb-0 text-2xl font-black tracking-[-0.03em] ds-tabular-nums'>
          {formatInrFromPaise(order.pricing.totalAmount)}
        </p>

        <p className='mt-4 mb-0 text-sm leading-6 text-[var(--color-muted)]'>
          This amount is context only. The backend calculates the final Refund
          amount from the original Order pricing, Coupon allocation and selected
          scope.
        </p>

        <p className='mt-3 mb-0 text-sm font-semibold'>
          React does not estimate or submit the Refund amount.
        </p>
      </aside>
    </div>
  );
}
