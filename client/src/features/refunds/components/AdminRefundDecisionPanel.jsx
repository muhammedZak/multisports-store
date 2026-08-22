import { Alert } from '../../../components/ui/Alert.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Textarea } from '../../../components/ui/Textarea.jsx';

export function AdminRefundDecisionPanel({ model }) {
  const { refund } = model;

  return (
    <section className='mt-10 border-t border-[var(--color-border)] pt-6'>
      <h2 className='mb-0 text-lg font-black'>Admin decision</h2>

      {model.canDecide ? (
        <div className='mt-5 grid gap-10 xl:grid-cols-2'>
          <form
            onSubmit={model.approveRefund}
            className='border-t border-[var(--color-success)] pt-5'>
            <h3 className='mb-0 font-black'>Approve request</h3>

            <p className='mt-2 mb-0 text-sm leading-6 text-[var(--color-muted)]'>
              Approval is saved before Razorpay Refund processing starts.
              Inventory is not restored during this approval step.
            </p>

            <fieldset className='mt-5'>
              <legend className='text-sm font-bold'>
                Restock on Refund completion
              </legend>

              <div className='mt-3 flex gap-5'>
                <label className='flex items-center gap-2 text-sm'>
                  <input
                    type='radio'
                    name='approve-restock'
                    value='yes'
                    checked={model.approveRestock === 'yes'}
                    disabled={model.decisionLoading}
                    onChange={model.handleApproveRestockChange}
                    className='size-4 accent-[var(--color-ink)]'
                  />
                  Yes
                </label>

                <label className='flex items-center gap-2 text-sm'>
                  <input
                    type='radio'
                    name='approve-restock'
                    value='no'
                    checked={model.approveRestock === 'no'}
                    disabled={model.decisionLoading}
                    onChange={model.handleApproveRestockChange}
                    className='size-4 accent-[var(--color-ink)]'
                  />
                  No
                </label>
              </div>
            </fieldset>

            <Textarea
              id='approve-note'
              label='Admin note'
              hint='Optional'
              rows={4}
              value={model.approveNote}
              disabled={model.decisionLoading}
              onChange={model.handleApproveNoteChange}
              className='mt-5'
            />

            <Button
              type='submit'
              disabled={model.decisionLoading || !model.approveRestock}
              className='mt-4 w-full'>
              {model.decisionLoading
                ? 'Recording decision...'
                : 'Approve Refund'}
            </Button>
          </form>

          <form
            onSubmit={model.rejectRefund}
            className='border-t border-[var(--color-danger)] pt-5'>
            <h3 className='mb-0 font-black'>Reject request</h3>

            <p className='mt-2 mb-0 text-sm leading-6 text-[var(--color-muted)]'>
              Rejection releases the claimed Refund scope so the Customer can
              submit another eligible request for that scope.
            </p>

            <Textarea
              id='reject-note'
              label='Rejection note'
              required
              rows={5}
              value={model.rejectNote}
              disabled={model.decisionLoading}
              placeholder='Explain why this Refund request is rejected.'
              onChange={model.handleRejectNoteChange}
              className='mt-5'
            />

            <Button
              type='submit'
              variant='secondary'
              disabled={model.decisionLoading || !model.rejectNote.trim()}
              className='mt-4 w-full text-[var(--color-danger)]'>
              {model.decisionLoading
                ? 'Recording decision...'
                : 'Reject Refund'}
            </Button>
          </form>
        </div>
      ) : model.canRetryProvider ? (
        <Alert
          variant='warning'
          title='Provider processing unconfirmed'
          className='mt-5'
          actions={
            <Button
              type='button'
              size='sm'
              disabled={model.decisionLoading}
              onClick={model.retryProviderProcessing}>
              {model.decisionLoading
                ? 'Reconciling...'
                : 'Retry Provider Processing'}
            </Button>
          }>
          {model.isSystemOrigin
            ? 'This system Refund is already durable and read-only. This action only reconciles the same Razorpay Refund operation.'
            : 'The business approval and original restock decision are already saved. This action reconciles the same Razorpay Refund operation and cannot change approval details.'}
        </Alert>
      ) : (
        <p className='mt-4 mb-0 text-sm leading-6 text-[var(--color-muted)]'>
          {refund.status === 'processing' &&
            'Razorpay is processing this Refund. No duplicate initiation action is available.'}

          {refund.status === 'refunded' &&
            'This Refund completed successfully and is read-only.'}

          {refund.status === 'failed' &&
            'Razorpay reported a terminal Refund failure. This Refund is read-only.'}

          {!['processing', 'refunded', 'failed'].includes(refund.status) &&
            'This Refund is read-only. Only requested Customer Refunds await an Admin approve or reject decision.'}
        </p>
      )}
    </section>
  );
}
