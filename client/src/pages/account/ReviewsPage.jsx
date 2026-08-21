import { Link } from 'react-router';

import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

import { Pagination } from '../../components/shared/Pagination.jsx';

import { AccountPageHeader } from '../../features/account/components/AccountPageHeader.jsx';

import { ReviewCard } from '../../features/reviews/components/ReviewCard.jsx';

import { useMyReviews } from '../../features/reviews/hooks/useMyReviews.js';

function ReviewsPage() {
  const reviews = useMyReviews();

  return (
    <div className='max-w-5xl'>
      <AccountPageHeader
        title='My reviews'
        description='View, edit or delete the Product Reviews you have submitted.'
      />

      <form
        onSubmit={reviews.applyFilters}
        className='mt-7 grid gap-4 border-y border-[var(--color-border)] py-5 sm:grid-cols-2'>
        <Select
          id='review-status'
          name='moderationStatus'
          label='Review status'
          value={reviews.filterForm.moderationStatus}
          onChange={reviews.handleFilterChange}>
          <option value=''>All reviews</option>

          <option value='visible'>Visible</option>

          <option value='hidden'>Hidden</option>
        </Select>

        <Select
          id='review-date-order'
          name='order'
          label='Date order'
          value={reviews.filterForm.order}
          onChange={reviews.handleFilterChange}>
          <option value='desc'>Newest first</option>

          <option value='asc'>Oldest first</option>
        </Select>

        <div className='flex flex-wrap gap-3 sm:col-span-2'>
          <Button type='submit' disabled={reviews.loading}>
            Apply filters
          </Button>

          <Button
            type='button'
            variant='secondary'
            disabled={reviews.loading}
            onClick={reviews.resetFilters}>
            Reset
          </Button>
        </div>
      </form>

      {reviews.actionError ? (
        <Alert variant='danger' className='mt-6'>
          {reviews.actionError.message}
        </Alert>
      ) : null}

      {reviews.error ? (
        <Alert variant='danger' title='Unable to load reviews' className='mt-6'>
          {reviews.error.message}
        </Alert>
      ) : null}

      {reviews.loading ? (
        <div className='mt-8 space-y-7'>
          {Array.from({
            length: 3,
          }).map((_, index) => (
            <div
              key={index}
              className='border-b border-[var(--color-border)] pb-7'>
              <div className='flex gap-4'>
                <Skeleton className='size-20' />

                <div className='flex-1'>
                  <Skeleton className='h-5 w-48' />
                  <Skeleton className='mt-4 h-4 w-full' />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {!reviews.loading && reviews.error && reviews.reviews.length === 0 ? (
        <Button type='button' onClick={reviews.loadReviews} className='mt-5'>
          Try again
        </Button>
      ) : null}

      {!reviews.loading && !reviews.error && reviews.reviews.length === 0 ? (
        <section className='mt-8 border-y border-[var(--color-border)] py-14 text-center'>
          <h2 className='mb-0 text-2xl font-black tracking-[-0.03em]'>
            {reviews.filtersActive ? 'No matching reviews' : 'No reviews yet'}
          </h2>

          <p className='mx-auto mt-3 mb-0 max-w-md text-sm leading-6 text-[var(--color-muted)]'>
            {reviews.filtersActive
              ? 'No Reviews match the selected status.'
              : 'Reviews you submit for purchased Products will appear here.'}
          </p>

          {reviews.filtersActive ? (
            <Button
              type='button'
              variant='secondary'
              onClick={reviews.resetFilters}
              className='mt-5'>
              Clear filters
            </Button>
          ) : (
            <Link
              to='/shop'
              className='mt-5 inline-flex min-h-11 items-center border border-[var(--color-ink)] bg-[var(--color-ink)] px-5 text-sm font-bold text-white'>
              Browse products
            </Link>
          )}
        </section>
      ) : null}

      {!reviews.loading && reviews.reviews.length > 0 ? (
        <>
          <section className='mt-8 border-y border-[var(--color-border)] py-6'>
            {reviews.reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                editing={reviews.editingReviewId === review.id}
                editForm={reviews.editForm}
                actionLoading={reviews.actionLoadingId === review.id}
                anyActionLoading={Boolean(reviews.actionLoadingId)}
                onStartEditing={() => reviews.startEditing(review)}
                onCancelEditing={reviews.cancelEditing}
                onEditChange={reviews.handleEditChange}
                onSave={() => reviews.saveReview(review.id)}
                onDelete={() => reviews.deleteReview(review)}
              />
            ))}
          </section>

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
    </div>
  );
}

export default ReviewsPage;
