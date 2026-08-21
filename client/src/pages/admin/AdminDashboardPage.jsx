import { useCallback, useEffect, useState } from 'react';

import { Link } from 'react-router';

import { fetchAdminDashboard } from '../../api/dashboardApi.js';
import { normalizeApiError } from '../../api/errors.js';

import { formatInrFromPaise } from '../../utils/money.js';

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatDate(value) {
  if (!value) {
    return '—';
  }

  return dateFormatter.format(new Date(value));
}

function formatLabel(value) {
  if (!value) {
    return 'Unknown';
  }

  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getOrderStatusClass(status) {
  const classes = {
    placed: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-indigo-100 text-indigo-700',
    processing: 'bg-amber-100 text-amber-700',
    shipped: 'bg-purple-100 text-purple-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  return classes[status] ?? 'bg-neutral-100 text-neutral-700';
}

function formatVariantOptions(variant) {
  if (!variant) {
    return 'Simple product';
  }

  const options = Object.entries(variant.options ?? {});

  if (options.length === 0) {
    return 'Variant';
  }

  return options
    .map(([name, value]) => `${name}: ${String(value)}`)
    .join(' · ');
}

function MetricCard({ label, value, detail, to, attention = false }) {
  const content = (
    <>
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
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className='block border border-neutral-200 bg-white p-5 transition hover:border-neutral-400 hover:bg-neutral-50'>
        {content}

        <span className='mt-4 inline-block text-xs font-medium underline underline-offset-4'>
          View details
        </span>
      </Link>
    );
  }

  return (
    <div className='border border-neutral-200 bg-white p-5'>{content}</div>
  );
}

function EmptyPreview({ message }) {
  return (
    <div className='px-4 py-8 text-center text-sm text-neutral-500'>
      {message}
    </div>
  );
}

function InventoryPreviewItem({ inventory }) {
  return (
    <article className='border-t border-neutral-200 px-4 py-4 first:border-t-0'>
      <div className='flex items-start justify-between gap-4'>
        <div className='min-w-0'>
          <p className='font-medium'>{inventory.product.name}</p>

          <p className='mt-1 text-xs text-neutral-500'>
            {inventory.product.brand} · {formatLabel(inventory.product.sport)}
          </p>

          <p className='mt-2 text-xs text-neutral-600'>
            {formatVariantOptions(inventory.variant)}
          </p>
        </div>

        <div className='shrink-0 text-right'>
          <p className='text-xs text-neutral-500'>Quantity</p>

          <p
            className={[
              'mt-1 text-lg font-semibold',
              inventory.stockState === 'out_of_stock'
                ? 'text-red-700'
                : 'text-amber-700',
            ].join(' ')}>
            {inventory.quantity}
          </p>
        </div>
      </div>

      <Link
        to={`/admin/inventory/${inventory.id}`}
        className='mt-4 inline-flex text-sm font-medium underline underline-offset-4'>
        View inventory
      </Link>
    </article>
  );
}

function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchAdminDashboard();

      setDashboard(data);
    } catch (requestError) {
      setDashboard(null);

      setError(
        normalizeApiError(
          requestError,
          'Unable to load the Admin Dashboard. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <main className='p-5 sm:p-6'>
      <div>
        <p className='text-sm font-medium uppercase tracking-[0.2em] text-neutral-500'>
          Store overview
        </p>

        <h1 className='mt-3 text-3xl font-semibold'>Dashboard</h1>

        <p className='mt-3 max-w-2xl text-sm leading-6 text-neutral-600'>
          Monitor current store performance and the operational areas that need
          Admin attention.
        </p>
      </div>

      {loading && (
        <section className='mt-8 border border-neutral-200 p-8 text-sm text-neutral-600'>
          Loading Dashboard...
        </section>
      )}

      {!loading && error && (
        <section className='mt-8 border border-red-200 bg-red-50 p-5'>
          <p role='alert' className='text-sm text-red-700'>
            {error.message}
          </p>

          <button
            type='button'
            onClick={loadDashboard}
            className='mt-4 bg-black px-4 py-2.5 text-sm font-medium text-white'>
            Try again
          </button>
        </section>
      )}

      {!loading && !error && dashboard && (
        <>
          {/* Primary business KPIs */}
          <section className='mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
            <MetricCard
              label='Revenue'
              value={formatInrFromPaise(dashboard.kpis.totalRevenue)}
              detail='Recognized net revenue'
              to='/admin/orders'
            />

            <MetricCard
              label='Orders'
              value={dashboard.kpis.totalOrders}
              detail='All placed Orders'
              to='/admin/orders'
            />

            {/*
             * There is no Admin Customer-management route in the
             * current React router. Keep this KPI informational
             * instead of fabricating /admin/customers.
             */}
            <MetricCard
              label='Customers'
              value={dashboard.kpis.totalCustomers}
              detail='Registered Customer accounts'
            />

            <MetricCard
              label='Products'
              value={dashboard.kpis.totalProducts}
              detail={`${dashboard.kpis.activeProducts} active Products`}
              to='/admin/products'
            />
          </section>

          {/* Operational attention KPIs */}
          <section className='mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
            <MetricCard
              label='Pending Orders'
              value={dashboard.kpis.pendingOrders}
              detail='Placed, confirmed, or processing'
              to='/admin/orders'
            />

            <MetricCard
              label='Low Stock'
              value={dashboard.kpis.lowStockProducts}
              detail='Products requiring stock attention'
              to='/admin/inventory'
              attention={dashboard.kpis.lowStockProducts > 0}
            />

            <MetricCard
              label='Out of Stock'
              value={dashboard.kpis.outOfStockProducts}
              detail='Currently unavailable Products'
              to='/admin/inventory'
              attention={dashboard.kpis.outOfStockProducts > 0}
            />

            <MetricCard
              label='Refund Requests'
              value={dashboard.kpis.refundRequests}
              detail='Customer requests awaiting a decision'
              to='/admin/refunds'
              attention={dashboard.kpis.refundRequests > 0}
            />
          </section>

          {/* Recent Orders */}
          <section className='mt-8 border border-neutral-200'>
            <div className='flex items-center justify-between gap-4 border-b border-neutral-200 px-4 py-4 sm:px-5'>
              <div>
                <h2 className='font-semibold'>Recent Orders</h2>

                <p className='mt-1 text-xs text-neutral-500'>
                  Latest customer Orders by placement time.
                </p>
              </div>

              <Link
                to='/admin/orders'
                className='shrink-0 text-sm font-medium underline underline-offset-4'>
                View all
              </Link>
            </div>

            {dashboard.recentOrders.length === 0 ? (
              <EmptyPreview message='No Orders have been placed yet.' />
            ) : (
              <div>
                {dashboard.recentOrders.map((order) => (
                  <article
                    key={order.id}
                    className='flex flex-col gap-4 border-t border-neutral-200 px-4 py-4 first:border-t-0 sm:flex-row sm:items-center sm:justify-between sm:px-5'>
                    <div className='min-w-0'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <p className='break-all font-medium'>
                          {order.orderNumber}
                        </p>

                        <span
                          className={[
                            'inline-flex px-2.5 py-1 text-xs font-medium',
                            getOrderStatusClass(order.orderStatus),
                          ].join(' ')}>
                          {formatLabel(order.orderStatus)}
                        </span>
                      </div>

                      <p className='mt-2 text-xs text-neutral-500'>
                        {formatDate(order.placedAt)}
                      </p>
                    </div>

                    <div className='flex shrink-0 items-center justify-between gap-5 sm:justify-end'>
                      <p className='font-semibold'>
                        {formatInrFromPaise(order.totalAmount)}
                      </p>

                      <Link
                        to={`/admin/orders/${order.id}`}
                        className='text-sm font-medium underline underline-offset-4'>
                        View
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Operational previews */}
          <div className='mt-5 grid gap-5 xl:grid-cols-3'>
            {/* Low Stock */}
            <section className='border border-neutral-200'>
              <div className='flex items-start justify-between gap-4 border-b border-neutral-200 px-4 py-4'>
                <div>
                  <h2 className='font-semibold'>Low Stock</h2>

                  <p className='mt-1 text-xs text-neutral-500'>
                    Purchasable inventory nearing depletion.
                  </p>
                </div>

                <Link
                  to='/admin/inventory'
                  className='shrink-0 text-xs font-medium underline underline-offset-4'>
                  Inventory
                </Link>
              </div>

              {dashboard.lowStockItems.length === 0 ? (
                <EmptyPreview message='No low-stock inventory requires attention.' />
              ) : (
                <div>
                  {dashboard.lowStockItems.map((inventory) => (
                    <InventoryPreviewItem
                      key={inventory.id}
                      inventory={inventory}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Out of Stock */}
            <section className='border border-neutral-200'>
              <div className='flex items-start justify-between gap-4 border-b border-neutral-200 px-4 py-4'>
                <div>
                  <h2 className='font-semibold'>Out of Stock</h2>

                  <p className='mt-1 text-xs text-neutral-500'>
                    Purchasable inventory currently unavailable.
                  </p>
                </div>

                <Link
                  to='/admin/inventory'
                  className='shrink-0 text-xs font-medium underline underline-offset-4'>
                  Inventory
                </Link>
              </div>

              {dashboard.outOfStockItems.length === 0 ? (
                <EmptyPreview message='No inventory is currently out of stock.' />
              ) : (
                <div>
                  {dashboard.outOfStockItems.map((inventory) => (
                    <InventoryPreviewItem
                      key={inventory.id}
                      inventory={inventory}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Refund Requests */}
            <section className='border border-neutral-200'>
              <div className='flex items-start justify-between gap-4 border-b border-neutral-200 px-4 py-4'>
                <div>
                  <h2 className='font-semibold'>Recent Refund Requests</h2>

                  <p className='mt-1 text-xs text-neutral-500'>
                    Customer requests awaiting Admin review.
                  </p>
                </div>

                <Link
                  to='/admin/refunds'
                  className='shrink-0 text-xs font-medium underline underline-offset-4'>
                  Refunds
                </Link>
              </div>

              {dashboard.refundRequests.length === 0 ? (
                <EmptyPreview message='No Customer refund requests are awaiting review.' />
              ) : (
                <div>
                  {dashboard.refundRequests.map((refund) => (
                    <article
                      key={refund.id}
                      className='border-t border-neutral-200 px-4 py-4 first:border-t-0'>
                      <div className='flex items-start justify-between gap-4'>
                        <div className='min-w-0'>
                          <span className='inline-flex bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700'>
                            {formatLabel(refund.status)}
                          </span>

                          <p className='mt-3 text-sm leading-6 text-neutral-700'>
                            {refund.reason}
                          </p>

                          <p className='mt-2 text-xs text-neutral-500'>
                            {formatDate(refund.requestedAt)}
                          </p>
                        </div>

                        <p className='shrink-0 font-semibold'>
                          {formatInrFromPaise(refund.amount)}
                        </p>
                      </div>

                      <Link
                        to={`/admin/refunds/${refund.id}`}
                        className='mt-4 inline-flex text-sm font-medium underline underline-offset-4'>
                        Review request
                      </Link>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </main>
  );
}

export default AdminDashboardPage;
