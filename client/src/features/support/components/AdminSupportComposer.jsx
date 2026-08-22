import { Alert } from '../../../components/ui/Alert.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Textarea } from '../../../components/ui/Textarea.jsx';

import { SUPPORT_MESSAGE_MAX_LENGTH } from '../support.constants.js';

export function AdminSupportComposer({ model }) {
  return (
    <form
      onSubmit={model.sendMessage}
      className='border-t border-[var(--color-border)] bg-white p-4 sm:p-5'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-end'>
        <div className='min-w-0 flex-1'>
          <Textarea
            id='admin-support-message'
            label='Reply'
            rows={3}
            maxLength={SUPPORT_MESSAGE_MAX_LENGTH}
            disabled={model.sending}
            value={model.draft}
            placeholder='Type a reply...'
            hint={`Text messages only · ${model.draft.length}/${SUPPORT_MESSAGE_MAX_LENGTH}`}
            onChange={model.handleDraftChange}
            className='resize-none'
          />
        </div>

        <Button
          type='submit'
          size='lg'
          disabled={model.sending || !model.draft.trim()}
          className='sm:mb-[1.55rem]'>
          {model.sending ? 'Sending...' : 'Send reply'}
        </Button>
      </div>

      {model.sendStatus === 'sent' ? (
        <p
          role='status'
          className='mt-3 mb-0 text-sm font-semibold text-[var(--color-success)]'>
          Sent
        </p>
      ) : null}

      {model.sendStatus === 'failed' && model.sendError ? (
        <Alert variant='danger' className='mt-4'>
          <p className='mb-1'>{model.sendError.message}</p>

          <p className='mb-0 text-xs'>
            Your reply remains in the box so you can retry.
          </p>
        </Alert>
      ) : null}
    </form>
  );
}
