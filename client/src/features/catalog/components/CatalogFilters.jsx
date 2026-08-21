import { Alert } from '../../../components/ui/Alert.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Select } from '../../../components/ui/Select.jsx';

import { formatInrFromPaise } from '../../../utils/money.js';

export function CatalogFilters({
  filterForm,
  formErrors,

  sports,
  visibleCategories,

  brandOptions,
  sizeOptions,
  colorOptions,
  availabilityOptions,

  priceRange,

  loading,
  referencesLoading,
  filterOptionsError,

  onChange,
  onSubmit,
  onClear,
}) {
  return (
    <form onSubmit={onSubmit} className='space-y-8'>
      <section className='space-y-4'>
        <div>
          <p className='mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]'>
            Discover
          </p>

          <h3 className='mb-0 text-base font-bold'>Find your gear</h3>
        </div>

        <Input
          name='q'
          type='search'
          label='Search'
          placeholder='Product or brand'
          value={filterForm.q}
          onChange={onChange}
        />
      </section>

      <section className='space-y-4 border-t border-[var(--color-border)] pt-6'>
        <p className='mb-0 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]'>
          Category
        </p>

        <Select
          name='sport'
          label='Sport'
          value={filterForm.sport}
          disabled={referencesLoading}
          onChange={onChange}>
          <option value=''>All sports</option>

          {sports.map((sport) => (
            <option key={sport.value} value={sport.value}>
              {sport.label}
            </option>
          ))}
        </Select>

        <Select
          name='categoryId'
          label='Category'
          value={filterForm.categoryId}
          disabled={referencesLoading}
          onChange={onChange}>
          <option value=''>All categories</option>

          {visibleCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>

        <Select
          name='brand'
          label='Brand'
          value={filterForm.brand}
          onChange={onChange}>
          <option value=''>All brands</option>

          {brandOptions.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </Select>
      </section>

      <fieldset className='space-y-4 border-t border-[var(--color-border)] pt-6'>
        <legend className='mb-4 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]'>
          Price
        </legend>

        <div className='grid grid-cols-2 gap-3'>
          <Input
            name='minPrice'
            label='Minimum'
            inputMode='decimal'
            placeholder='₹ Min'
            value={filterForm.minPrice}
            error={formErrors.minPrice}
            onChange={onChange}
          />

          <Input
            name='maxPrice'
            label='Maximum'
            inputMode='decimal'
            placeholder='₹ Max'
            value={filterForm.maxPrice}
            error={formErrors.maxPrice}
            onChange={onChange}
          />
        </div>

        {priceRange?.min !== null && priceRange?.max !== null ? (
          <p className='mb-0 text-xs leading-5 text-[var(--color-muted)]'>
            Available range: {formatInrFromPaise(priceRange.min)} –{' '}
            {formatInrFromPaise(priceRange.max)}
          </p>
        ) : null}
      </fieldset>

      <section className='space-y-4 border-t border-[var(--color-border)] pt-6'>
        <p className='mb-0 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]'>
          Product options
        </p>

        <Select
          name='size'
          label='Size'
          value={filterForm.size}
          onChange={onChange}>
          <option value=''>All sizes</option>

          {sizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </Select>

        <Select
          name='color'
          label='Color'
          value={filterForm.color}
          onChange={onChange}>
          <option value=''>All colors</option>

          {colorOptions.map((color) => (
            <option key={color} value={color}>
              {color}
            </option>
          ))}
        </Select>

        <Select
          name='rating'
          label='Customer rating'
          value={filterForm.rating}
          onChange={onChange}>
          <option value=''>All ratings</option>

          <option value='5'>5 stars</option>

          <option value='4'>4+ stars</option>

          <option value='3'>3+ stars</option>

          <option value='2'>2+ stars</option>

          <option value='1'>1+ stars</option>
        </Select>

        <Select
          name='availability'
          label='Availability'
          hint='In stock includes low-stock products.'
          value={filterForm.availability}
          onChange={onChange}>
          <option value=''>All availability</option>

          {availabilityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </section>

      {filterOptionsError ? (
        <Alert variant='warning' title='Limited filter options'>
          {filterOptionsError.message}
        </Alert>
      ) : null}

      <div className='flex gap-3 border-t border-[var(--color-border)] pt-6'>
        <Button type='submit' disabled={loading} className='flex-1'>
          Apply filters
        </Button>

        <Button
          type='button'
          variant='secondary'
          disabled={loading}
          onClick={onClear}>
          Clear
        </Button>
      </div>
    </form>
  );
}
