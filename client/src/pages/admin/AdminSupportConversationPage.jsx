import { useParams } from 'react-router';

import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

import { AdminPageHeader } from '../../components/shared/AdminPageHeader.jsx';

import { AdminSupportConversation } from '../../features/support/components/AdminSupportConversation.jsx';
import { SupportConnectionStatus } from '../../features/support/components/SupportConnectionStatus.jsx';

import { useAdminSupportConversation } from '../../features/support/hooks/useAdminSupportConversation.js';

function AdminSupportConversationPage() {
  const { conversationId } = useParams();

  const support = useAdminSupportConversation(conversationId);

  if (support.loading) {
    return (
      <main className='p-5 sm:p-6'>
        <Skeleton className='h-8 w-60' />
        <Skeleton className='mt-8 h-96 w-full' />
      </main>
    );
  }

  if (support.error && !support.conversation) {
    return (
      <main className='p-5 sm:p-6'>
        <AdminPageHeader
          eyebrow='Support'
          title='Conversation unavailable'
          backTo='/admin/support'
          backLabel='Support'
        />

        <Alert variant='danger' className='mt-6'>
          {support.error.message}
        </Alert>

        <Button
          type='button'
          className='mt-5'
          onClick={support.loadConversation}>
          Try again
        </Button>
      </main>
    );
  }

  return (
    <main className='p-5 sm:p-6'>
      <AdminPageHeader
        eyebrow='Support conversation'
        title={support.conversation.customer?.name ?? 'Customer'}
        description={
          support.conversation.customer?.email ?? 'Email unavailable'
        }
        backTo='/admin/support'
        backLabel='Support'
        action={<SupportConnectionStatus status={support.liveStatus} />}
      />

      {support.liveError ? (
        <Alert
          variant='warning'
          title='Live updates unavailable'
          className='mt-6'>
          REST messaging remains available. Persisted Support Messages remain
          authoritative.
        </Alert>
      ) : null}

      {support.syncError ? (
        <Alert
          variant='warning'
          title='Latest messages could not be synchronized'
          className='mt-6'>
          {support.syncError.message} Refresh the conversation if needed.
        </Alert>
      ) : null}

      {support.readError ? (
        <Alert variant='warning' className='mt-6'>
          {support.readError.message}
        </Alert>
      ) : null}

      <AdminSupportConversation model={support} />
    </main>
  );
}

export default AdminSupportConversationPage;
