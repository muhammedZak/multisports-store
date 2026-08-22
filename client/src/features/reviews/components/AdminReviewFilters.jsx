import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Select } from '../../../components/ui/Select.jsx';

export function AdminReviewFilters({ model }) {
  return (
    <form
      onSubmit={model.applyFilters}
      className='mt-7 grid gap-4 border-y border-[var(--color-border)] py-5 md:grid-cols-2 xl:grid-cols-3'>
      <Input
        id='admin-review-product'
        name='productId'
        label='Product ID'
        value={model.filterForm.productId}
        placeholder='Optional Product ID'
        onChange={model.handleFilterChange}
      />

      <Input
        id='admin-review-customer'
        name='customerId'
        label='Customer ID'
        value={model.filterForm.customerId}
        placeholder='Optional Customer ID'
        onChange={model.handleFilterChange}
      />

      <Select
        id='admin-review-rating'
        name='rating'
        label='Rating'
        value={model.filterForm.rating}
        onChange={model.handleFilterChange}>
        <option value=''>All ratings</option>

        {[5, 4, 3, 2, 1].map((rating) => (
          <option key={rating} value={rating}>
            {rating} star
            {rating === 1 ? '' : 's'}
          </option>
        ))}
      </Select>

      <Select
        id='admin-review-status'
        name='moderationStatus'
        label='Moderation status'
        value={model.filterForm.moderationStatus}
        onChange={model.handleFilterChange}>
        <option value=''>All statuses</option>

        <option value='visible'>Visible</option>

        <option value='hidden'>Hidden</option>
      </Select>

      <Select
        id='admin-review-sort'
        name='sort'
        label='Sort by'
        value={model.filterForm.sort}
        onChange={model.handleFilterChange}>
        <option value='createdAt'>Submitted date</option>

        <option value='rating'>Rating</option>
      </Select>

      <Select
        id='admin-review-order'
        name='order'
        label='Order'
        value={model.filterForm.order}
        onChange={model.handleFilterChange}>
        <option value='desc'>Descending</option>

        <option value='asc'>Ascending</option>
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
