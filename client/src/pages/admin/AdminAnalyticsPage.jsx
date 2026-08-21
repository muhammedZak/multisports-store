import { useEffect, useState } from 'react';

import { Link, useSearchParams } from 'react-router';

import { fetchAdminAnalytics } from '../../api/analyticsApi.js';
import { normalizeApiError } from '../../api/errors.js';

import {
  CategorySalesChart,
  NewCustomerTrendChart,
  OrderStatusChart,
  OrdersTrendChart,
  RefundAmountTrendChart,
  RefundRequestTrendChart,
  RevenueTrendChart,
  SalesBySportChart,
  TopProductsChart,
} from '../../components/admin/analytics/AnalyticsCharts.jsx';

import { formatInrFromPaise } from '../../utils/money.js';

const RANGE_OPTIONS = [
  {
    value: '7d',
    label: '7 Days',
  },
  {
    value: '30d',
    label: '30 Days',
  },
  {
    value: 'month',
    label: 'This Month',
  },
  {
    value: 'year',
    label: 'This Year',
  },
];

const integerFormatter = new Intl.NumberFormat('en-IN');

function formatBoundary(value, timezone) {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezone,
  }).format(new Date(value));
}

function formatLabel(value) {
  if (!value) {
    return 'Unknown';
  }

  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function MetricCard({ label, value, detail, attention = false }) {
  return (
    <div className='border border-neutral-200 bg-white p-5'>
      <p className='text-xs font-medium uppercase tracking-[0.16em] text-neutral-500'>
        {label}
      </p>

      <p
        className={[
          'mt-3 text-2xl font-semibold',
          attention ? 'text-red-700' : 'text-neutral-950',
        ].join(' ')}>
        {value}
      </p>

      {detail && (
        <p className='mt-2 text-xs leading-5 text-neutral-500'>{detail}</p>
      )}
    </div>
  );
}

function ChartPanel({ title, description, children, action }) {
  return (
    <section className='min-w-0 border border-neutral-200 bg-white'>
      <div className='flex items-start justify-between gap-4 border-b border-neutral-200 px-4 py-4 sm:px-5'>
        <div>
          <h2 className='font-semibold'>{title}</h2>

          {description && (
            <p className='mt-1 text-xs leading-5 text-neutral-500'>
              {description}
            </p>
          )}
        </div>

        {action}
      </div>

      <div className='min-w-0 p-3 sm:p-5'>{children}</div>
    </section>
  );
}

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div>
      <p className='text-xs font-medium uppercase tracking-[0.18em] text-neutral-500'>
        {eyebrow}
      </p>

      <h2 className='mt-2 text-xl font-semibold'>{title}</h2>

      {description && (
        <p className='mt-2 max-w-3xl text-sm leading-6 text-neutral-600'>
          {description}
        </p>
      )}
    </div>
  );
}

