import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Select } from '../../../components/ui/Select.jsx';

export function AdminInventoryFilters({ model }) {
  return (
    <form
      onSubmit={model.applyFilters}
      className='mt-7 grid gap-4 border-y border-[var(--color-border)] py-5 md:grid-cols-2 xl:grid-cols-3'>
      <Input
        id='inventory-search'
        name='q'
        label='Search'
        type='search'
        value={model.filterForm.q}
        placeholder='Product name or brand'
        onChange={model.handleFilterChange}
      />

      <Select
        id='inventory-sport'
        name='sport'
        label='Sport'
        disabled={model.referencesLoading}
        value={model.filterForm.sport}
        onChange={model.handleFilterChange}>
        <option value=''>All Sports</option>

        {model.sports.map((sport) => (
          <option key={sport.value} value={sport.value}>
            {sport.label}
          </option>
        ))}
      </Select>

      <Select
        id='inventory-category'
        name='categoryId'
        label='Category'
        disabled={model.referencesLoading}
        value={model.filterForm.categoryId}
        onChange={model.handleFilterChange}>
        <option value=''>All Categories</option>

        {model.visibleCategories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
            {!category.isActive ? ' (Inactive)' : ''}
          </option>
        ))}
      </Select>

      <Select
        id='inventory-stock-state'
        name='stockState'
        label='Stock state'
        value={model.filterForm.stockState}
        onChange={model.handleFilterChange}>
        <option value=''>All stock states</option>

        <option value='in_stock'>In stock</option>

        <option value='low_stock'>Low stock</option>

        <option value='out_of_stock'>Out of stock</option>
      </Select>

      <Select
        id='inventory-sort'
        name='sort'
        label='Sort'
        value={model.filterForm.sort}
        onChange={model.handleFilterChange}>
        <option value='updatedAt'>Last updated</option>

        <option value='quantity'>Quantity</option>
      </Select>

      <Select
        id='inventory-order'
        name='order'
        label='Order'
        value={model.filterForm.order}
        onChange={model.handleFilterChange}>
        <option value='desc'>Descending</option>

        <option value='asc'>Ascending</option>
      </Select>

      <div className='flex flex-wrap gap-3 xl:col-span-3'>
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
