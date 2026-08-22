import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

import { AdminPageHeader } from '../../components/shared/AdminPageHeader.jsx';
import { Pagination } from '../../components/shared/Pagination.jsx';

import { AdminRefundFilters } from '../../features/refunds/components/AdminRefundFilters.jsx';
import { AdminRefundTable } from '../../features/refunds/components/AdminRefundTable.jsx';

import { useAdminRefunds } from '../../features/refunds/hooks/useAdminRefunds.js';

function AdminRefundsPage() {
  const refunds = useAdminRefunds();

  return (
    <main className='p-5 sm:p-6'>
      <AdminPageHeader
        eyebrow='Refund management'
        title='Refunds'
        description='Review Refund history, inspect operational context and process Customer requests awaiting an Admin decision.'
      />

      <AdminRefundFilters model={refunds} />

      {refunds.error ? (
        <Alert variant='danger' title='Unable to load Refunds' className='mt-6'>
          {refunds.error.message}
        </Alert>
      ) : null}

      {refunds.loading ? (
        <div className='mt-6 space-y-3'>
          <Skeleton className='h-24 w-full' />
          <Skeleton className='h-24 w-full' />
          <Skeleton className='h-24 w-full' />
        </div>
      ) : null}

      {!refunds.loading && refunds.error ? (
        <Button type='button' onClick={refunds.loadRefunds} className='mt-5'>
          Try again
        </Button>
      ) : null}

      {!refunds.loading && !refunds.error && refunds.refunds.length === 0 ? (
        <section className='mt-6 border-y border-[var(--color-border)] py-14 text-center'>
          <h2 className='mb-0 text-2xl font-black tracking-[-0.03em]'>
            {refunds.filtersActive ? 'No matching Refunds' : 'No Refunds yet'}
          </h2>

          <p className='mx-auto mt-3 mb-0 max-w-md text-sm leading-6 text-[var(--color-muted)]'>
            {refunds.filtersActive
              ? 'Try changing or clearing the current filters.'
              : 'Refund activity will appear here when it is created.'}
          </p>

          {refunds.filtersActive ? (
            <Button
              type='button'
              variant='secondary'
              className='mt-5'
              onClick={refunds.resetFilters}>
              Clear filters
            </Button>
          ) : null}
        </section>
      ) : null}

      {!refunds.loading && refunds.refunds.length > 0 ? (
        <>
          <div className='mt-6'>
            <AdminRefundTable refunds={refunds.refunds} />
          </div>

          <Pagination
            page={refunds.meta.page}
            totalPages={refunds.meta.totalPages}
            totalItems={refunds.meta.totalItems}
            itemLabel='refund'
            loading={refunds.loading}
            onPageChange={refunds.changePage}
          />
        </>
      ) : null}
    </main>
  );
}

export default AdminRefundsPage;
