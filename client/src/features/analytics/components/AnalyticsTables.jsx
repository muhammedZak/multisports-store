import { formatInrFromPaise } from '../../../utils/money.js';

import { analyticsIntegerFormatter } from '../analytics.utils.js';

export function LowPerformingProductsTable({ products }) {
  if (products.length === 0) {
    return (
      <div className='py-10 text-center text-sm text-[var(--color-muted)]'>
        No active Products are available for low-performance comparison.
      </div>
    );
  }

  return (
    <div className='overflow-x-auto'>
      <table className='min-w-full text-left text-sm'>
        <thead className='bg-[var(--color-surface)]'>
          <tr>
            <th className='px-4 py-3 font-bold'>Product</th>

            <th className='px-4 py-3 text-right font-bold'>Units Sold</th>

            <th className='px-4 py-3 text-right font-bold'>Sales</th>
          </tr>
        </thead>

        <tbody>
          {products.map((product) => (
            <tr
              key={product.productId}
              className='border-t border-[var(--color-border)]'>
              <td className='px-4 py-3 font-semibold'>{product.productName}</td>

              <td className='px-4 py-3 text-right ds-tabular-nums'>
                {analyticsIntegerFormatter.format(product.unitsSold)}
              </td>

              <td className='px-4 py-3 text-right font-semibold ds-tabular-nums'>
                {formatInrFromPaise(product.salesAmount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TopProductsTable({ products }) {
  if (products.length === 0) {
    return null;
  }

  return (
    <div className='mt-5 overflow-x-auto border-t border-[var(--color-border)] pt-5'>
      <table className='min-w-full text-left text-sm'>
        <thead>
          <tr className='text-xs text-[var(--color-muted)]'>
            <th className='pb-3 font-bold'>Product</th>

            <th className='pb-3 text-right font-bold'>Units</th>

            <th className='pb-3 text-right font-bold'>Sales</th>
          </tr>
        </thead>

        <tbody>
          {products.map((product) => (
            <tr
              key={product.productId}
              className='border-t border-[var(--color-border)]'>
              <td className='py-3 pr-4 font-semibold'>{product.productName}</td>

              <td className='py-3 text-right ds-tabular-nums'>
                {analyticsIntegerFormatter.format(product.unitsSold)}
              </td>

              <td className='py-3 text-right font-semibold ds-tabular-nums'>
                {formatInrFromPaise(product.salesAmount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RefundWorkflowTable({ workflow }) {
  const rows = [
    ['Requested', workflow.requested],

    ['Approved', workflow.approved],

    ['Rejected', workflow.rejected],

    ['Processing', workflow.processing],

    ['Refunded', workflow.refunded],

    ['Failed', workflow.failed],
  ];

  return (
    <div className='overflow-x-auto'>
      <table className='min-w-full text-left text-sm'>
        <thead className='bg-[var(--color-surface)]'>
          <tr>
            <th className='px-4 py-3 font-bold'>Current Status</th>

            <th className='px-4 py-3 text-right font-bold'>Requests</th>
          </tr>
        </thead>

        <tbody>
          {rows.map(([status, value]) => (
            <tr key={status} className='border-t border-[var(--color-border)]'>
              <td className='px-4 py-3'>{status}</td>

              <td className='px-4 py-3 text-right font-semibold ds-tabular-nums'>
                {analyticsIntegerFormatter.format(value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RefundFinancialBreakdown({ financial }) {
  const rows = [
    {
      label: 'Customer request',

      value: financial.customerRequestRefundedAmount,
    },

    {
      label: 'Order cancellation',

      value: financial.orderCancellationRefundedAmount,
    },

    {
      label: 'System compensation',

      value: financial.systemCompensationRefundedAmount,
    },
  ];

  return (
    <dl>
      {rows.map((row) => (
        <div
          key={row.label}
          className='flex items-center justify-between gap-4 border-t border-[var(--color-border)] py-4 first:border-t-0 first:pt-0 last:pb-0'>
          <dt className='text-sm text-[var(--color-muted)]'>{row.label}</dt>

          <dd className='m-0 font-black ds-tabular-nums'>
            {formatInrFromPaise(row.value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
