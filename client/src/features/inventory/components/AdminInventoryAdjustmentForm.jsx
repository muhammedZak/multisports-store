import { Alert } from '../../../components/ui/Alert.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import { Textarea } from '../../../components/ui/Textarea.jsx';

export function AdminInventoryAdjustmentForm({ model }) {
  return (
    <section className='border-t border-[var(--color-border)] pt-6'>
      <h2 className='mb-0 text-lg font-black'>Adjust Inventory</h2>

      <p className='mt-2 mb-0 text-sm text-[var(--color-muted)]'>
        Current authoritative quantity:{' '}
        <strong className='text-[var(--color-ink)]'>
          {model.inventory.quantity}
        </strong>
      </p>

      {model.successMessage ? (
        <Alert variant='success' className='mt-5'>
          {model.successMessage}
        </Alert>
      ) : null}

      {model.adjustmentError ? (
        <Alert variant='danger' className='mt-5'>
          {model.adjustmentError.message}
        </Alert>
      ) : null}

      <form
        onSubmit={model.submitAdjustment}
        className='mt-5 grid gap-5 lg:grid-cols-2'>
        <Input
          id='quantity-change'
          name='quantityChange'
          label='Quantity change'
          type='number'
          step='1'
          value={model.adjustmentForm.quantityChange}
          disabled={model.adjustmentSubmitting}
          placeholder='Example: 10 or -2'
          hint='Enter the amount to add or remove, not the final stock quantity.'
          error={model.adjustmentError?.fields?.quantityChange}
          onChange={model.handleAdjustmentChange}
        />

        <Select
          id='adjustment-reason'
          name='reason'
          label='Reason'
          value={model.adjustmentForm.reason}
          disabled={model.adjustmentSubmitting}
          error={model.adjustmentError?.fields?.reason}
          onChange={model.handleAdjustmentChange}>
          <option value='restock'>Restock</option>

          <option value='manual_correction'>Manual correction</option>
        </Select>

        <Textarea
          id='adjustment-note'
          name='note'
          label={
            model.adjustmentForm.reason === 'manual_correction'
              ? 'Note *'
              : 'Note'
          }
          rows={3}
          value={model.adjustmentForm.note}
          disabled={model.adjustmentSubmitting}
          placeholder={
            model.adjustmentForm.reason === 'manual_correction'
              ? 'Explain why this correction is required'
              : 'Optional note'
          }
          error={model.adjustmentError?.fields?.note}
          onChange={model.handleAdjustmentChange}
          className='lg:col-span-2'
        />

        <div className='lg:col-span-2'>
          <Button type='submit' disabled={model.adjustmentSubmitting}>
            {model.adjustmentSubmitting ? 'Adjusting stock...' : 'Adjust stock'}
          </Button>
        </div>
      </form>
    </section>
  );
}
