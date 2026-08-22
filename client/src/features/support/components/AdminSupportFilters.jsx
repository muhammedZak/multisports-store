import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Select } from '../../../components/ui/Select.jsx';

export function AdminSupportFilters({ model }) {
  return (
    <form
      onSubmit={model.applyFilters}
      className='mt-7 grid gap-4 border-y border-[var(--color-border)] py-5 lg:grid-cols-3'>
      <Input
        id='admin-support-search'
        name='q'
        label='Customer'
        type='search'
        value={model.filterForm.q}
        placeholder='Search by Customer name or email'
        onChange={model.handleFilterChange}
        className='lg:col-span-3'
      />

      <Select
        id='admin-support-unread'
        name='unread'
        label='Read status'
        value={model.filterForm.unread}
        onChange={model.handleFilterChange}>
        <option value=''>All conversations</option>

        <option value='true'>Unread</option>

        <option value='false'>Read / no unread messages</option>
      </Select>

      <Select
        id='admin-support-order'
        name='order'
        label='Activity order'
        value={model.filterForm.order}
        onChange={model.handleFilterChange}>
        <option value='desc'>Newest first</option>

        <option value='asc'>Oldest first</option>
      </Select>

      <div className='flex items-end gap-3'>
        <Button type='submit' disabled={model.loading}>
          Apply
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
