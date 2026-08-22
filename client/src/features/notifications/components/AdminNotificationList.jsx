import { Link } from 'react-router';

import { Badge } from '../../../components/ui/Badge.jsx';
import { Button } from '../../../components/ui/Button.jsx';

import {
  formatNotificationLabel,
  notificationDateFormatter,
} from '../notification.utils.js';

import {
  getAdminNotificationResourceLabel,
  getAdminNotificationResourceLink,
  getAdminNotificationTypeVariant,
} from '../adminNotification.utils.js';

export function AdminNotificationList({ model }) {
  return (
    <>
      <div className='grid gap-5 md:hidden'>
        {model.notifications.map((notification) => {
          const isUnread = !notification.readAt;

          const resourceLink = getAdminNotificationResourceLink(notification);

          const marking = model.markingNotificationId === notification.id;

          return (
            <article
              key={notification.id}
              className='border-y border-[var(--color-border)] py-5'>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <div className='flex flex-wrap gap-2'>
                    <Badge
                      variant={getAdminNotificationTypeVariant(
                        notification.type,
                      )}>
                      {formatNotificationLabel(notification.type)}
                    </Badge>

                    {isUnread ? <Badge variant='accent'>Unread</Badge> : null}
                  </div>

                  <h2 className='mt-4 mb-0 font-black'>{notification.title}</h2>
                </div>
              </div>

              <p className='mt-3 mb-0 text-sm leading-6 text-[var(--color-muted)]'>
                {notification.message}
              </p>

              <p className='mt-3 mb-0 text-xs text-[var(--color-muted)]'>
                {notificationDateFormatter.format(
                  new Date(notification.createdAt),
                )}
              </p>

              <div className='mt-4 flex flex-wrap gap-3 border-t border-[var(--color-border)] pt-4'>
                {resourceLink ? (
                  <Link
                    to={resourceLink}
                    className='text-sm font-semibold underline underline-offset-4'>
                    {getAdminNotificationResourceLabel(notification)}
                  </Link>
                ) : null}

                {isUnread ? (
                  <Button
                    type='button'
                    variant='quiet'
                    size='sm'
                    disabled={Boolean(model.markingNotificationId)}
                    onClick={() => model.markRead(notification)}>
                    {marking ? 'Marking...' : 'Mark as read'}
                  </Button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      <div className='hidden overflow-x-auto border-y border-[var(--color-border)] md:block'>
        <table className='min-w-full text-left text-sm'>
          <thead className='bg-[var(--color-surface)]'>
            <tr>
              <th className='px-4 py-3 font-bold'>Notification</th>

              <th className='px-4 py-3 font-bold'>Type</th>

              <th className='px-4 py-3 font-bold'>Created</th>

              <th className='px-4 py-3 font-bold'>Status</th>

              <th className='px-4 py-3 font-bold'>Actions</th>
            </tr>
          </thead>

          <tbody>
            {model.notifications.map((notification) => {
              const isUnread = !notification.readAt;

              const resourceLink =
                getAdminNotificationResourceLink(notification);

              const marking = model.markingNotificationId === notification.id;

              return (
                <tr
                  key={notification.id}
                  className='border-t border-[var(--color-border)] align-top'>
                  <td className='min-w-72 px-4 py-4'>
                    <p className='mb-0 font-bold'>{notification.title}</p>

                    <p className='mt-2 mb-0 max-w-xl leading-6 text-[var(--color-muted)]'>
                      {notification.message}
                    </p>
                  </td>

                  <td className='px-4 py-4'>
                    <Badge
                      variant={getAdminNotificationTypeVariant(
                        notification.type,
                      )}>
                      {formatNotificationLabel(notification.type)}
                    </Badge>
                  </td>

                  <td className='whitespace-nowrap px-4 py-4 text-[var(--color-muted)]'>
                    {notificationDateFormatter.format(
                      new Date(notification.createdAt),
                    )}
                  </td>

                  <td className='px-4 py-4'>
                    {isUnread ? (
                      <Badge variant='accent'>Unread</Badge>
                    ) : (
                      <span className='text-xs font-semibold text-[var(--color-muted)]'>
                        Read
                      </span>
                    )}
                  </td>

                  <td className='min-w-40 px-4 py-4'>
                    <div className='flex flex-col items-start gap-2'>
                      {resourceLink ? (
                        <Link
                          to={resourceLink}
                          className='font-semibold underline underline-offset-4'>
                          {getAdminNotificationResourceLabel(notification)}
                        </Link>
                      ) : null}

                      {isUnread ? (
                        <button
                          type='button'
                          disabled={Boolean(model.markingNotificationId)}
                          onClick={() => model.markRead(notification)}
                          className='font-semibold underline underline-offset-4 disabled:opacity-50'>
                          {marking ? 'Marking...' : 'Mark as read'}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
