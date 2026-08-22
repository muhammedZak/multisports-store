import { Link } from 'react-router';

import { Alert } from '../../components/ui/Alert.jsx';

import { Button } from '../../components/ui/Button.jsx';

import { Skeleton } from '../../components/ui/Skeleton.jsx';

import { AdminPageHeader } from '../../components/shared/AdminPageHeader.jsx';

import { DashboardMetric } from '../../features/dashboard/components/DashboardMetric.jsx';

import {
  DashboardInventoryPreview,
  DashboardRefundRequestsPreview,
  RecentOrdersPreview,
} from '../../features/dashboard/components/DashboardPreviews.jsx';

import { useAdminDashboard } from '../../features/dashboard/hooks/useAdminDashboard.js';

import { formatInrFromPaise } from '../../utils/money.js';

function AdminDashboardPage() {
  const dashboardState = useAdminDashboard();

  if (dashboardState.loading) {
    return (
      <main className='p-5 sm:p-6'>
        <AdminPageHeader
          eyebrow='Store overview'
          title='Dashboard'
          description='Monitor current store performance and operational areas that need Admin attention.'
        />

        <div className='mt-8 space-y-4'>
          <Skeleton className='h-24 w-full' />
          <Skeleton className='h-24 w-full' />
          <Skeleton className='h-72 w-full' />
        </div>
      </main>
    );
  }

  if (dashboardState.error || !dashboardState.dashboard) {
    return (
      <main className='p-5 sm:p-6'>
        <AdminPageHeader
          eyebrow='Store overview'
          title='Dashboard'
          description='Monitor current store performance and operational areas that need Admin attention.'
        />

        <Alert
          variant='danger'
          title='Unable to load Dashboard'
          className='mt-8'>
          {dashboardState.error?.message}
        </Alert>

        <Button
          type='button'
          className='mt-5'
          onClick={dashboardState.loadDashboard}>
          Try again
        </Button>
      </main>
    );
  }

  const { dashboard } = dashboardState;

  return (
    <main className='p-5 sm:p-6'>
      <AdminPageHeader
        eyebrow='Store overview'
        title='Dashboard'
        description='Monitor current store performance and operational areas that need Admin attention.'
        action={
          <Link
            to='/admin/analytics'
            className='inline-flex min-h-10 items-center border border-[var(--color-border-strong)] px-4 text-sm font-semibold hover:border-[var(--color-ink)]'>
            Open Analytics
          </Link>
        }
      />

      <section className='mt-8'>
        <div>
          <h2 className='mb-0 text-lg font-black'>Business performance</h2>

          <p className='mt-2 mb-0 text-sm text-[var(--color-muted)]'>
            Current store-level KPIs derived by the backend.
          </p>
        </div>

        <div className='mt-5 grid gap-x-6 sm:grid-cols-2 xl:grid-cols-4'>
          <DashboardMetric
            label='Revenue'
            value={formatInrFromPaise(dashboard.kpis.totalRevenue)}
            detail='Recognized net revenue'
            to='/admin/orders'
          />

          <DashboardMetric
            label='Orders'
            value={dashboard.kpis.totalOrders}
            detail='All placed Orders'
            to='/admin/orders'
          />

          {/*
           * No Admin Customer
           * management route exists.
           * Keep this metric
           * informational.
           */}
          <DashboardMetric
            label='Customers'
            value={dashboard.kpis.totalCustomers}
            detail='Registered Customer accounts'
          />

          <DashboardMetric
            label='Products'
            value={dashboard.kpis.totalProducts}
            detail={`${dashboard.kpis.activeProducts} active Products`}
            to='/admin/products'
          />
        </div>
      </section>

      <section className='mt-10'>
        <div>
          <h2 className='mb-0 text-lg font-black'>Needs attention</h2>

          <p className='mt-2 mb-0 text-sm text-[var(--color-muted)]'>
            Current operational work that may require Admin action.
          </p>
        </div>

        <div className='mt-5 grid gap-x-6 sm:grid-cols-2 xl:grid-cols-4'>
          <DashboardMetric
            label='Pending Orders'
            value={dashboard.kpis.pendingOrders}
            detail='Placed, confirmed, or processing'
            to='/admin/orders'
          />

          <DashboardMetric
            label='Low Stock'
            value={dashboard.kpis.lowStockProducts}
            detail='Products requiring stock attention'
            to='/admin/inventory'
            attention={dashboard.kpis.lowStockProducts > 0}
          />

          <DashboardMetric
            label='Out of Stock'
            value={dashboard.kpis.outOfStockProducts}
            detail='Currently unavailable Products'
            to='/admin/inventory'
            attention={dashboard.kpis.outOfStockProducts > 0}
          />

          <DashboardMetric
            label='Refund Requests'
            value={dashboard.kpis.refundRequests}
            detail='Customer requests awaiting a decision'
            to='/admin/refunds'
            attention={dashboard.kpis.refundRequests > 0}
          />
        </div>
      </section>

      <div className='mt-10'>
        <RecentOrdersPreview orders={dashboard.recentOrders} />
      </div>

      <div className='mt-6 grid gap-6 xl:grid-cols-3'>
        <DashboardInventoryPreview
          title='Low Stock'
          description='Purchasable Inventory nearing depletion.'
          items={dashboard.lowStockItems}
          emptyMessage='No low-stock Inventory requires attention.'
        />

        <DashboardInventoryPreview
          title='Out of Stock'
          description='Purchasable Inventory currently unavailable.'
          items={dashboard.outOfStockItems}
          emptyMessage='No Inventory is currently out of stock.'
        />

        <DashboardRefundRequestsPreview refunds={dashboard.refundRequests} />
      </div>
    </main>
  );
}

export default AdminDashboardPage;
