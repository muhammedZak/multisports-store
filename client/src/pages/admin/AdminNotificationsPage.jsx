import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

import { AdminPageHeader } from '../../components/shared/AdminPageHeader.jsx';
import { Pagination } from '../../components/shared/Pagination.jsx';

import { AdminNotificationFilters } from '../../features/notifications/components/AdminNotificationFilters.jsx';
import { AdminNotificationList } from '../../features/notifications/components/AdminNotificationList.jsx';

import { useAdminNotifications } from '../../features/notifications/hooks/useAdminNotifications.js';

function AdminNotificationsPage() {
  const notifications = useAdminNotifications();

  return (
    <main className='p-5 sm:p-6'>
      <AdminPageHeader
        eyebrow='Store management'
        title='Notifications'
        description='Review important Order, Refund, Inventory and Support activity that needs Admin awareness.'
        action={
          <div className='text-right'>
            <p className='mb-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]'>
              Unread
            </p>

            <p className='mb-0 text-2xl font-black ds-tabular-nums'>
              {notifications.unreadCount}
            </p>
          </div>
        }
      />

      <AdminNotificationFilters model={notifications} />

      {notifications.error ? (
        <Alert
          variant='danger'
          title='Unable to load Notifications'
          className='mt-6'>
          {notifications.error.message}
        </Alert>
      ) : null}

      {notifications.actionError ? (
        <Alert variant='danger' className='mt-6'>
          {notifications.actionError.message}
        </Alert>
      ) : null}

      {notifications.loading ? (
        <div className='mt-6 space-y-3'>
          <Skeleton className='h-20 w-full' />
          <Skeleton className='h-20 w-full' />
          <Skeleton className='h-20 w-full' />
        </div>
      ) : null}

      {!notifications.loading && notifications.error ? (
        <Button
          type='button'
          className='mt-5'
          onClick={notifications.loadNotifications}>
          Try again
        </Button>
      ) : null}

      {!notifications.loading &&
      !notifications.error &&
      notifications.notifications.length === 0 ? (
        <section className='mt-6 border-y border-[var(--color-border)] py-14 text-center'>
          <h2 className='mb-0 text-2xl font-black'>
            {notifications.filtersActive
              ? 'No matching Notifications'
              : 'No Notifications yet'}
          </h2>

          <p className='mt-3 mb-0 text-sm text-[var(--color-muted)]'>
            {notifications.filtersActive
              ? 'Try changing or clearing the current filters.'
              : 'Important store activity will appear here when it occurs.'}
          </p>
        </section>
      ) : null}

      {!notifications.loading && notifications.notifications.length > 0 ? (
        <>
          <div className='mt-6'>
            <AdminNotificationList model={notifications} />
          </div>

          <Pagination
            page={notifications.meta.page}
            totalPages={notifications.meta.totalPages}
            totalItems={notifications.meta.totalItems}
            itemLabel='notification'
            loading={notifications.loading}
            onPageChange={notifications.changePage}
          />
        </>
      ) : null}
    </main>
  );
}

export default AdminNotificationsPage;
