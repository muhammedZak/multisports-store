import { useEffect, useMemo, useState } from 'react';

import { useNavigate, useSearchParams } from 'react-router';

import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Drawer } from '../../components/ui/Drawer.jsx';
import { Select } from '../../components/ui/Select.jsx';

import { parseRupeesToPaise } from '../../utils/money.js';

import { ActiveCatalogFilters } from '../../features/catalog/components/ActiveCatalogFilters.jsx';
import { CatalogFilters } from '../../features/catalog/components/CatalogFilters.jsx';
import { CatalogPagination } from '../../features/catalog/components/CatalogPagination.jsx';
import { CatalogProductGrid } from '../../features/catalog/components/CatalogProductGrid.jsx';

import {
  AVAILABILITY_FILTER_OPTIONS,
  SORT_OPTIONS,
} from '../../features/catalog/catalog.constants.js';

import {
  createFilterForm,
  getActiveCatalogFilters,
  getCatalogContextLabels,
  getCatalogPageTitle,
  getCatalogQuery,
  getSortValue,
  includeCurrentOption,
} from '../../features/catalog/catalog.utils.js';

import { useCatalogDiscovery } from '../../features/catalog/hooks/useCatalogDiscovery.js';

function CatalogPage({ mode = 'shop' }) {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const searchParamsKey = searchParams.toString();

  const catalogQuery = useMemo(
    () => getCatalogQuery(new URLSearchParams(searchParamsKey)),
    [searchParamsKey],
  );

  const {
    products,
    meta,

    sports,
    categories,
    filterOptions,

    loading,
    referencesLoading,

    listError,
    referencesError,
    filterOptionsError,

    retryCatalog,
  } = useCatalogDiscovery(catalogQuery);

  const [filterForm, setFilterForm] = useState(() =>
    createFilterForm(catalogQuery),
  );

  const [formErrors, setFormErrors] = useState({});

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    setFilterForm(createFilterForm(catalogQuery));

    setFormErrors({});
  }, [catalogQuery]);

  const visibleCategories = useMemo(() => {
    let availableCategories = filterOptions.categories ?? [];

    if (filterOptionsError) {
      availableCategories = filterForm.sport
        ? categories.filter((category) => category.sport === filterForm.sport)
        : categories;
    }

    if (
      filterForm.categoryId &&
      !availableCategories.some(
        (category) => category.id === filterForm.categoryId,
      )
    ) {
      const selectedCategory = categories.find(
        (category) => category.id === filterForm.categoryId,
      );

      if (selectedCategory) {
        return [selectedCategory, ...availableCategories];
      }
    }

    return availableCategories;
  }, [
    categories,
    filterForm.categoryId,
    filterForm.sport,
    filterOptions.categories,
    filterOptionsError,
  ]);

  const brandOptions = includeCurrentOption(
    filterOptions.brands ?? [],
    filterForm.brand,
  );

  const sizeOptions = includeCurrentOption(
    filterOptions.sizes ?? [],
    filterForm.size,
  );

  const colorOptions = includeCurrentOption(
    filterOptions.colors ?? [],
    filterForm.color,
  );

  const availableAvailabilityValues = new Set(filterOptions.availability ?? []);

  if (filterForm.availability) {
    availableAvailabilityValues.add(filterForm.availability);
  }

  const availabilityOptions = AVAILABILITY_FILTER_OPTIONS.filter((option) =>
    availableAvailabilityValues.has(option.value),
  );

  const { sportLabel, categoryLabel } = getCatalogContextLabels({
    query: catalogQuery,
    sports,
    categories,
  });

  const activeFilters = getActiveCatalogFilters({
    query: catalogQuery,
    sportLabel,
    categoryLabel,
  });

  const pageTitle = getCatalogPageTitle({
    mode,
    query: catalogQuery,
    sportLabel,
    categoryLabel,
  });

  function navigateToCatalog(params) {
    const hasSearchQuery = Boolean(params.get('q')?.trim());

    const pathname = hasSearchQuery ? '/search' : '/shop';

    const queryString = params.toString();

    navigate(queryString ? `${pathname}?${queryString}` : pathname);
  }

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilterForm((current) => {
      const next = {
        ...current,
        [name]: value,
      };

      if (name === 'sport') {
        next.categoryId = '';
        next.brand = '';
        next.size = '';
        next.color = '';
      }

      return next;
    });

    setFormErrors((current) => ({
      ...current,
      [name]: undefined,
    }));
  }

  function handleFilterSubmit(event) {
    event.preventDefault();

    const errors = {};

    let minPrice;
    let maxPrice;

    if (filterForm.minPrice.trim()) {
      minPrice = parseRupeesToPaise(filterForm.minPrice);

      if (minPrice === null) {
        errors.minPrice = 'Enter a valid minimum price.';
      }
    }

    if (filterForm.maxPrice.trim()) {
      maxPrice = parseRupeesToPaise(filterForm.maxPrice);

      if (maxPrice === null) {
        errors.maxPrice = 'Enter a valid maximum price.';
      }
    }

    if (
      minPrice !== undefined &&
      minPrice !== null &&
      maxPrice !== undefined &&
      maxPrice !== null &&
      minPrice > maxPrice
    ) {
      errors.minPrice = 'Minimum price cannot exceed maximum price.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);

      return;
    }

    const params = new URLSearchParams();

    const textFields = [
      'q',
      'sport',
      'categoryId',
      'brand',
      'size',
      'color',
      'rating',
      'availability',
    ];

    for (const field of textFields) {
      const value = filterForm[field].trim();

      if (value) {
        params.set(field, value);
      }
    }

    if (minPrice !== undefined && minPrice !== null) {
      params.set('minPrice', String(minPrice));
    }

    if (maxPrice !== undefined && maxPrice !== null) {
      params.set('maxPrice', String(maxPrice));
    }

    if (catalogQuery.sort !== 'createdAt' || catalogQuery.order !== 'desc') {
      params.set('sort', catalogQuery.sort);

      params.set('order', catalogQuery.order);
    }

    setMobileFiltersOpen(false);

    navigateToCatalog(params);
  }

  function clearFilters() {
    const params = new URLSearchParams();

    if (catalogQuery.sort !== 'createdAt' || catalogQuery.order !== 'desc') {
      params.set('sort', catalogQuery.sort);

      params.set('order', catalogQuery.order);
    }

    setMobileFiltersOpen(false);

    navigateToCatalog(params);
  }

  function removeFilter(field) {
    const params = new URLSearchParams(searchParamsKey);

    params.delete(field);

    params.delete('page');

    if (field === 'sport') {
      params.delete('categoryId');
    }

    navigateToCatalog(params);
  }

  function handleSortChange(event) {
    const [sort, order] = event.target.value.split(':');

    const params = new URLSearchParams(searchParamsKey);

    params.delete('page');

    if (sort === 'createdAt' && order === 'desc') {
      params.delete('sort');

      params.delete('order');
    } else {
      params.set('sort', sort);

      params.set('order', order);
    }

    navigateToCatalog(params);
  }

  function changePage(page) {
    const params = new URLSearchParams(searchParamsKey);

    if (page <= 1) {
      params.delete('page');
    } else {
      params.set('page', String(page));
    }

    navigateToCatalog(params);

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  const filterProps = {
    filterForm,
    formErrors,

    sports,
    visibleCategories,

    brandOptions,
    sizeOptions,
    colorOptions,
    availabilityOptions,

    priceRange: filterOptions.priceRange,

    loading,
    referencesLoading,
    filterOptionsError,

    onChange: handleFilterChange,

    onSubmit: handleFilterSubmit,

    onClear: clearFilters,
  };

  return (
    <main className='ds-container py-8 lg:py-12'>
      <header className='border-b border-[var(--color-border)] pb-7 lg:pb-8'>
        <div className='flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between'>
          <div className='max-w-3xl'>
            <p className='mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-muted)]'>
              Product discovery
            </p>

            <h1 className='mb-0 text-3xl font-black leading-tight tracking-[-0.045em] sm:text-4xl lg:text-5xl'>
              {pageTitle}
            </h1>

            {!loading && !listError ? (
              <p className='mt-3 mb-0 text-sm text-[var(--color-muted)]'>
                {meta.totalItems} product
                {meta.totalItems === 1 ? '' : 's'}
              </p>
            ) : null}
          </div>

          <div className='flex items-end gap-3'>
            <Button
              type='button'
              variant='secondary'
              onClick={() => setMobileFiltersOpen(true)}
              className='lg:hidden'>
              Filters
              {activeFilters.length > 0 ? ` (${activeFilters.length})` : ''}
            </Button>

            <div className='w-full min-w-[190px] sm:w-auto'>
              <Select
                label='Sort by'
                value={getSortValue(catalogQuery)}
                onChange={handleSortChange}>
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      </header>

      <ActiveCatalogFilters
        filters={activeFilters}
        onRemove={removeFilter}
        onClear={clearFilters}
      />

      {referencesError ? (
        <div className='mt-6'>
          <Alert
            variant='warning'
            title='Some catalog references are unavailable'>
            {referencesError.message}
          </Alert>
        </div>
      ) : null}

      <div className='mt-8 grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] xl:gap-10'>
        <aside className='hidden border-r border-[var(--color-border)] pr-6 lg:block'>
          <div className='sticky top-24'>
            <div className='mb-6'>
              <p className='mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]'>
                Refine
              </p>

              <h2 className='mb-0 text-xl font-black tracking-[-0.025em]'>
                Filters
              </h2>
            </div>

            <CatalogFilters {...filterProps} />
          </div>
        </aside>

        <section aria-label='Products' className='min-w-0'>
          <CatalogProductGrid
            products={products}
            loading={loading}
            listError={listError}
            activeFilterCount={activeFilters.length}
            onRetry={retryCatalog}
            onClearFilters={clearFilters}
          />

          {!loading && !listError && products.length > 0 ? (
            <CatalogPagination
              meta={meta}
              loading={loading}
              onPageChange={changePage}
            />
          ) : null}
        </section>
      </div>

      <Drawer
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        title='Filters'
        description={
          activeFilters.length > 0
            ? `${activeFilters.length} applied filter${activeFilters.length === 1 ? '' : 's'}`
            : 'Refine the product catalog'
        }>
        <CatalogFilters {...filterProps} />
      </Drawer>
    </main>
  );
}

export default CatalogPage;
