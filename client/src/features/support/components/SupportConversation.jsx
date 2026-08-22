import { SupportComposer } from './SupportComposer.jsx';
import { SupportMessageList } from './SupportMessageList.jsx';

export function SupportConversation({ support }) {
  return (
    <section className='mt-8 border-y border-[var(--color-border)]'>
      <header className='border-b border-[var(--color-border)] px-4 py-5 sm:px-5'>
        <h2 className='mb-0 text-lg font-black tracking-[-0.02em]'>
          Customer Support
        </h2>

        <p className='mt-1 mb-0 text-xs leading-5 text-[var(--color-muted)]'>
          Your messages and Support replies are persisted to this conversation.
        </p>
      </header>

      <SupportMessageList
        messages={support.messages}
        canLoadOlder={support.canLoadOlder}
        olderLoading={support.olderLoading}
        olderError={support.olderError}
        messagesEndRef={support.messagesEndRef}
        onLoadOlder={support.loadOlder}
      />

      <SupportComposer
        draft={support.draft}
        sendStatus={support.sendStatus}
        sendError={support.sendError}
        sending={support.sending}
        onChange={support.handleDraftChange}
        onSubmit={support.sendMessage}
      />
    </section>
  );
}
