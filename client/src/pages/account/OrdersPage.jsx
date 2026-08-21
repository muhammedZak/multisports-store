import { Link } from 'react-router';

import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

import { Pagination } from '../../components/shared/Pagination.jsx';

import { AccountPageHeader } from '../../features/account/components/AccountPageHeader.jsx';

import { ORDER_STATUS_OPTIONS } from '../../features/orders/order.constants.js';

import { OrderHistoryCard } from '../../features/orders/components/OrderHistoryCard.jsx';

import { useMyOrders } from '../../features/orders/hooks/useMyOrders.js';

function OrdersPage() {
  const orders = useMyOrders();

  return (
    <div className='max-w-5xl'>
      <AccountPageHeader
        title='My orders'
        description='Review your purchases, payment status and current fulfillment progress.'
      />

      <form
        onSubmit={orders.applyFilters}
        className='mt-7 grid gap-4 border-y border-[var(--color-border)] py-5 sm:grid-cols-2'>
        <Select
          id='order-status'
          name='status'
          label='Order status'
          value={orders.filterForm.status}
          onChange={orders.handleFilterChange}>
          {ORDER_STATUS_OPTIONS.map((option) => (
            <option key={option.value || 'all'} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <Select
          id='order-date-order'
          name='order'
          label='Date order'
          value={orders.filterForm.order}
          onChange={orders.handleFilterChange}>
          <option value='desc'>Newest first</option>

          <option value='asc'>Oldest first</option>
        </Select>

        <div className='flex flex-wrap gap-3 sm:col-span-2'>
          <Button type='submit' disabled={orders.loading}>
            Apply filters
          </Button>

          <Button
            type='button'
            variant='secondary'
            disabled={orders.loading}
            onClick={orders.resetFilters}>
            Reset
          </Button>
        </div>
      </form>

      {orders.error ? (
        <Alert variant='danger' title='Unable to load orders' className='mt-6'>
          {orders.error.message}
        </Alert>
      ) : null}

      {orders.loading ? (
        <div className='mt-8 space-y-8'>
          {Array.from({
            length: 3,
          }).map((_, index) => (
            <div
              key={index}
              className='border-b border-[var(--color-border)] pb-7'>
              <Skeleton className='h-4 w-36' />
              <Skeleton className='mt-3 h-5 w-56' />
              <Skeleton className='mt-5 h-20 w-full' />
            </div>
          ))}
        </div>
      ) : null}

      {!orders.loading && orders.error && orders.orders.length === 0 ? (
        <Button type='button' onClick={orders.loadOrders} className='mt-5'>
          Try again
        </Button>
      ) : null}

      {!orders.loading && !orders.error && orders.orders.length === 0 ? (
        <section className='mt-8 border-y border-[var(--color-border)] py-14 text-center'>
          <p className='mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]'>
            Orders
          </p>

          <h2 className='mb-0 text-2xl font-black tracking-[-0.03em]'>
            {orders.filtersActive ? 'No matching orders' : 'No orders yet'}
          </h2>

          <p className='mx-auto mt-3 mb-0 max-w-md text-sm leading-6 text-[var(--color-muted)]'>
            {orders.filtersActive
              ? 'No orders match the selected status.'
              : 'Orders you place will appear here with their payment and fulfillment status.'}
          </p>

          {orders.filtersActive ? (
            <Button
              type='button'
              variant='secondary'
              onClick={orders.resetFilters}
              className='mt-5'>
              Clear filters
            </Button>
          ) : (
            <Link
              to='/shop'
              className='mt-5 inline-flex min-h-11 items-center border border-[var(--color-ink)] bg-[var(--color-ink)] px-5 text-sm font-bold text-white'>
              Start shopping
            </Link>
          )}
        </section>
      ) : null}

      {!orders.loading && orders.orders.length > 0 ? (
        <>
          <section className='mt-8 border-y border-[var(--color-border)] py-6'>
            {orders.orders.map((order) => (
              <OrderHistoryCard key={order.id} order={order} />
            ))}
          </section>

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
    </div>
  );
}

export default OrdersPage;
