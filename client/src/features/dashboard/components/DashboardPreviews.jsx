import { Link } from 'react-router';

import { formatInrFromPaise } from '../../../utils/money.js';

import { OrderStatusBadge } from '../../orders/components/OrderStatusBadge.jsx';

import { InventoryStockBadge } from '../../inventory/components/InventoryStockBadge.jsx';

import { formatInventoryVariant } from '../../inventory/inventory.utils.js';

import { RefundStatusBadge } from '../../refunds/components/RefundStatusBadge.jsx';

import {
  formatDashboardDate,
  formatDashboardLabel,
} from '../dashboard.utils.js';

function PreviewShell({
  title,
  description,

  to,
  linkLabel,

  children,
}) {
  return (
    <section className='border-y border-[var(--color-border)]'>
      <header className='flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-4 py-4'>
        <div>
          <h2 className='mb-0 font-black'>{title}</h2>

          {description ? (
            <p className='mt-1 mb-0 text-xs leading-5 text-[var(--color-muted)]'>
              {description}
            </p>
          ) : null}
        </div>

        {to ? (
          <Link
            to={to}
            className='shrink-0 text-xs font-semibold underline underline-offset-4'>
            {linkLabel}
          </Link>
        ) : null}
      </header>

      {children}
    </section>
  );
}

function EmptyPreview({ children }) {
  return (
    <div className='px-4 py-10 text-center text-sm text-[var(--color-muted)]'>
      {children}
    </div>
  );
}

export function RecentOrdersPreview({ orders }) {
  return (
    <PreviewShell
      title='Recent Orders'
      description='Latest Customer Orders by placement time.'
      to='/admin/orders'
      linkLabel='View all'>
      {orders.length === 0 ? (
        <EmptyPreview>No Orders have been placed yet.</EmptyPreview>
      ) : (
        <div>
          {orders.map((order) => (
            <article
              key={order.id}
              className='flex flex-col gap-4 border-t border-[var(--color-border)] px-4 py-4 first:border-t-0 sm:flex-row sm:items-center sm:justify-between'>
              <div className='min-w-0'>
                <div className='flex flex-wrap items-center gap-2'>
                  <p className='mb-0 break-all font-bold'>
                    {order.orderNumber}
                  </p>

                  <OrderStatusBadge status={order.orderStatus} />
                </div>

                <p className='mt-2 mb-0 text-xs text-[var(--color-muted)]'>
                  {formatDashboardDate(order.placedAt)}
                </p>
              </div>

              <div className='flex shrink-0 items-center justify-between gap-5 sm:justify-end'>
                <p className='mb-0 font-black ds-tabular-nums'>
                  {formatInrFromPaise(order.totalAmount)}
                </p>

                <Link
                  to={`/admin/orders/${order.id}`}
                  className='text-sm font-semibold underline underline-offset-4'>
                  View
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </PreviewShell>
  );
}

export function DashboardInventoryPreview({
  title,
  description,

  items,

  emptyMessage,
}) {
  return (
    <PreviewShell
      title={title}
      description={description}
      to='/admin/inventory'
      linkLabel='Inventory'>
      {items.length === 0 ? (
        <EmptyPreview>{emptyMessage}</EmptyPreview>
      ) : (
        <div>
          {items.map((inventory) => (
            <article
              key={inventory.id}
              className='border-t border-[var(--color-border)] px-4 py-4 first:border-t-0'>
              <div className='flex items-start justify-between gap-4'>
                <div className='min-w-0'>
                  <p className='mb-0 font-bold'>{inventory.product.name}</p>

                  <p className='mt-1 mb-0 text-xs text-[var(--color-muted)]'>
                    {inventory.product.brand}
                    {' · '}
                    {formatDashboardLabel(inventory.product.sport)}
                  </p>

                  <p className='mt-2 mb-0 text-xs text-[var(--color-muted)]'>
                    {formatInventoryVariant(inventory.variant)}
                  </p>
                </div>

                <div className='shrink-0 text-right'>
                  <InventoryStockBadge stockState={inventory.stockState} />

                  <p className='mt-2 mb-0 text-lg font-black ds-tabular-nums'>
                    {inventory.quantity}
                  </p>
                </div>
              </div>

              <Link
                to={`/admin/inventory/${inventory.id}`}
                className='mt-4 inline-flex text-sm font-semibold underline underline-offset-4'>
                View Inventory
              </Link>
            </article>
          ))}
        </div>
      )}
    </PreviewShell>
  );
}

export function DashboardRefundRequestsPreview({ refunds }) {
  return (
    <PreviewShell
      title='Recent Refund Requests'
      description='Customer requests awaiting Admin review.'
      to='/admin/refunds'
      linkLabel='Refunds'>
      {refunds.length === 0 ? (
        <EmptyPreview>
          No Customer Refund requests are awaiting review.
        </EmptyPreview>
      ) : (
        <div>
          {refunds.map((refund) => (
            <article
              key={refund.id}
              className='border-t border-[var(--color-border)] px-4 py-4 first:border-t-0'>
              <div className='flex items-start justify-between gap-4'>
                <div className='min-w-0'>
                  <RefundStatusBadge status={refund.status} />

                  <p className='mt-3 mb-0 text-sm leading-6 text-[var(--color-ink-soft)]'>
                    {refund.reason}
                  </p>

                  <p className='mt-2 mb-0 text-xs text-[var(--color-muted)]'>
                    {formatDashboardDate(refund.requestedAt)}
                  </p>
                </div>

                <p className='shrink-0 mb-0 font-black ds-tabular-nums'>
                  {formatInrFromPaise(refund.amount)}
                </p>
              </div>

              <Link
                to={`/admin/refunds/${refund.id}`}
                className='mt-4 inline-flex text-sm font-semibold underline underline-offset-4'>
                Review request
              </Link>
            </article>
          ))}
        </div>
      )}
    </PreviewShell>
  );
}
