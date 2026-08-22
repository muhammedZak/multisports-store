import { Button } from '../../../components/ui/Button.jsx';
import { Select } from '../../../components/ui/Select.jsx';

import {
  NOTIFICATION_READ_OPTIONS,
  NOTIFICATION_TYPE_OPTIONS,
} from '../notification.constants.js';

export function NotificationFilters({
  form,

  loading,

  onChange,
  onSubmit,
  onReset,
}) {
  return (
    <form
      onSubmit={onSubmit}
      className='mt-7 grid gap-4 border-y border-[var(--color-border)] py-5 sm:grid-cols-2'>
      <Select
        id='notification-type'
        name='type'
        label='Notification type'
        value={form.type}
        disabled={loading}
        onChange={onChange}>
        {NOTIFICATION_TYPE_OPTIONS.map((option) => (
          <option key={option.value || 'all'} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>

      <Select
        id='notification-read-status'
        name='readStatus'
        label='Read status'
        value={form.readStatus}
        disabled={loading}
        onChange={onChange}>
        {NOTIFICATION_READ_OPTIONS.map((option) => (
          <option key={option.value || 'all'} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>

      <div className='flex flex-wrap gap-3 sm:col-span-2'>
        <Button type='submit' disabled={loading}>
          Apply filters
        </Button>

        <Button
          type='button'
          variant='secondary'
          disabled={loading}
          onClick={onReset}>
          Reset
        </Button>
      </div>
    </form>
  );
}
