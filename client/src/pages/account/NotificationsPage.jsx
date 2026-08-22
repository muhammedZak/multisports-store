import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

import { Pagination } from '../../components/shared/Pagination.jsx';

import { AccountPageHeader } from '../../features/account/components/AccountPageHeader.jsx';

import { NotificationCard } from '../../features/notifications/components/NotificationCard.jsx';
import { NotificationFilters } from '../../features/notifications/components/NotificationFilters.jsx';

import { useMyNotifications } from '../../features/notifications/hooks/useMyNotifications.js';

function NotificationsPage() {
  const notifications = useMyNotifications();

  return (
    <div className='max-w-5xl'>
      <AccountPageHeader
        title='Notifications'
        description='Keep track of important Order, Payment, Refund, Support and account activity.'
        action={
          <div className='text-right'>
            <p className='mb-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]'>
              Unread
            </p>

            <p className='mb-0 text-2xl font-black tracking-[-0.03em] ds-tabular-nums'>
              {notifications.unreadCount}
            </p>
          </div>
        }
      />

      <NotificationFilters
        form={notifications.filterForm}
        loading={notifications.loading}
        onChange={notifications.handleFilterChange}
        onSubmit={notifications.applyFilters}
        onReset={notifications.resetFilters}
      />

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
        <div className='mt-8 space-y-7'>
          {Array.from({
            length: 4,
          }).map((_, index) => (
            <div
              key={index}
              className='border-b border-[var(--color-border)] pb-7'>
              <Skeleton className='h-6 w-24' />

              <Skeleton className='mt-4 h-5 w-1/2' />

              <Skeleton className='mt-3 h-4 w-full' />

              <Skeleton className='mt-2 h-4 w-3/4' />
            </div>
          ))}
        </div>
      ) : null}

      {!notifications.loading &&
      notifications.error &&
      notifications.notifications.length === 0 ? (
        <Button
          type='button'
          onClick={notifications.loadNotifications}
          className='mt-5'>
          Try again
        </Button>
      ) : null}

      {!notifications.loading &&
      !notifications.error &&
      notifications.notifications.length === 0 ? (
        <section className='mt-8 border-y border-[var(--color-border)] py-14 text-center'>
          <p className='mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]'>
            Activity
          </p>

          <h2 className='mb-0 text-2xl font-black tracking-[-0.03em]'>
            {notifications.filtersActive
              ? 'No matching Notifications'
              : 'No Notifications yet'}
          </h2>

          <p className='mx-auto mt-3 mb-0 max-w-md text-sm leading-6 text-[var(--color-muted)]'>
            {notifications.filtersActive
              ? 'No Notifications match the selected type and read status.'
              : 'Important activity connected to your account will appear here.'}
          </p>

          {notifications.filtersActive ? (
            <Button
              type='button'
              variant='secondary'
              onClick={notifications.resetFilters}
              className='mt-5'>
              Clear filters
            </Button>
          ) : null}
        </section>
      ) : null}

      {!notifications.loading && notifications.notifications.length > 0 ? (
        <>
          <section className='mt-8 border-y border-[var(--color-border)] py-6'>
            {notifications.notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                marking={
                  notifications.markingNotificationId === notification.id
                }
                actionLocked={Boolean(notifications.markingNotificationId)}
                onMarkRead={notifications.markRead}
              />
            ))}
          </section>

          <Pagination
            page={notifications.meta.page}
            totalPages={notifications.meta.totalPages}
            totalItems={notifications.meta.totalItems}
            itemLabel='Notification'
            loading={notifications.loading}
            onPageChange={notifications.changePage}
          />
        </>
      ) : null}
    </div>
  );
}

export default NotificationsPage;
