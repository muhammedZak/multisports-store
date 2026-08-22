import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

import { AdminPageHeader } from '../../components/shared/AdminPageHeader.jsx';
import { Pagination } from '../../components/shared/Pagination.jsx';

import { AdminReviewFilters } from '../../features/reviews/components/AdminReviewFilters.jsx';
import { AdminReviewList } from '../../features/reviews/components/AdminReviewList.jsx';

import { useAdminReviews } from '../../features/reviews/hooks/useAdminReviews.js';

function AdminReviewsPage() {
  const reviews = useAdminReviews();

  return (
    <main className='p-5 sm:p-6'>
      <AdminPageHeader
        eyebrow='Review management'
        title='Reviews'
        description='Inspect Customer Reviews and moderate storefront visibility. Customer rating and Review text remain Customer-owned.'
      />

      <AdminReviewFilters model={reviews} />

      {reviews.error ? (
        <Alert variant='danger' title='Unable to load Reviews' className='mt-6'>
          {reviews.error.message}
        </Alert>
      ) : null}

      {reviews.loading ? (
        <div className='mt-6 space-y-3'>
          <Skeleton className='h-24 w-full' />
          <Skeleton className='h-24 w-full' />
          <Skeleton className='h-24 w-full' />
        </div>
      ) : null}

      {!reviews.loading && reviews.error && reviews.reviews.length === 0 ? (
        <Button type='button' onClick={reviews.loadReviews} className='mt-5'>
          Try again
        </Button>
      ) : null}

      {!reviews.loading && !reviews.error && reviews.reviews.length === 0 ? (
        <section className='mt-6 border-y border-[var(--color-border)] py-14 text-center'>
          <h2 className='mb-0 text-2xl font-black tracking-[-0.03em]'>
            {reviews.filtersActive ? 'No matching Reviews' : 'No Reviews yet'}
          </h2>

          <p className='mx-auto mt-3 mb-0 max-w-md text-sm leading-6 text-[var(--color-muted)]'>
            {reviews.filtersActive
              ? 'Try changing or clearing the Review filters.'
              : 'Customer Reviews will appear here after submission.'}
          </p>

          {reviews.filtersActive ? (
            <Button
              type='button'
              variant='secondary'
              className='mt-5'
              onClick={reviews.resetFilters}>
              Clear filters
            </Button>
          ) : null}
        </section>
      ) : null}

      {!reviews.loading && reviews.reviews.length > 0 ? (
        <>
          <div className='mt-6'>
            <AdminReviewList reviews={reviews.reviews} />
          </div>

          <Pagination
            page={reviews.meta.page}
            totalPages={reviews.meta.totalPages}
            totalItems={reviews.meta.totalItems}
            itemLabel='review'
            loading={reviews.loading}
            onPageChange={reviews.changePage}
          />
        </>
      ) : null}
    </main>
  );
}

export default AdminReviewsPage;
