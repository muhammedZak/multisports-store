import { Link } from 'react-router';

import { formatInrFromPaise } from '../../../utils/money.js';

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
} from './AnalyticsCharts.jsx';

import {
  AnalyticsChartPanel,
  AnalyticsMetric,
  AnalyticsSectionHeading,
} from './AnalyticsPrimitives.jsx';

import {
  LowPerformingProductsTable,
  RefundFinancialBreakdown,
  RefundWorkflowTable,
  TopProductsTable,
} from './AnalyticsTables.jsx';

import { analyticsIntegerFormatter } from '../analytics.utils.js';

export function AnalyticsSummary({ analytics }) {
  return (
    <section className='mt-6 grid gap-x-6 md:grid-cols-3'>
      <AnalyticsMetric
        label='Revenue'
        value={formatInrFromPaise(analytics.summary.totalRevenue)}
        detail='Recognized net revenue for the selected range'
      />

      <AnalyticsMetric
        label='Orders'
        value={analyticsIntegerFormatter.format(analytics.summary.totalOrders)}
        detail='Orders placed in the selected range'
      />

      <AnalyticsMetric
        label='Average Order Value'
        value={formatInrFromPaise(analytics.summary.averageOrderValue)}
        detail='Gross recognized sales per recognized paid Order'
      />
    </section>
  );
}

export function AnalyticsSalesSection({ analytics }) {
  return (
    <section className='mt-10'>
      <AnalyticsSectionHeading
        eyebrow='Sales and Orders'
        title='Store performance'
        description='Revenue, Order volume, Sport demand, and current Order-status distribution for the selected reporting range.'
      />

      <div className='mt-5 grid gap-5 xl:grid-cols-2'>
        <AnalyticsChartPanel
          title='Revenue Over Time'
          description='Gross sales, confirmed Customer Refund deductions, and resulting net revenue.'>
          <RevenueTrendChart data={analytics.sales.revenueOverTime} />
        </AnalyticsChartPanel>

        <AnalyticsChartPanel
          title='Orders Over Time'
          description='All Orders placed during each reporting bucket, including Orders later cancelled.'
          action={
            <Link
              to='/admin/orders'
              className='text-xs font-semibold underline underline-offset-4'>
              Orders
            </Link>
          }>
          <OrdersTrendChart data={analytics.sales.ordersOverTime} />
        </AnalyticsChartPanel>

        <AnalyticsChartPanel
          title='Sales by Sport'
          description='Recognized paid-line sales attributed using immutable Order item Sport snapshots.'>
          <SalesBySportChart data={analytics.sales.bySport} />
        </AnalyticsChartPanel>

        <AnalyticsChartPanel
          title='Order Status Distribution'
          description={`${analyticsIntegerFormatter.format(
            analytics.orders.cancelledOrders,
          )} currently cancelled Orders in this reporting range.`}>
          <OrderStatusChart data={analytics.orders.statusDistribution} />
        </AnalyticsChartPanel>
      </div>
    </section>
  );
}

export function AnalyticsProductsSection({ analytics }) {
  return (
    <section className='mt-12'>
      <AnalyticsSectionHeading
        eyebrow='Catalog demand'
        title='Product and Category analytics'
        description='Historical demand is based on immutable Order item snapshots rather than today’s mutable Product or Category labels.'
      />

      <div className='mt-5 grid gap-5 xl:grid-cols-2'>
        <AnalyticsChartPanel
          title='Top Products'
          description='Up to 10 Products ranked primarily by units sold.'>
          <TopProductsChart data={analytics.products.topSelling} />

          <TopProductsTable products={analytics.products.topSelling} />
        </AnalyticsChartPanel>

        <AnalyticsChartPanel
          title='Sales by Category'
          description='Recognized paid-line sales grouped by historical Category snapshots.'>
          <CategorySalesChart data={analytics.sales.byCategory} />
        </AnalyticsChartPanel>
      </div>

      <section className='mt-5 border border-[var(--color-border)]'>
        <header className='border-b border-[var(--color-border)] px-4 py-4 sm:px-5'>
          <h3 className='mb-0 font-black'>Low-performing Active Products</h3>

          <p className='mt-1 mb-0 text-xs leading-5 text-[var(--color-muted)]'>
            Up to 5 currently active Products with the lowest units sold in this
            range, including zero-sale Products where applicable.
          </p>
        </header>

        <LowPerformingProductsTable
          products={analytics.products.lowPerforming}
        />
      </section>
    </section>
  );
}

export function AnalyticsCustomersSection({ analytics }) {
  return (
    <section className='mt-12'>
      <AnalyticsSectionHeading
        eyebrow='Customers'
        title='Customer activity'
        description='Current Customer population, registrations in this range, and distinct Customers with recognized purchases.'
      />

      <div className='mt-5 grid gap-x-6 sm:grid-cols-3'>
        <AnalyticsMetric
          label='Total Customers'
          value={analyticsIntegerFormatter.format(
            analytics.customers.totalCustomers,
          )}
          detail='Current registered Customer accounts'
        />

        <AnalyticsMetric
          label='New Customers'
          value={analyticsIntegerFormatter.format(
            analytics.customers.newCustomers,
          )}
          detail='Customer registrations in this range'
        />

        <AnalyticsMetric
          label='Purchasing Customers'
          value={analyticsIntegerFormatter.format(
            analytics.customers.purchasingCustomers,
          )}
          detail='Distinct Customers with recognized paid Orders'
        />
      </div>

      <div className='mt-5'>
        <AnalyticsChartPanel
          title='New Customer Trend'
          description='Customer registrations grouped by the selected Analytics calendar bucket.'>
          <NewCustomerTrendChart data={analytics.customers.newCustomerTrend} />
        </AnalyticsChartPanel>
      </div>
    </section>
  );
}

