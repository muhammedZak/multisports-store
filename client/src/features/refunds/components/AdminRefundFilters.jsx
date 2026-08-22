import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Select } from '../../../components/ui/Select.jsx';

export function AdminRefundFilters({ model }) {
  return (
    <form
      onSubmit={model.applyFilters}
      className='mt-7 grid gap-4 border-y border-[var(--color-border)] py-5 md:grid-cols-2 xl:grid-cols-4'>
      <Input
        id='admin-refund-search'
        name='q'
        label='Search Order'
        type='search'
        value={model.filterForm.q}
        placeholder='Order number'
        onChange={model.handleFilterChange}
      />

      <Select
        id='admin-refund-status'
        name='status'
        label='Status'
        value={model.filterForm.status}
        onChange={model.handleFilterChange}>
        <option value=''>All statuses</option>

        <option value='requested'>Requested</option>

        <option value='approved'>Approved</option>

        <option value='rejected'>Rejected</option>

        <option value='processing'>Processing</option>

        <option value='refunded'>Refunded</option>

        <option value='failed'>Failed</option>
      </Select>

      <Select
        id='admin-refund-origin'
        name='origin'
        label='Origin'
        value={model.filterForm.origin}
        onChange={model.handleFilterChange}>
        <option value=''>All origins</option>

        <option value='customer_request'>Customer request</option>

        <option value='order_cancellation'>Order cancellation</option>

        <option value='system_compensation'>System compensation</option>
      </Select>

      <Input
        id='admin-refund-customer'
        name='customerId'
        label='Customer ID'
        value={model.filterForm.customerId}
        placeholder='Optional Customer ID'
        onChange={model.handleFilterChange}
      />

      <Input
        id='admin-refund-order-id'
        name='orderId'
        label='Order ID'
        value={model.filterForm.orderId}
        placeholder='Optional Order ID'
        onChange={model.handleFilterChange}
      />

      <Input
        id='admin-refund-from'
        name='dateFrom'
        label='From date'
        type='date'
        value={model.filterForm.dateFrom}
        onChange={model.handleFilterChange}
      />

      <Input
        id='admin-refund-to'
        name='dateTo'
        label='To date'
        type='date'
        value={model.filterForm.dateTo}
        onChange={model.handleFilterChange}
      />

      <Select
        id='admin-refund-order'
        name='order'
        label='Requested date order'
        value={model.filterForm.order}
        onChange={model.handleFilterChange}>
        <option value='desc'>Newest first</option>

        <option value='asc'>Oldest first</option>
      </Select>

      <div className='flex flex-wrap gap-3 md:col-span-2 xl:col-span-4'>
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
