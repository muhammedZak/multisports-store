import { Link } from 'react-router';

import { Badge } from '../../../components/ui/Badge.jsx';
import { Button } from '../../../components/ui/Button.jsx';

import {
  formatNotificationLabel,
  getNotificationResourceLabel,
  getNotificationResourceLink,
  getNotificationTypeVariant,
  notificationDateFormatter,
} from '../notification.utils.js';

export function NotificationCard({
  notification,

  marking,

  actionLocked,

  onMarkRead,
}) {
  const isUnread = !notification.readAt;

  const resourceLink = getNotificationResourceLink(notification);

  return (
    <article
      className={[
        'border-t py-6 first:border-t-0 first:pt-0',

        isUnread ? 'border-[var(--color-ink)]' : 'border-[var(--color-border)]',
      ].join(' ')}>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div className='min-w-0'>
          <div className='flex flex-wrap items-center gap-2'>
            <Badge variant={getNotificationTypeVariant(notification.type)}>
              {formatNotificationLabel(notification.type)}
            </Badge>

            {isUnread ? <Badge variant='accent'>Unread</Badge> : null}
          </div>

          <h2 className='mt-4 mb-0 text-lg font-black tracking-[-0.02em]'>
            {notification.title}
          </h2>

          <p className='mt-2 mb-0 max-w-3xl text-sm leading-6 text-[var(--color-ink-soft)]'>
            {notification.message}
          </p>

          <p className='mt-3 mb-0 text-xs text-[var(--color-muted)]'>
            {notificationDateFormatter.format(new Date(notification.createdAt))}
          </p>
        </div>

        {!isUnread ? (
          <span className='shrink-0 text-xs font-semibold text-[var(--color-muted)]'>
            Read
          </span>
        ) : null}
      </div>

      {resourceLink || isUnread ? (
        <div className='mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-4'>
          {resourceLink ? (
            <Link
              to={resourceLink}
              className='inline-flex min-h-9 items-center px-2 text-sm font-semibold underline decoration-[var(--color-border-strong)] underline-offset-4 hover:decoration-[var(--color-ink)]'>
              {getNotificationResourceLabel(notification)}
            </Link>
          ) : null}

          {isUnread ? (
            <Button
              type='button'
              variant='quiet'
              size='sm'
              disabled={actionLocked}
              onClick={() => onMarkRead(notification)}>
              {marking ? 'Marking as read...' : 'Mark as read'}
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
