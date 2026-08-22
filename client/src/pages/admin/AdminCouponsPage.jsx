import { Link } from 'react-router';

import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

import { AdminPageHeader } from '../../components/shared/AdminPageHeader.jsx';
import { Pagination } from '../../components/shared/Pagination.jsx';

import { AdminCouponFilters } from '../../features/coupons/components/AdminCouponFilters.jsx';
import { AdminCouponTable } from '../../features/coupons/components/AdminCouponTable.jsx';

import { useAdminCoupons } from '../../features/coupons/hooks/useAdminCoupons.js';

function AdminCouponsPage() {
  const coupons = useAdminCoupons();

  return (
    <main className='p-5 sm:p-6'>
      <AdminPageHeader
        eyebrow='Promotion management'
        title='Coupons'
        description='Create and manage percentage or fixed discounts available to the store.'
        action={
          <Link
            to='/admin/coupons/new'
            className='inline-flex min-h-10 items-center bg-[var(--color-ink)] px-4 text-sm font-bold text-white'>
            Add Coupon
          </Link>
        }
      />

      {coupons.message ? (
        <Alert variant='success' className='mt-6'>
          {coupons.message}
        </Alert>
      ) : null}

      <AdminCouponFilters model={coupons} />

      {coupons.error ? (
        <Alert
          variant='danger'
          title='Coupon operation failed'
          className='mt-6'>
          {coupons.error.message}
        </Alert>
      ) : null}

      {coupons.loading ? (
        <div className='mt-6 space-y-3'>
          <Skeleton className='h-16 w-full' />
          <Skeleton className='h-16 w-full' />
          <Skeleton className='h-16 w-full' />
        </div>
      ) : null}

      {!coupons.loading && coupons.error && coupons.coupons.length === 0 ? (
        <Button type='button' className='mt-5' onClick={coupons.loadCoupons}>
          Try again
        </Button>
      ) : null}

      {!coupons.loading && !coupons.error && coupons.coupons.length === 0 ? (
        <section className='mt-6 border-y border-[var(--color-border)] py-14 text-center'>
          <h2 className='mb-0 text-2xl font-black'>
            {coupons.filtersActive ? 'No matching Coupons' : 'No Coupons yet'}
          </h2>

          <p className='mt-3 mb-0 text-sm text-[var(--color-muted)]'>
            {coupons.filtersActive
              ? 'Try changing or clearing the current filters.'
              : 'Create your first Coupon to start configuring store promotions.'}
          </p>
        </section>
      ) : null}

      {!coupons.loading && coupons.coupons.length > 0 ? (
        <>
          <div className='mt-6'>
            <AdminCouponTable model={coupons} />
          </div>

          <Pagination
            page={coupons.meta.page}
            totalPages={coupons.meta.totalPages}
            totalItems={coupons.meta.totalItems}
            itemLabel='coupon'
            loading={coupons.loading}
            onPageChange={coupons.changePage}
          />
        </>
      ) : null}
    </main>
  );
}

export default AdminCouponsPage;
