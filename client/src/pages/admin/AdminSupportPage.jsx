import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

import { AdminPageHeader } from '../../components/shared/AdminPageHeader.jsx';
import { Pagination } from '../../components/shared/Pagination.jsx';

import { AdminSupportConversationList } from '../../features/support/components/AdminSupportConversationList.jsx';
import { AdminSupportFilters } from '../../features/support/components/AdminSupportFilters.jsx';
import { SupportConnectionStatus } from '../../features/support/components/SupportConnectionStatus.jsx';

import { useAdminSupportConversations } from '../../features/support/hooks/useAdminSupportConversations.js';

function AdminSupportPage() {
  const support = useAdminSupportConversations();

  return (
    <main className='p-5 sm:p-6'>
      <AdminPageHeader
        eyebrow='Store management'
        title='Support'
        description='Review Customer Support conversations, find unread messages and reply from one persistent conversation per Customer.'
        action={<SupportConnectionStatus status={support.liveStatus} />}
      />

      <AdminSupportFilters model={support} />

      {support.liveError ? (
        <Alert
          variant='warning'
          title='Live synchronization issue'
          className='mt-6'>
          {support.liveError}
        </Alert>
      ) : null}

      {support.error ? (
        <Alert
          variant='danger'
          title='Unable to load Support conversations'
          className='mt-6'>
          {support.error.message}
        </Alert>
      ) : null}

      {support.loading ? (
        <div className='mt-6 space-y-3'>
          <Skeleton className='h-20 w-full' />
          <Skeleton className='h-20 w-full' />
          <Skeleton className='h-20 w-full' />
        </div>
      ) : null}

      {!support.loading && support.error ? (
        <Button
          type='button'
          className='mt-5'
          onClick={support.loadConversations}>
          Try again
        </Button>
      ) : null}

      {!support.loading &&
      !support.error &&
      support.conversations.length === 0 ? (
        <section className='mt-6 border-y border-[var(--color-border)] py-14 text-center'>
          <h2 className='mb-0 text-2xl font-black'>
            {support.filtersActive
              ? 'No matching conversations'
              : 'No Support conversations yet'}
          </h2>

          <p className='mx-auto mt-3 mb-0 max-w-md text-sm leading-6 text-[var(--color-muted)]'>
            {support.filtersActive
              ? 'Try changing or clearing the current filters.'
              : 'Customer Support conversations will appear here when Customers contact Support.'}
          </p>
        </section>
      ) : null}

      {!support.loading && support.conversations.length > 0 ? (
        <>
          <div className='mt-6'>
            <AdminSupportConversationList
              conversations={support.conversations}
            />
          </div>

          <Pagination
            page={support.meta.page}
            totalPages={support.meta.totalPages}
            totalItems={support.meta.totalItems}
            itemLabel='conversation'
            loading={support.loading}
            onPageChange={support.changePage}
          />
        </>
      ) : null}
    </main>
  );
}

export default AdminSupportPage;
