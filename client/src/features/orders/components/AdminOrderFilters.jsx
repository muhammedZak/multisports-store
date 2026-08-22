import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Select } from '../../../components/ui/Select.jsx';

import { ORDER_STATUS_OPTIONS } from '../order.constants.js';

export function AdminOrderFilters({ model }) {
  return (
    <form
      onSubmit={model.applyFilters}
      className='mt-7 grid gap-4 border-y border-[var(--color-border)] py-5 md:grid-cols-2 xl:grid-cols-3'>
      <Input
        id='admin-order-search'
        name='q'
        label='Search order'
        type='search'
        value={model.filterForm.q}
        placeholder='Order number'
        onChange={model.handleFilterChange}
      />

      <Select
        id='admin-order-status'
        name='status'
        label='Order status'
        value={model.filterForm.status}
        onChange={model.handleFilterChange}>
        {ORDER_STATUS_OPTIONS.map((option) => (
          <option key={option.value || 'all'} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>

      <Input
        id='admin-order-customer'
        name='customerId'
        label='Customer ID'
        value={model.filterForm.customerId}
        placeholder='Optional Customer ID'
        onChange={model.handleFilterChange}
      />

      <Input
        id='admin-order-date-from'
        name='dateFrom'
        label='From date'
        type='date'
        value={model.filterForm.dateFrom}
        onChange={model.handleFilterChange}
      />

      <Input
        id='admin-order-date-to'
        name='dateTo'
        label='To date'
        type='date'
        value={model.filterForm.dateTo}
        onChange={model.handleFilterChange}
      />

      <Select
        id='admin-order-date-order'
        name='order'
        label='Date order'
        value={model.filterForm.order}
        onChange={model.handleFilterChange}>
        <option value='desc'>Newest first</option>

        <option value='asc'>Oldest first</option>
      </Select>

      <div className='flex flex-wrap gap-3 md:col-span-2 xl:col-span-3'>
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
