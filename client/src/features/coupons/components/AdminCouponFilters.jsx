import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Select } from '../../../components/ui/Select.jsx';

export function AdminCouponFilters({ model }) {
  return (
    <form
      onSubmit={model.applyFilters}
      className='mt-7 grid gap-4 border-y border-[var(--color-border)] py-5 md:grid-cols-2 xl:grid-cols-5'>
      <Input
        id='coupon-search'
        name='q'
        label='Search'
        type='search'
        value={model.filterForm.q}
        placeholder='Coupon code'
        onChange={model.handleFilterChange}
      />

      <Select
        id='coupon-status'
        name='status'
        label='Status'
        value={model.filterForm.status}
        onChange={model.handleFilterChange}>
        <option value=''>All statuses</option>

        <option value='active'>Active</option>

        <option value='inactive'>Inactive</option>
      </Select>

      <Select
        id='coupon-discount-type'
        name='discountType'
        label='Discount type'
        value={model.filterForm.discountType}
        onChange={model.handleFilterChange}>
        <option value=''>All types</option>

        <option value='percentage'>Percentage</option>

        <option value='fixed'>Fixed amount</option>
      </Select>

      <Select
        id='coupon-sort'
        name='sort'
        label='Sort'
        value={model.filterForm.sort}
        onChange={model.handleFilterChange}>
        <option value='createdAt'>Created</option>

        <option value='code'>Code</option>

        <option value='expiresAt'>Expiry</option>
      </Select>

      <Select
        id='coupon-order'
        name='order'
        label='Order'
        value={model.filterForm.order}
        onChange={model.handleFilterChange}>
        <option value='desc'>Descending</option>

        <option value='asc'>Ascending</option>
      </Select>

      <div className='flex flex-wrap gap-3 md:col-span-2 xl:col-span-5'>
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
