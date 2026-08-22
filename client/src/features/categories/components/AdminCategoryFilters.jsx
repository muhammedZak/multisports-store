import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Select } from '../../../components/ui/Select.jsx';

export function AdminCategoryFilters({ model }) {
  return (
    <form
      onSubmit={model.applyFilters}
      className='mt-5 grid gap-4 border-y border-[var(--color-border)] py-5 md:grid-cols-3'>
      <Input
        id='category-search'
        name='q'
        label='Search'
        type='search'
        value={model.filterForm.q}
        placeholder='Category name'
        onChange={model.handleFilterChange}
      />

      <Select
        id='category-filter-sport'
        name='sport'
        label='Sport'
        value={model.filterForm.sport}
        disabled={model.sportsLoading}
        onChange={model.handleFilterChange}>
        <option value=''>All sports</option>

        {model.sports.map((sport) => (
          <option key={sport.value} value={sport.value}>
            {sport.label}
          </option>
        ))}
      </Select>

      <Select
        id='category-status'
        name='status'
        label='Status'
        value={model.filterForm.status}
        onChange={model.handleFilterChange}>
        <option value=''>All statuses</option>

        <option value='active'>Active</option>

        <option value='inactive'>Inactive</option>
      </Select>

      <div className='flex flex-wrap gap-3 md:col-span-3'>
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
