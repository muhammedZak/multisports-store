import { useParams } from 'react-router';

import { Alert } from '../../components/ui/Alert.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

import { AdminPageHeader } from '../../components/shared/AdminPageHeader.jsx';

import { AdminReviewDetailsView } from '../../features/reviews/components/AdminReviewDetailsView.jsx';
import { AdminReviewModeration } from '../../features/reviews/components/AdminReviewModeration.jsx';

import { useAdminReviewDetails } from '../../features/reviews/hooks/useAdminReviewDetails.js';

import {
  getReviewStatusVariant,
  reviewDateFormatter,
} from '../../features/reviews/review.utils.js';

function AdminReviewDetailsPage() {
  const { reviewId } = useParams();

  const details = useAdminReviewDetails(reviewId);

  if (details.loading) {
    return (
      <main className='p-5 sm:p-6'>
        <Skeleton className='h-8 w-52' />
        <Skeleton className='mt-8 h-80 w-full' />
      </main>
    );
  }

  if (details.error && !details.review) {
    return (
      <main className='p-5 sm:p-6'>
        <AdminPageHeader
          eyebrow='Review management'
          title='Review unavailable'
          backTo='/admin/reviews'
          backLabel='Reviews'
        />

        <Alert variant='danger' className='mt-6'>
          {details.error.code === 'REVIEW_NOT_FOUND'
            ? 'Review not found.'
            : details.error.message}
        </Alert>

        {details.error.code !== 'REVIEW_NOT_FOUND' ? (
          <Button type='button' className='mt-5' onClick={details.loadReview}>
            Try again
          </Button>
        ) : null}
      </main>
    );
  }

  const { review } = details;

  return (
    <main className='p-5 sm:p-6'>
      <AdminPageHeader
        eyebrow='Review details'
        title='Customer Review'
        description={`Submitted ${reviewDateFormatter.format(
          new Date(review.createdAt),
        )}`}
        backTo='/admin/reviews'
        backLabel='Reviews'
        action={
          <Badge variant={getReviewStatusVariant(review.moderationStatus)}>
            {review.moderationStatus}
          </Badge>
        }
      />

      {details.message ? (
        <Alert variant='success' className='mt-6'>
          {details.message}
        </Alert>
      ) : null}

      {details.moderationError ? (
        <Alert variant='danger' className='mt-6'>
          {details.moderationError.message}
        </Alert>
      ) : null}

      <AdminReviewDetailsView review={review} />

      <AdminReviewModeration model={details} />
    </main>
  );
}

export default AdminReviewDetailsPage;
