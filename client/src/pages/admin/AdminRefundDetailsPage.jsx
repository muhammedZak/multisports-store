import { useParams } from 'react-router';

import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

import { AdminPageHeader } from '../../components/shared/AdminPageHeader.jsx';

import { AdminRefundDecisionPanel } from '../../features/refunds/components/AdminRefundDecisionPanel.jsx';
import { AdminRefundDetailsView } from '../../features/refunds/components/AdminRefundDetailsView.jsx';
import { RefundStatusBadge } from '../../features/refunds/components/RefundStatusBadge.jsx';

import { useAdminRefundDetails } from '../../features/refunds/hooks/useAdminRefundDetails.js';

import { refundDateFormatter } from '../../features/refunds/refund.utils.js';

function AdminRefundDetailsPage() {
  const { refundId } = useParams();

  const details = useAdminRefundDetails(refundId);

  if (details.loading) {
    return (
      <main className='p-5 sm:p-6'>
        <Skeleton className='h-8 w-52' />
        <Skeleton className='mt-8 h-96 w-full' />
      </main>
    );
  }

  if (details.error && !details.refund) {
    return (
      <main className='p-5 sm:p-6'>
        <AdminPageHeader
          eyebrow='Refund management'
          title='Refund unavailable'
          backTo='/admin/refunds'
          backLabel='Refunds'
        />

        <Alert variant='danger' className='mt-6'>
          {details.error.code === 'REFUND_NOT_FOUND'
            ? 'Refund not found.'
            : details.error.message}
        </Alert>

        {details.error.code !== 'REFUND_NOT_FOUND' ? (
          <Button type='button' className='mt-5' onClick={details.loadRefund}>
            Try again
          </Button>
        ) : null}
      </main>
    );
  }

  const { refund } = details;

  return (
    <main className='p-5 sm:p-6'>
      <AdminPageHeader
        eyebrow='Refund management'
        title='Refund details'
        description={`Requested ${refundDateFormatter.format(
          new Date(refund.requestedAt),
        )}`}
        backTo='/admin/refunds'
        backLabel='Refunds'
        action={<RefundStatusBadge status={refund.status} />}
      />

      <p className='mt-4 mb-0 break-all text-xs text-[var(--color-muted)]'>
        Refund ID: {refund.id}
      </p>

      {details.message ? (
        <Alert variant='success' className='mt-6'>
          {details.message}
        </Alert>
      ) : null}

      {details.decisionError ? (
        <Alert variant='warning' className='mt-6'>
          {details.decisionError.message}
        </Alert>
      ) : null}

      <AdminRefundDetailsView refund={refund} />

      <AdminRefundDecisionPanel model={details} />
    </main>
  );
}

export default AdminRefundDetailsPage;