function LowPerformingTable({ products }) {
  if (products.length === 0) {
    return (
      <div className='py-10 text-center text-sm text-neutral-500'>
        No active Products are available for low-performance comparison.
      </div>
    );
  }

  return (
    <div className='overflow-x-auto'>
      <table className='min-w-full text-left text-sm'>
        <thead className='border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500'>
          <tr>
            <th className='px-4 py-3 font-medium'>Product</th>

            <th className='px-4 py-3 text-right font-medium'>Units Sold</th>

            <th className='px-4 py-3 text-right font-medium'>Sales</th>
          </tr>
        </thead>

        <tbody>
          {products.map((product) => (
            <tr key={product.productId} className='border-b border-neutral-100'>
              <td className='px-4 py-3 font-medium'>{product.productName}</td>

              <td className='px-4 py-3 text-right'>
                {integerFormatter.format(product.unitsSold)}
              </td>

              <td className='px-4 py-3 text-right'>
                {formatInrFromPaise(product.salesAmount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TopProductsTable({ products }) {
  if (products.length === 0) {
    return null;
  }

  return (
    <div className='mt-5 overflow-x-auto border-t border-neutral-200 pt-5'>
      <table className='min-w-full text-left text-sm'>
        <thead className='text-xs uppercase tracking-wide text-neutral-500'>
          <tr>
            <th className='pb-3 font-medium'>Product</th>

            <th className='pb-3 text-right font-medium'>Units</th>

            <th className='pb-3 text-right font-medium'>Sales</th>
          </tr>
        </thead>

        <tbody>
          {products.map((product) => (
            <tr key={product.productId} className='border-t border-neutral-100'>
              <td className='py-3 pr-4 font-medium'>{product.productName}</td>

              <td className='py-3 text-right'>
                {integerFormatter.format(product.unitsSold)}
              </td>

              <td className='py-3 text-right'>
                {formatInrFromPaise(product.salesAmount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RefundWorkflowTable({ workflow }) {
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
        <thead className='border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500'>
          <tr>
            <th className='px-4 py-3 font-medium'>Current Status</th>

            <th className='px-4 py-3 text-right font-medium'>Requests</th>
          </tr>
        </thead>

        <tbody>
          {rows.map(([status, value]) => (
            <tr key={status} className='border-b border-neutral-100'>
              <td className='px-4 py-3'>{status}</td>

              <td className='px-4 py-3 text-right font-medium'>
                {integerFormatter.format(value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminAnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const requestedRange = searchParams.get('range') || '30d';

  const [analytics, setAnalytics] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    fetchAdminAnalytics(requestedRange, {
      signal: controller.signal,
    })
      .then((data) => {
        if (controller.signal.aborted) {
          return;
        }

        setAnalytics(data);
      })
      .catch((requestError) => {
        if (
          controller.signal.aborted ||
          requestError?.code === 'ERR_CANCELED'
        ) {
          return;
        }

        setAnalytics(null);

        setError(
          normalizeApiError(
            requestError,
            'Unable to load Admin Analytics. Please try again.',
          ),
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [requestedRange, reloadKey]);

  function handleRangeChange(range) {
    setSearchParams({
      range,
    });
  }

  return (
    <main className='p-5 sm:p-6'>
      <div className='flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between'>
        <div>
          <p className='text-sm font-medium uppercase tracking-[0.2em] text-neutral-500'>
            Store reporting
          </p>

          <h1 className='mt-3 text-3xl font-semibold'>Analytics</h1>

          <p className='mt-3 max-w-2xl text-sm leading-6 text-neutral-600'>
            Review store performance, Customer activity, Product demand,
            Inventory health, and Refund behavior using backend-derived data.
          </p>
        </div>

        <div>
          <p className='mb-2 text-xs font-medium uppercase tracking-[0.16em] text-neutral-500'>
            Time range
          </p>

          <div className='flex flex-wrap gap-2'>
            {RANGE_OPTIONS.map((option) => {
              const selected = requestedRange === option.value;

              return (
                <button
                  key={option.value}
                  type='button'
                  aria-pressed={selected}
                  onClick={() => handleRangeChange(option.value)}
                  className={[
                    'border px-3 py-2 text-sm font-medium transition',
                    selected
                      ? 'border-black bg-black text-white'
                      : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500 hover:bg-neutral-50',
                  ].join(' ')}>
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {loading && (
        <section className='mt-8 border border-neutral-200 p-8 text-sm text-neutral-600'>
          Loading Analytics...
        </section>
      )}

      {!loading && error && (
        <section className='mt-8 border border-red-200 bg-red-50 p-5'>
          <p role='alert' className='text-sm text-red-700'>
            {error.message}
          </p>

          {error.code === 'INVALID_ANALYTICS_RANGE' && (
            <p className='mt-2 text-xs text-red-700'>
              Choose one of the supported time ranges above.
            </p>
          )}

          <button
            type='button'
            onClick={() => setReloadKey((value) => value + 1)}
            className='mt-4 bg-black px-4 py-2.5 text-sm font-medium text-white'>
            Try again
          </button>
        </section>
      )}

      {!loading && !error && analytics && (
        <>
          <section className='mt-6 border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs leading-5 text-neutral-600'>
            <span className='font-medium text-neutral-900'>
              {formatBoundary(
                analytics.range.startAt,
                analytics.range.timezone,
              )}
            </span>
            {' → '}
            <span className='font-medium text-neutral-900'>
              {formatBoundary(analytics.range.endAt, analytics.range.timezone)}
            </span>
            <span className='mx-2'>·</span>
            {analytics.range.timezone}
            <span className='mx-2'>·</span>
            {formatLabel(analytics.range.bucket)} buckets
          </section>

          {/* Summary KPIs */}
          <section className='mt-5 grid gap-4 md:grid-cols-3'>
            <MetricCard
              label='Revenue'
              value={formatInrFromPaise(analytics.summary.totalRevenue)}
              detail='Recognized net revenue for the selected range'
            />

            <MetricCard
              label='Orders'
              value={integerFormatter.format(analytics.summary.totalOrders)}
              detail='Orders placed in the selected range'
            />

            <MetricCard
              label='Average Order Value'
              value={formatInrFromPaise(analytics.summary.averageOrderValue)}
              detail='Gross recognized sales per recognized paid Order'
            />
          </section>

          {/* Core sales / order charts */}
          <div className='mt-8'>
            <SectionHeading
              eyebrow='Sales and Orders'
              title='Store performance'
              description='Revenue, Order volume, Sport demand, and current Order-status distribution for the selected reporting range.'
            />

            <div className='mt-5 grid gap-5 xl:grid-cols-2'>
              <ChartPanel
                title='Revenue Over Time'
                description='Gross sales, confirmed Customer Refund deductions, and resulting net revenue.'>
                <RevenueTrendChart data={analytics.sales.revenueOverTime} />
              </ChartPanel>

              <ChartPanel
                title='Orders Over Time'
                description='All Orders placed during each reporting bucket, including Orders later cancelled.'
                action={
                  <Link
                    to='/admin/orders'
                    className='shrink-0 text-xs font-medium underline underline-offset-4'>
                    Orders
                  </Link>
                }>
                <OrdersTrendChart data={analytics.sales.ordersOverTime} />
              </ChartPanel>

              <ChartPanel
                title='Sales by Sport'
                description='Recognized paid-line sales attributed using immutable Order item Sport snapshots.'>
                <SalesBySportChart data={analytics.sales.bySport} />
              </ChartPanel>

              <ChartPanel
                title='Order Status Distribution'
                description={`${integerFormatter.format(
                  analytics.orders.cancelledOrders,
                )} currently cancelled Orders in this reporting range.`}>
                <OrderStatusChart data={analytics.orders.statusDistribution} />
              </ChartPanel>
            </div>
          </div>

          {/* Product analytics */}
          <div className='mt-10'>
            <SectionHeading
              eyebrow='Catalog demand'
              title='Product and Category analytics'
              description='Historical demand is based on immutable Order item snapshots rather than today’s mutable Product or Category labels.'
            />

            <div className='mt-5 grid gap-5 xl:grid-cols-2'>
              <ChartPanel
                title='Top Products'
                description='Up to 10 Products ranked primarily by units sold.'>
                <TopProductsChart data={analytics.products.topSelling} />

                <TopProductsTable products={analytics.products.topSelling} />
              </ChartPanel>

              <ChartPanel
                title='Sales by Category'
                description='Recognized paid-line sales grouped by historical Category snapshots.'>
                <CategorySalesChart data={analytics.sales.byCategory} />
              </ChartPanel>
            </div>

            <section className='mt-5 border border-neutral-200'>
              <div className='border-b border-neutral-200 px-4 py-4 sm:px-5'>
                <h2 className='font-semibold'>
                  Low-performing Active Products
                </h2>

                <p className='mt-1 text-xs leading-5 text-neutral-500'>
                  Up to 5 currently active Products with the lowest units sold
                  in this range, including zero-sale Products where applicable.
                </p>
              </div>

              <LowPerformingTable products={analytics.products.lowPerforming} />
            </section>
          </div>

          {/* Customer analytics */}
          <div className='mt-10'>
            <SectionHeading
              eyebrow='Customers'
              title='Customer activity'
              description='Current Customer population, registrations in this range, and distinct Customers with recognized purchases.'
            />

            <section className='mt-5 grid gap-4 sm:grid-cols-3'>
              <MetricCard
                label='Total Customers'
                value={integerFormatter.format(
                  analytics.customers.totalCustomers,
                )}
                detail='Current registered Customer accounts'
              />

              <MetricCard
                label='New Customers'
                value={integerFormatter.format(
                  analytics.customers.newCustomers,
                )}
                detail='Customer registrations in this range'
              />

              <MetricCard
                label='Purchasing Customers'
                value={integerFormatter.format(
                  analytics.customers.purchasingCustomers,
                )}
                detail='Distinct Customers with recognized paid Orders'
              />
            </section>

            <div className='mt-5'>
              <ChartPanel
                title='New Customer Trend'
                description='Customer registrations grouped by the selected Analytics calendar bucket.'>
                <NewCustomerTrendChart
                  data={analytics.customers.newCustomerTrend}
                />
              </ChartPanel>
            </div>
          </div>

          {/* Current inventory */}
          <div className='mt-10'>
            <SectionHeading
              eyebrow='Current inventory'
              title='Inventory health'
              description='Inventory is a current-state operational view and intentionally does not change when the reporting range changes.'
            />

            <div className='mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5'>
              <MetricCard
                label='In-stock Positions'
                value={integerFormatter.format(
                  analytics.inventory.positions.inStock,
                )}
                detail='Purchasable positions above the low-stock threshold'
              />

              <MetricCard
                label='Low-stock Positions'
                value={integerFormatter.format(
                  analytics.inventory.positions.lowStock,
                )}
                detail='Purchasable positions nearing depletion'
                attention={analytics.inventory.positions.lowStock > 0}
              />

              <MetricCard
                label='Out-of-stock Positions'
                value={integerFormatter.format(
                  analytics.inventory.positions.outOfStock,
                )}
                detail='Purchasable positions with zero quantity'
                attention={analytics.inventory.positions.outOfStock > 0}
              />

              <MetricCard
                label='Low-stock Products'
                value={integerFormatter.format(
                  analytics.inventory.products.lowStock,
                )}
                detail='Distinct Products with a low-stock position'
                attention={analytics.inventory.products.lowStock > 0}
              />

              <MetricCard
                label='Out-of-stock Products'
                value={integerFormatter.format(
                  analytics.inventory.products.outOfStock,
                )}
                detail='Distinct Products with an out-of-stock position'
                attention={analytics.inventory.products.outOfStock > 0}
              />
            </div>

            <Link
              to='/admin/inventory'
              className='mt-4 inline-flex text-sm font-medium underline underline-offset-4'>
              Open Inventory management
            </Link>
          </div>

          {/* Refund analytics */}
          <div className='mt-10'>
            <SectionHeading
              eyebrow='Refunds'
              title='Refund activity'
              description='Customer-request workflow metrics use request time, while financial totals use provider-confirmed Refund completion time.'
            />

            <section className='mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
              <MetricCard
                label='Customer Requests'
                value={integerFormatter.format(
                  analytics.refunds.workflow.totalRequests,
                )}
                detail='Customer refund requests created in this range'
              />

              <MetricCard
                label='Provider Refunded'
                value={formatInrFromPaise(
                  analytics.refunds.financial.totalProviderRefundedAmount,
                )}
                detail='All provider-confirmed Refund origins'
              />

              <MetricCard
                label='Customer-request Refunds'
                value={formatInrFromPaise(
                  analytics.refunds.financial.customerRequestRefundedAmount,
                )}
                detail='The only Refund origin that reduces recognized revenue'
              />

              <MetricCard
                label='Cancellation + Compensation'
                value={formatInrFromPaise(
                  analytics.refunds.financial.orderCancellationRefundedAmount +
                    analytics.refunds.financial
                      .systemCompensationRefundedAmount,
                )}
                detail='Displayed for reporting; not deducted again from revenue'
              />
            </section>

            {/*
             * The UI combines these two backend values only for display.
             * It does not use the result for revenue or business decisions.
             */}
            <div className='mt-5 grid gap-5 xl:grid-cols-2'>
              <ChartPanel
                title='Refund Workflow'
                description='Current states of Customer requests originally submitted in this reporting range.'
                action={
                  <Link
                    to='/admin/refunds'
                    className='shrink-0 text-xs font-medium underline underline-offset-4'>
                    Refunds
                  </Link>
                }>
                <RefundWorkflowTable workflow={analytics.refunds.workflow} />
              </ChartPanel>

              <ChartPanel
                title='Refund Financial Breakdown'
                description='Provider-confirmed refunded amounts split by origin.'>
                <div className='space-y-4'>
                  <div className='flex items-center justify-between gap-4 border-b border-neutral-100 pb-4'>
                    <span className='text-sm text-neutral-600'>
                      Customer request
                    </span>

                    <strong>
                      {formatInrFromPaise(
                        analytics.refunds.financial
                          .customerRequestRefundedAmount,
                      )}
                    </strong>
                  </div>

                  <div className='flex items-center justify-between gap-4 border-b border-neutral-100 pb-4'>
                    <span className='text-sm text-neutral-600'>
                      Order cancellation
                    </span>

                    <strong>
                      {formatInrFromPaise(
                        analytics.refunds.financial
                          .orderCancellationRefundedAmount,
                      )}
                    </strong>
                  </div>

                  <div className='flex items-center justify-between gap-4'>
                    <span className='text-sm text-neutral-600'>
                      System compensation
                    </span>

                    <strong>
                      {formatInrFromPaise(
                        analytics.refunds.financial
                          .systemCompensationRefundedAmount,
                      )}
                    </strong>
                  </div>
                </div>
              </ChartPanel>

              <ChartPanel
                title='Customer Refund Requests Over Time'
                description='Requests are attributed to the period in which the Customer submitted them.'>
                <RefundRequestTrendChart data={analytics.refunds.trend} />
              </ChartPanel>

              <ChartPanel
                title='Provider Refunds Over Time'
                description='Financial Refund amounts are attributed to provider-confirmed completion time.'>
                <RefundAmountTrendChart data={analytics.refunds.trend} />
              </ChartPanel>
            </div>
          </div>
        </>
      )}
    </main>
  );
}

export default AdminAnalyticsPage;
