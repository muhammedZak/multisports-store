import { Alert } from '../../../components/ui/Alert.jsx';
import { Button } from '../../../components/ui/Button.jsx';

import { formatSupportMessageDate } from '../support.utils.js';

export function AdminSupportMessageList({
  model: {
    canLoadOlder,
    olderLoading,
    loadOlder,
    olderError,
    messages,
    conversation,
    messagesEndRef,
  },
}) {
  return (
    <div className='min-h-[400px] max-h-[60vh] overflow-y-auto bg-[var(--color-surface)] p-4 sm:p-6'>
      {canLoadOlder ? (
        <div className='mb-6 text-center'>
          <Button
            type='button'
            variant='secondary'
            size='sm'
            disabled={olderLoading}
            onClick={loadOlder}>
            {olderLoading ? 'Loading...' : 'Load earlier messages'}
          </Button>
        </div>
      ) : null}

      {olderError ? (
        <Alert variant='danger' className='mb-6'>
          {olderError.message}
        </Alert>
      ) : null}

      {messages.length === 0 ? (
        <div className='flex min-h-[300px] items-center justify-center text-center'>
          <div>
            <h3 className='mb-0 font-black'>No messages yet</h3>

            <p className='mt-2 mb-0 text-sm text-[var(--color-muted)]'>
              This Support conversation has no messages.
            </p>
          </div>
        </div>
      ) : (
        <div className='space-y-5'>
          {messages.map((message) => {
            const fromAdmin = message.senderRole === 'admin';

            return (
              <div
                key={message.id}
                className={`flex ${
                  fromAdmin ? 'justify-end' : 'justify-start'
                }`}>
                <div className='max-w-[85%] sm:max-w-[70%]'>
                  <p
                    className={[
                      'mb-1 text-xs font-semibold text-[var(--color-muted)]',

                      fromAdmin ? 'text-right' : '',
                    ].join(' ')}>
                    {fromAdmin
                      ? 'You'
                      : (conversation.customer?.name ?? 'Customer')}
                  </p>

                  <div
                    className={[
                      'px-4 py-3 text-sm leading-6',

                      fromAdmin
                        ? 'bg-[var(--color-ink)] text-white'
                        : 'border border-[var(--color-border)] bg-white',
                    ].join(' ')}>
                    <p className='mb-0 whitespace-pre-wrap break-words'>
                      {message.text}
                    </p>
                  </div>

                  <p
                    className={[
                      'mt-1 mb-0 text-xs text-[var(--color-muted)]',

                      fromAdmin ? 'text-right' : '',
                    ].join(' ')}>
                    {formatSupportMessageDate(message.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
