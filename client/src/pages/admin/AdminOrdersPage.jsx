import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

import { AdminPageHeader } from '../../components/shared/AdminPageHeader.jsx';
import { Pagination } from '../../components/shared/Pagination.jsx';

import { AdminOrderFilters } from '../../features/orders/components/AdminOrderFilters.jsx';
import { AdminOrderTable } from '../../features/orders/components/AdminOrderTable.jsx';

import { useAdminOrders } from '../../features/orders/hooks/useAdminOrders.js';

function AdminOrdersPage() {
  const orders = useAdminOrders();

  return (
    <main className='p-5 sm:p-6'>
      <AdminPageHeader
        eyebrow='Order management'
        title='Orders'
        description='Review Customer Orders, Payment status, fulfillment state and historical purchase details.'
      />

      <AdminOrderFilters model={orders} />

      {orders.error ? (
        <Alert variant='danger' title='Unable to load Orders' className='mt-6'>
          {orders.error.message}
        </Alert>
      ) : null}

      {orders.loading ? (
        <div className='mt-6 space-y-3'>
          <Skeleton className='h-20 w-full' />
          <Skeleton className='h-20 w-full' />
          <Skeleton className='h-20 w-full' />
        </div>
      ) : null}

      {!orders.loading && orders.error && orders.orders.length === 0 ? (
        <Button type='button' onClick={orders.loadOrders} className='mt-5'>
          Try again
        </Button>
      ) : null}

      {!orders.loading && !orders.error && orders.orders.length === 0 ? (
        <section className='mt-6 border-y border-[var(--color-border)] py-14 text-center'>
          <h2 className='mb-0 text-2xl font-black tracking-[-0.03em]'>
            {orders.filtersActive ? 'No matching Orders' : 'No Orders yet'}
          </h2>

          <p className='mx-auto mt-3 mb-0 max-w-md text-sm leading-6 text-[var(--color-muted)]'>
            {orders.filtersActive
              ? 'Try changing or clearing the current filters.'
              : 'Customer Orders will appear here after successful Order placement.'}
          </p>

          {orders.filtersActive ? (
            <Button
              type='button'
              variant='secondary'
              className='mt-5'
              onClick={orders.resetFilters}>
              Clear filters
            </Button>
          ) : null}
        </section>
      ) : null}

      {!orders.loading && orders.orders.length > 0 ? (
        <>
          <div className='mt-6'>
            <AdminOrderTable orders={orders.orders} />
          </div>

          <Pagination
            page={orders.meta.page}
            totalPages={orders.meta.totalPages}
            totalItems={orders.meta.totalItems}
            itemLabel='order'
            loading={orders.loading}
            onPageChange={orders.changePage}
          />
        </>
      ) : null}
    </main>
  );
}

export default AdminOrdersPage;
