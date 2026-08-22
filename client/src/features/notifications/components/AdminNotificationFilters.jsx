import { Button } from '../../../components/ui/Button.jsx';
import { Select } from '../../../components/ui/Select.jsx';

import {
  ADMIN_NOTIFICATION_READ_OPTIONS,
  ADMIN_NOTIFICATION_TYPE_OPTIONS,
} from '../adminNotification.constants.js';

export function AdminNotificationFilters({ model }) {
  return (
    <form
      onSubmit={model.applyFilters}
      className='mt-7 grid gap-4 border-y border-[var(--color-border)] py-5 md:grid-cols-2'>
      <Select
        id='admin-notification-type'
        name='type'
        label='Notification type'
        value={model.filterForm.type}
        disabled={model.loading}
        onChange={model.handleFilterChange}>
        {ADMIN_NOTIFICATION_TYPE_OPTIONS.map((option) => (
          <option key={option.value || 'all'} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>

      <Select
        id='admin-notification-read'
        name='readStatus'
        label='Read status'
        value={model.filterForm.readStatus}
        disabled={model.loading}
        onChange={model.handleFilterChange}>
        {ADMIN_NOTIFICATION_READ_OPTIONS.map((option) => (
          <option key={option.value || 'all'} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>

      <div className='flex flex-wrap gap-3 md:col-span-2'>
        <Button type='submit' disabled={model.loading}>
          Apply filters
        </Button>

        <Button
          type='button'
          variant='secondary'
          disabled={model.loading}
          onClick={model.resetFilters}>
          Reset
        </Button>
      </div>
    </form>
  );
}