export function AnalyticsInventorySection({ analytics }) {
  return (
    <section className='mt-12'>
      <AnalyticsSectionHeading
        eyebrow='Current inventory'
        title='Inventory health'
        description='Inventory is a current-state operational view and intentionally does not change when the reporting range changes.'
      />

      <div className='mt-5 grid gap-x-6 sm:grid-cols-2 xl:grid-cols-5'>
        <AnalyticsMetric
          label='In-stock Positions'
          value={analyticsIntegerFormatter.format(
            analytics.inventory.positions.inStock,
          )}
          detail='Purchasable positions above the low-stock threshold'
        />

        <AnalyticsMetric
          label='Low-stock Positions'
          value={analyticsIntegerFormatter.format(
            analytics.inventory.positions.lowStock,
          )}
          detail='Purchasable positions nearing depletion'
          attention={analytics.inventory.positions.lowStock > 0}
        />

        <AnalyticsMetric
          label='Out-of-stock Positions'
          value={analyticsIntegerFormatter.format(
            analytics.inventory.positions.outOfStock,
          )}
          detail='Purchasable positions with zero quantity'
          attention={analytics.inventory.positions.outOfStock > 0}
        />

        <AnalyticsMetric
          label='Low-stock Products'
          value={analyticsIntegerFormatter.format(
            analytics.inventory.products.lowStock,
          )}
          detail='Distinct Products with a low-stock position'
          attention={analytics.inventory.products.lowStock > 0}
        />

        <AnalyticsMetric
          label='Out-of-stock Products'
          value={analyticsIntegerFormatter.format(
            analytics.inventory.products.outOfStock,
          )}
          detail='Distinct Products with an out-of-stock position'
          attention={analytics.inventory.products.outOfStock > 0}
        />
      </div>

      <Link
        to='/admin/inventory'
        className='mt-4 inline-flex text-sm font-semibold underline underline-offset-4'>
        Open Inventory management
      </Link>
    </section>
  );
}

export function AnalyticsRefundsSection({ analytics }) {
  const financial = analytics.refunds.financial;

  const cancellationAndCompensation =
    financial.orderCancellationRefundedAmount +
    financial.systemCompensationRefundedAmount;

  return (
    <section className='mt-12'>
      <AnalyticsSectionHeading
        eyebrow='Refunds'
        title='Refund activity'
        description='Customer-request workflow metrics use request time, while financial totals use provider-confirmed Refund completion time.'
      />

      <div className='mt-5 grid gap-x-6 sm:grid-cols-2 xl:grid-cols-4'>
        <AnalyticsMetric
          label='Customer Requests'
          value={analyticsIntegerFormatter.format(
            analytics.refunds.workflow.totalRequests,
          )}
          detail='Customer Refund requests created in this range'
        />

        <AnalyticsMetric
          label='Provider Refunded'
          value={formatInrFromPaise(financial.totalProviderRefundedAmount)}
          detail='All provider-confirmed Refund origins'
        />

        <AnalyticsMetric
          label='Customer-request Refunds'
          value={formatInrFromPaise(financial.customerRequestRefundedAmount)}
          detail='The only Refund origin that reduces recognized revenue'
        />

        {/*
         * Display-only sum.
         *
         * It must not be reused
         * for revenue or business
         * decisions.
         */}
        <AnalyticsMetric
          label='Cancellation + Compensation'
          value={formatInrFromPaise(cancellationAndCompensation)}
          detail='Displayed for reporting; not deducted again from revenue'
        />
      </div>

      <div className='mt-5 grid gap-5 xl:grid-cols-2'>
        <AnalyticsChartPanel
          title='Refund Workflow'
          description='Current states of Customer requests originally submitted in this reporting range.'
          action={
            <Link
              to='/admin/refunds'
              className='text-xs font-semibold underline underline-offset-4'>
              Refunds
            </Link>
          }>
          <RefundWorkflowTable workflow={analytics.refunds.workflow} />
        </AnalyticsChartPanel>

        <AnalyticsChartPanel
          title='Refund Financial Breakdown'
          description='Provider-confirmed refunded amounts split by origin.'>
          <RefundFinancialBreakdown financial={financial} />
        </AnalyticsChartPanel>

        <AnalyticsChartPanel
          title='Customer Refund Requests Over Time'
          description='Requests are attributed to the period in which the Customer submitted them.'>
          <RefundRequestTrendChart data={analytics.refunds.trend} />
        </AnalyticsChartPanel>

        <AnalyticsChartPanel
          title='Provider Refunds Over Time'
          description='Financial Refund amounts are attributed to provider-confirmed completion time.'>
          <RefundAmountTrendChart data={analytics.refunds.trend} />
        </AnalyticsChartPanel>
      </div>
    </section>
  );
}
