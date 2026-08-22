import { Alert } from '../../../components/ui/Alert.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Textarea } from '../../../components/ui/Textarea.jsx';

import { SUPPORT_MESSAGE_MAX_LENGTH } from '../support.constants.js';

export function SupportComposer({
  draft,

  sendStatus,
  sendError,

  sending,

  onChange,
  onSubmit,
}) {
  return (
    <form
      onSubmit={onSubmit}
      className='border-t border-[var(--color-border)] bg-white p-4 sm:p-5'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-end'>
        <div className='min-w-0 flex-1'>
          <Textarea
            id='support-message'
            label='Message'
            value={draft}
            maxLength={SUPPORT_MESSAGE_MAX_LENGTH}
            rows={3}
            disabled={sending}
            placeholder='Type a message...'
            hint={`Text messages only · ${draft.length}/${SUPPORT_MESSAGE_MAX_LENGTH}`}
            onChange={onChange}
            className='resize-none'
          />
        </div>

        <Button
          type='submit'
          size='lg'
          disabled={sending || !draft.trim()}
          className='sm:mb-[1.55rem]'>
          {sending ? 'Sending...' : 'Send'}
        </Button>
      </div>

      {sendStatus === 'sent' ? (
        <p
          role='status'
          className='mt-3 mb-0 text-sm font-semibold text-[var(--color-success)]'>
          Sent
        </p>
      ) : null}

      {sendStatus === 'failed' && sendError ? (
        <Alert variant='danger' className='mt-4'>
          <p className='mb-1'>{sendError.message}</p>

          <p className='mb-0 text-xs'>
            Your message is still in the box so you can retry.
          </p>
        </Alert>
      ) : null}
    </form>
  );
}
