import { Link } from 'react-router';

import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

import { Pagination } from '../../components/shared/Pagination.jsx';

import { AccountPageHeader } from '../../features/account/components/AccountPageHeader.jsx';

import { RefundHistoryCard } from '../../features/refunds/components/RefundHistoryCard.jsx';

import { useMyRefunds } from '../../features/refunds/hooks/useMyRefunds.js';

function RefundsPage() {
  const refunds = useMyRefunds();

  return (
    <div className='max-w-5xl'>
      <AccountPageHeader
        title='My Refunds'
        description='Track Customer requests, Order-cancellation Refunds and system compensation in one history.'
      />

      <form
        onSubmit={refunds.applyFilters}
        className='mt-7 grid gap-4 border-y border-[var(--color-border)] py-5 md:grid-cols-3'>
        <Select
          id='refund-status'
          name='status'
          label='Refund status'
          value={refunds.filterForm.status}
          onChange={refunds.handleFilterChange}>
          <option value=''>All statuses</option>

          <option value='requested'>Requested</option>

          <option value='approved'>Approved</option>

          <option value='rejected'>Rejected</option>

          <option value='processing'>Processing</option>

          <option value='refunded'>Refunded</option>

          <option value='failed'>Failed</option>
        </Select>

        <Select
          id='refund-origin'
          name='origin'
          label='Refund origin'
          value={refunds.filterForm.origin}
          onChange={refunds.handleFilterChange}>
          <option value=''>All origins</option>

          <option value='customer_request'>Customer request</option>

          <option value='order_cancellation'>Order cancellation</option>

          <option value='system_compensation'>System compensation</option>
        </Select>

        <Select
          id='refund-date-order'
          name='order'
          label='Date order'
          value={refunds.filterForm.order}
          onChange={refunds.handleFilterChange}>
          <option value='desc'>Newest first</option>

          <option value='asc'>Oldest first</option>
        </Select>

        <div className='flex flex-wrap gap-3 md:col-span-3'>
          <Button type='submit' disabled={refunds.loading}>
            Apply filters
          </Button>

          <Button
            type='button'
            variant='secondary'
            disabled={refunds.loading}
            onClick={refunds.resetFilters}>
            Reset
          </Button>
        </div>
      </form>

      {refunds.error ? (
        <Alert variant='danger' title='Unable to load Refunds' className='mt-6'>
          {refunds.error.message}
        </Alert>
      ) : null}

      {refunds.loading ? (
        <div className='mt-8 space-y-7'>
          {Array.from({
            length: 3,
          }).map((_, index) => (
            <div
              key={index}
              className='border-b border-[var(--color-border)] pb-7'>
              <Skeleton className='h-4 w-48' />
              <Skeleton className='mt-3 h-6 w-28' />
              <Skeleton className='mt-5 h-20 w-full' />
            </div>
          ))}
        </div>
      ) : null}

      {!refunds.loading && refunds.error && refunds.refunds.length === 0 ? (
        <Button type='button' onClick={refunds.loadRefunds} className='mt-5'>
          Try again
        </Button>
      ) : null}

      {!refunds.loading && !refunds.error && refunds.refunds.length === 0 ? (
        <section className='mt-8 border-y border-[var(--color-border)] py-14 text-center'>
          <h2 className='mb-0 text-2xl font-black tracking-[-0.03em]'>
            {refunds.filtersActive ? 'No matching Refunds' : 'No Refunds yet'}
          </h2>

          <p className='mx-auto mt-3 mb-0 max-w-md text-sm leading-6 text-[var(--color-muted)]'>
            {refunds.filtersActive
              ? 'No Refunds match the selected status and origin.'
              : 'Refund activity connected to your account will appear here.'}
          </p>

          {refunds.filtersActive ? (
            <Button
              type='button'
              variant='secondary'
              onClick={refunds.resetFilters}
              className='mt-5'>
              Clear filters
            </Button>
          ) : (
            <Link
              to='/account/orders'
              className='mt-5 inline-flex min-h-11 items-center border border-[var(--color-ink)] bg-[var(--color-ink)] px-5 text-sm font-bold text-white'>
              View my Orders
            </Link>
          )}
        </section>
      ) : null}

      {!refunds.loading && refunds.refunds.length > 0 ? (
        <>
          <section className='mt-8 border-y border-[var(--color-border)] py-6'>
            {refunds.refunds.map((refund) => (
              <RefundHistoryCard key={refund.id} refund={refund} />
            ))}
          </section>

          <Pagination
            page={refunds.meta.page}
            totalPages={refunds.meta.totalPages}
            totalItems={refunds.meta.totalItems}
            itemLabel='Refund'
            loading={refunds.loading}
            onPageChange={refunds.changePage}
          />
        </>
      ) : null}
    </div>
  );
}

export default RefundsPage;
