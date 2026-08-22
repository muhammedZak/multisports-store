import { Alert } from '../../../components/ui/Alert.jsx';
import { Button } from '../../../components/ui/Button.jsx';

import { formatSupportMessageDate } from '../support.utils.js';

function SupportMessage({ message }) {
  const fromCustomer = message.senderRole === 'customer';

  return (
    <div className={`flex ${fromCustomer ? 'justify-end' : 'justify-start'}`}>
      <div className='max-w-[88%] sm:max-w-[72%]'>
        <p
          className={[
            'mb-1 text-xs font-semibold text-[var(--color-muted)]',

            fromCustomer ? 'text-right' : '',
          ].join(' ')}>
          {fromCustomer ? 'You' : 'Support'}
        </p>

        <div
          className={[
            'px-4 py-3 text-sm leading-6',

            fromCustomer
              ? 'bg-[var(--color-ink)] text-white'
              : 'border border-[var(--color-border)] bg-white text-[var(--color-ink)]',
          ].join(' ')}>
          <p className='mb-0 whitespace-pre-wrap break-words'>{message.text}</p>
        </div>

        <p
          className={[
            'mt-1 mb-0 text-xs text-[var(--color-muted)]',

            fromCustomer ? 'text-right' : '',
          ].join(' ')}>
          {formatSupportMessageDate(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

export function SupportMessageList({
  messages,

  canLoadOlder,

  olderLoading,
  olderError,

  messagesEndRef,

  onLoadOlder,
}) {
  return (
    <div className='min-h-[360px] max-h-[60vh] overflow-y-auto bg-[var(--color-surface)] p-4 sm:p-6'>
      {canLoadOlder ? (
        <div className='mb-6 text-center'>
          <Button
            type='button'
            variant='secondary'
            size='sm'
            disabled={olderLoading}
            onClick={onLoadOlder}>
            {olderLoading ? 'Loading...' : 'Load earlier messages'}
          </Button>
        </div>
      ) : null}

      {olderError ? (
        <Alert
          variant='danger'
          title='Unable to load earlier messages'
          className='mb-6'
          actions={
            <Button
              type='button'
              variant='secondary'
              size='sm'
              disabled={olderLoading}
              onClick={onLoadOlder}>
              Try again
            </Button>
          }>
          {olderError.message}
        </Alert>
      ) : null}

      {messages.length === 0 ? (
        <div className='flex min-h-[280px] items-center justify-center text-center'>
          <div className='max-w-sm'>
            <p className='mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]'>
              Customer Support
            </p>

            <h3 className='mb-0 text-xl font-black tracking-[-0.025em]'>
              Start a conversation
            </h3>

            <p className='mt-3 mb-0 text-sm leading-6 text-[var(--color-muted)]'>
              Send your first message below. We will keep it as your persistent
              Support conversation.
            </p>
          </div>
        </div>
      ) : (
        <div className='space-y-5'>
          {messages.map((message) => (
            <SupportMessage key={message.id} message={message} />
          ))}
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
