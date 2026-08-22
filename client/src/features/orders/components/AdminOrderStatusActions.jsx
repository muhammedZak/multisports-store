import { Button } from '../../../components/ui/Button.jsx';

import { formatOrderLabel } from '../order.utils.js';

import { getAdminOrderTransitionLabel } from '../adminOrder.utils.js';

export function AdminOrderStatusActions({
  order,

  statusUpdating,

  onUpdate,
}) {
  return (
    <section className='border-t border-[var(--color-border)] pt-6'>
      <h2 className='mb-0 text-lg font-black'>Fulfillment workflow</h2>

      <p className='mt-2 mb-0 text-sm leading-6 text-[var(--color-muted)]'>
        Current status:{' '}
        <strong className='text-[var(--color-ink)]'>
          {formatOrderLabel(order.orderStatus)}
        </strong>
      </p>

      {order.allowedNextStatuses.length > 0 ? (
        <>
          <p className='mt-5 mb-0 text-sm text-[var(--color-muted)]'>
            Available actions
          </p>

          <div className='mt-3 flex flex-wrap gap-3'>
            {order.allowedNextStatuses.map((status) => {
              const cancelling = status === 'cancelled';

              const updating = statusUpdating === status;

              return (
                <Button
                  key={status}
                  type='button'
                  variant={cancelling ? 'secondary' : 'primary'}
                  disabled={Boolean(statusUpdating)}
                  onClick={() => onUpdate(status)}
                  className={cancelling ? 'text-[var(--color-danger)]' : ''}>
                  {updating
                    ? cancelling
                      ? 'Cancelling...'
                      : 'Updating...'
                    : getAdminOrderTransitionLabel(status)}
                </Button>
              );
            })}
          </div>

          {order.allowedNextStatuses.includes('cancelled') ? (
            <p className='mt-4 mb-0 max-w-2xl text-xs leading-5 text-[var(--color-muted)]'>
              Cancelling restores purchased Inventory. Payment and Refund
              processing are managed separately.
            </p>
          ) : null}
        </>
      ) : (
        <p className='mt-4 mb-0 text-sm text-[var(--color-muted)]'>
          This Order has no further permitted fulfillment transitions.
        </p>
      )}
    </section>
  );
}
