import { Badge } from '../../../components/ui/Badge.jsx';

import { AdminSupportComposer } from './AdminSupportComposer.jsx';

import { AdminSupportMessageList } from './AdminSupportMessageList.jsx';

export function AdminSupportConversation({ model }) {
  return (
    <section className='mt-6 border-y border-[var(--color-border)]'>
      <header className='border-b border-[var(--color-border)] px-4 py-5 sm:px-5'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h2 className='mb-0 font-black'>Conversation</h2>

            <p className='mt-1 mb-0 text-xs text-[var(--color-muted)]'>
              Persisted Customer and Admin Support messages.
            </p>
          </div>

          <Badge variant={model.conversation.unread ? 'accent' : 'neutral'}>
            {model.conversation.unread ? 'Unread' : 'Read'}
          </Badge>
        </div>
      </header>

      <AdminSupportMessageList model={model} />

      <AdminSupportComposer model={model} />
    </section>
  );
}
