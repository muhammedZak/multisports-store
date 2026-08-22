import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Select } from '../../../components/ui/Select.jsx';

export function AdminProductFilters({ model }) {
  return (
    <form
      onSubmit={model.applyFilters}
      className='mt-7 grid gap-4 border-y border-[var(--color-border)] py-5 md:grid-cols-2 xl:grid-cols-4'>
      <Input
        id='admin-product-search'
        name='q'
        label='Search'
        type='search'
        value={model.filterForm.q}
        placeholder='Name or brand'
        onChange={model.handleFilterChange}
      />

      <Input
        id='admin-product-brand'
        name='brand'
        label='Brand'
        value={model.filterForm.brand}
        placeholder='Nike'
        onChange={model.handleFilterChange}
      />

      <Select
        id='admin-product-sport'
        name='sport'
        label='Sport'
        disabled={model.referencesLoading}
        value={model.filterForm.sport}
        onChange={model.handleFilterChange}>
        <option value=''>All sports</option>

        {model.sports.map((sport) => (
          <option key={sport.value} value={sport.value}>
            {sport.label}
          </option>
        ))}
      </Select>

      <Select
        id='admin-product-category'
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
        id='admin-product-status'
        name='status'
        label='Status'
        value={model.filterForm.status}
        onChange={model.handleFilterChange}>
        <option value=''>All statuses</option>

        <option value='active'>Active</option>

        <option value='inactive'>Inactive</option>
      </Select>

      <Select
        id='admin-product-sort'
        name='sort'
        label='Sort'
        value={model.filterForm.sort}
        onChange={model.handleFilterChange}>
        <option value='createdAt'>Created</option>

        <option value='name'>Name</option>

        <option value='basePrice'>Price</option>
      </Select>

      <Select
        id='admin-product-order'
        name='order'
        label='Order'
        value={model.filterForm.order}
        onChange={model.handleFilterChange}>
        <option value='desc'>Descending</option>

        <option value='asc'>Ascending</option>
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
