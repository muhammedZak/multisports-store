import { Link } from 'react-router';

import { Badge } from '../../../components/ui/Badge.jsx';

import { formatAdminSupportActivityDate } from '../adminSupport.utils.js';

export function AdminSupportConversationList({ conversations }) {
  return (
    <>
      <div className='grid gap-5 md:hidden'>
        {conversations.map((conversation) => (
          <article
            key={conversation.id}
            className='border-y border-[var(--color-border)] py-5'>
            <div className='flex items-start justify-between gap-4'>
              <div className='min-w-0'>
                <h2 className='mb-0 font-black'>
                  {conversation.customer?.name ?? 'Customer'}
                </h2>

                <p className='mt-1 mb-0 break-all text-sm text-[var(--color-muted)]'>
                  {conversation.customer?.email ?? 'Email unavailable'}
                </p>
              </div>

              {conversation.unread ? (
                <Badge variant='accent'>Unread</Badge>
              ) : (
                <Badge variant='neutral'>Read</Badge>
              )}
            </div>

            <p className='mt-4 mb-0 text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-muted)]'>
              Last activity
            </p>

            <p className='mt-1 mb-0 text-sm'>
              {formatAdminSupportActivityDate(conversation.lastMessageAt)}
            </p>

            <Link
              to={`/admin/support/conversations/${conversation.id}`}
              className='mt-4 inline-flex text-sm font-semibold underline underline-offset-4'>
              Open conversation
            </Link>
          </article>
        ))}
      </div>

      <div className='hidden overflow-x-auto border-y border-[var(--color-border)] md:block'>
        <table className='min-w-full text-left text-sm'>
          <thead className='bg-[var(--color-surface)]'>
            <tr>
              <th className='px-4 py-3 font-bold'>Customer</th>

              <th className='px-4 py-3 font-bold'>Last activity</th>

              <th className='px-4 py-3 font-bold'>Status</th>

              <th className='px-4 py-3 font-bold'>Action</th>
            </tr>
          </thead>

          <tbody>
            {conversations.map((conversation) => (
              <tr
                key={conversation.id}
                className='border-t border-[var(--color-border)]'>
                <td className='px-4 py-4'>
                  <p className='mb-0 font-semibold'>
                    {conversation.customer?.name ?? 'Customer'}
                  </p>

                  <p className='mt-1 mb-0 break-all text-[var(--color-muted)]'>
                    {conversation.customer?.email ?? 'Email unavailable'}
                  </p>
                </td>

                <td className='whitespace-nowrap px-4 py-4 text-[var(--color-muted)]'>
                  {formatAdminSupportActivityDate(conversation.lastMessageAt)}
                </td>

                <td className='px-4 py-4'>
                  <Badge variant={conversation.unread ? 'accent' : 'neutral'}>
                    {conversation.unread ? 'Unread' : 'Read'}
                  </Badge>
                </td>

                <td className='px-4 py-4'>
                  <Link
                    to={`/admin/support/conversations/${conversation.id}`}
                    className='font-semibold underline underline-offset-4'>
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
