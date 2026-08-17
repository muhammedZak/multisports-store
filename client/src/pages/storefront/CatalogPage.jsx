import { useEffect, useMemo, useState } from 'react';

import { Link, useNavigate, useSearchParams } from 'react-router';

import {
  fetchCatalogFilterOptions,
  fetchPublicProducts,
} from '../../api/productApi.js';

import { fetchPublicCategories, fetchSports } from '../../api/categoryApi.js';

import { normalizeApiError } from '../../api/errors.js';

import {
  formatInrFromPaise,
  paiseToRupeesInput,
  parseRupeesToPaise,
} from '../../utils/money.js';

const EMPTY_FILTER_OPTIONS = {
  brands: [],
  categories: [],
  priceRange: {
    min: null,
    max: null,
  },
  sizes: [],
  colors: [],
};

const DEFAULT_META = {
  page: 1,
  limit: 20,
  totalItems: 0,
  totalPages: 0,
};

const SORT_VALUES = ['createdAt:desc', 'price:asc', 'price:desc'];

function normalizeParam(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function getPositiveInteger(value, fallback) {
  const parsedValue = Number(value);

  if (!Number.isSafeInteger(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return parsedValue;
}

function getCatalogQuery(searchParams) {
  return {
    page: getPositiveInteger(searchParams.get('page'), 1),

    limit: 20,

    q: normalizeParam(searchParams.get('q')),

    sport: normalizeParam(searchParams.get('sport')),

    categoryId: normalizeParam(searchParams.get('categoryId')),

    brand: normalizeParam(searchParams.get('brand')),

    minPrice: searchParams.get('minPrice') ?? '',

    maxPrice: searchParams.get('maxPrice') ?? '',

    size: normalizeParam(searchParams.get('size')),

    color: normalizeParam(searchParams.get('color')),

    sort: normalizeParam(searchParams.get('sort')) || 'createdAt',

    order: normalizeParam(searchParams.get('order')) || 'desc',
  };
}

function getRupeesValue(paiseValue) {
  if (paiseValue === '') {
    return '';
  }

  const parsedValue = Number(paiseValue);

  if (!Number.isSafeInteger(parsedValue)) {
    return '';
  }

  return paiseToRupeesInput(parsedValue);
}

function createFilterForm(query) {
  return {
    q: query.q,
    sport: query.sport,
    categoryId: query.categoryId,
    brand: query.brand,
    minPrice: getRupeesValue(query.minPrice),
    maxPrice: getRupeesValue(query.maxPrice),
    size: query.size,
    color: query.color,
  };
}

function getSortValue(query) {
  const value = `${query.sort}:${query.order}`;

  if (SORT_VALUES.includes(value)) {
    return value;
  }

  return 'createdAt:desc';
}

function includeCurrentOption(options, currentValue) {
  if (!currentValue) {
    return options;
  }

  const currentKey = currentValue.toLowerCase();

  const alreadyExists = options.some(
    (option) => option.toLowerCase() === currentKey,
  );

  if (alreadyExists) {
    return options;
  }

  return [currentValue, ...options];
}

function getDiscountLabel(product) {
  if (!product.discount) {
    return null;
  }

  if (product.discount.type === 'percentage') {
    return `${product.discount.value}% off`;
  }

  if (product.discount.type === 'fixed') {
    return `${formatInrFromPaise(product.discount.value)} off`;
  }

  return null;
}

function ProductCard({ product }) {
  const hasDiscount = product.currentPrice < product.basePrice;

  const discountLabel = getDiscountLabel(product);

  return (
    <article>
      <Link
        to={`/products/${product.id}`}
        className='group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-4'>
        <div className='aspect-square overflow-hidden bg-neutral-100'>
          {product.primaryImage?.url ? (
            <img
              src={product.primaryImage.url}
              alt={product.primaryImage.altText || product.name}
              className='h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]'
            />
          ) : (
            <div className='flex h-full items-center justify-center text-sm text-neutral-500'>
              No image
            </div>
          )}
        </div>

        <div className='pt-4'>
          <p className='text-xs font-medium uppercase tracking-[0.12em] text-neutral-500'>
            {product.category?.name || product.sport}
          </p>

          <h2 className='mt-2 font-semibold leading-6 group-hover:underline group-hover:underline-offset-4'>
            {product.name}
          </h2>

          <p className='mt-1 text-sm text-neutral-500'>{product.brand}</p>

          <div className='mt-3 flex flex-wrap items-baseline gap-2'>
            <p className='font-semibold'>
              {formatInrFromPaise(product.currentPrice)}
            </p>

            {hasDiscount && (
              <p className='text-sm text-neutral-400 line-through'>
                {formatInrFromPaise(product.basePrice)}
              </p>
            )}

            {discountLabel && (
              <p className='text-xs font-medium text-green-700'>
                {discountLabel}
              </p>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}

function CatalogPage({ mode = 'shop' }) {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const searchParamsKey = searchParams.toString();

  const catalogQuery = useMemo(
    () => getCatalogQuery(new URLSearchParams(searchParamsKey)),
    [searchParamsKey],
  );

  const [products, setProducts] = useState([]);

  const [meta, setMeta] = useState(DEFAULT_META);

  const [sports, setSports] = useState([]);

  const [categories, setCategories] = useState([]);

  const [filterOptions, setFilterOptions] = useState(EMPTY_FILTER_OPTIONS);

  const [filterForm, setFilterForm] = useState(() =>
    createFilterForm(catalogQuery),
  );

  const [formErrors, setFormErrors] = useState({});

  const [loading, setLoading] = useState(true);

  const [referencesLoading, setReferencesLoading] = useState(true);

  const [listError, setListError] = useState(null);

  const [referencesError, setReferencesError] = useState(null);

  const [filterOptionsError, setFilterOptionsError] = useState(null);

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setFilterForm(createFilterForm(catalogQuery));
    setFormErrors({});
  }, [catalogQuery]);

  useEffect(() => {
    let cancelled = false;

    async function loadReferences() {
      setReferencesLoading(true);
      setReferencesError(null);

      try {
        const [sportItems, categoryItems] = await Promise.all([
          fetchSports(),
          fetchPublicCategories(),
        ]);

        if (cancelled) {
          return;
        }

        setSports(sportItems);
        setCategories(categoryItems);
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        setReferencesError(
          normalizeApiError(requestError, 'Unable to load catalog references.'),
        );
      } finally {
        if (!cancelled) {
          setReferencesLoading(false);
        }
      }
    }

    loadReferences();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      setLoading(true);
      setListError(null);
      setFilterOptionsError(null);

      const [productRequest, filterOptionsRequest] = await Promise.allSettled([
        fetchPublicProducts(catalogQuery),

        fetchCatalogFilterOptions({
          q: catalogQuery.q,
          sport: catalogQuery.sport,
          categoryId: catalogQuery.categoryId,
        }),
      ]);

      if (cancelled) {
        return;
      }

      if (productRequest.status === 'fulfilled') {
        setProducts(productRequest.value.items);
        setMeta(productRequest.value.meta);
      } else {
        setProducts([]);
        setMeta(DEFAULT_META);

        setListError(
          normalizeApiError(
            productRequest.reason,
            'Unable to load products. Please try again.',
          ),
        );
      }

      if (filterOptionsRequest.status === 'fulfilled') {
        setFilterOptions(filterOptionsRequest.value);
      } else {
        setFilterOptions(EMPTY_FILTER_OPTIONS);

        setFilterOptionsError(
          normalizeApiError(
            filterOptionsRequest.reason,
            'Unable to load filter options.',
          ),
        );
      }

      setLoading(false);
    }

    loadCatalog();

    return () => {
      cancelled = true;
    };
  }, [catalogQuery, reloadKey]);

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

    const textFields = ['q', 'sport', 'categoryId', 'brand', 'size', 'color'];

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

  const sportLabel =
    sports.find((sport) => sport.value === catalogQuery.sport)?.label ??
    catalogQuery.sport;

  const categoryLabel =
    categories.find((category) => category.id === catalogQuery.categoryId)
      ?.name ?? '';

  const activeFilters = [];

  if (catalogQuery.q) {
    activeFilters.push({
      key: 'q',
      label: `Search: ${catalogQuery.q}`,
    });
  }

  if (catalogQuery.sport) {
    activeFilters.push({
      key: 'sport',
      label: sportLabel,
    });
  }

  if (catalogQuery.categoryId) {
    activeFilters.push({
      key: 'categoryId',
      label: categoryLabel || 'Selected category',
    });
  }

  if (catalogQuery.brand) {
    activeFilters.push({
      key: 'brand',
      label: catalogQuery.brand,
    });
  }

  if (catalogQuery.minPrice !== '') {
    const value = Number(catalogQuery.minPrice);

    activeFilters.push({
      key: 'minPrice',
      label: `From ${
        Number.isSafeInteger(value)
          ? formatInrFromPaise(value)
          : catalogQuery.minPrice
      }`,
    });
  }

  if (catalogQuery.maxPrice !== '') {
    const value = Number(catalogQuery.maxPrice);

    activeFilters.push({
      key: 'maxPrice',
      label: `Up to ${
        Number.isSafeInteger(value)
          ? formatInrFromPaise(value)
          : catalogQuery.maxPrice
      }`,
    });
  }

  if (catalogQuery.size) {
    activeFilters.push({
      key: 'size',
      label: `Size ${catalogQuery.size}`,
    });
  }

  if (catalogQuery.color) {
    activeFilters.push({
      key: 'color',
      label: catalogQuery.color,
    });
  }

  const pageTitle =
    mode === 'search' && catalogQuery.q
      ? `Results for “${catalogQuery.q}”`
      : categoryLabel || sportLabel || 'Shop all sports';

  function renderFilters() {
    return (
      <form onSubmit={handleFilterSubmit} className='space-y-6'>
        <div>
          <label
            htmlFor='catalog-search'
            className='mb-2 block text-sm font-medium'>
            Search
          </label>

          <input
            id='catalog-search'
            name='q'
            type='search'
            value={filterForm.q}
            onChange={handleFilterChange}
            placeholder='Product or brand'
            className='w-full border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-black'
          />
        </div>

        <div>
          <label htmlFor='sport' className='mb-2 block text-sm font-medium'>
            Sport
          </label>

          <select
            id='sport'
            name='sport'
            value={filterForm.sport}
            disabled={referencesLoading}
            onChange={handleFilterChange}
            className='w-full border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-black disabled:bg-neutral-100'>
            <option value=''>All sports</option>

            {sports.map((sport) => (
              <option key={sport.value} value={sport.value}>
                {sport.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor='categoryId'
            className='mb-2 block text-sm font-medium'>
            Category
          </label>

          <select
            id='categoryId'
            name='categoryId'
            value={filterForm.categoryId}
            disabled={referencesLoading}
            onChange={handleFilterChange}
            className='w-full border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-black disabled:bg-neutral-100'>
            <option value=''>All categories</option>

            {visibleCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor='brand' className='mb-2 block text-sm font-medium'>
            Brand
          </label>

          <select
            id='brand'
            name='brand'
            value={filterForm.brand}
            onChange={handleFilterChange}
            className='w-full border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-black'>
            <option value=''>All brands</option>

            {brandOptions.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className='mb-2 text-sm font-medium'>Price</legend>

          <div className='grid grid-cols-2 gap-2'>
            <div>
              <input
                name='minPrice'
                inputMode='decimal'
                value={filterForm.minPrice}
                onChange={handleFilterChange}
                placeholder='Min ₹'
                aria-label='Minimum price in rupees'
                className='w-full border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-black'
              />

              {formErrors.minPrice && (
                <p className='mt-1 text-xs text-red-600'>
                  {formErrors.minPrice}
                </p>
              )}
            </div>

            <div>
              <input
                name='maxPrice'
                inputMode='decimal'
                value={filterForm.maxPrice}
                onChange={handleFilterChange}
                placeholder='Max ₹'
                aria-label='Maximum price in rupees'
                className='w-full border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-black'
              />

              {formErrors.maxPrice && (
                <p className='mt-1 text-xs text-red-600'>
                  {formErrors.maxPrice}
                </p>
              )}
            </div>
          </div>

          {filterOptions.priceRange?.min !== null &&
            filterOptions.priceRange?.max !== null && (
              <p className='mt-2 text-xs text-neutral-500'>
                Available: {formatInrFromPaise(filterOptions.priceRange.min)} –{' '}
                {formatInrFromPaise(filterOptions.priceRange.max)}
              </p>
            )}
        </fieldset>

        <div>
          <label htmlFor='size' className='mb-2 block text-sm font-medium'>
            Size
          </label>

          <select
            id='size'
            name='size'
            value={filterForm.size}
            onChange={handleFilterChange}
            className='w-full border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-black'>
            <option value=''>All sizes</option>

            {sizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor='color' className='mb-2 block text-sm font-medium'>
            Color
          </label>

          <select
            id='color'
            name='color'
            value={filterForm.color}
            onChange={handleFilterChange}
            className='w-full border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-black'>
            <option value=''>All colors</option>

            {colorOptions.map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </select>
        </div>

        {filterOptionsError && (
          <p className='text-sm text-red-600'>{filterOptionsError.message}</p>
        )}

        <div className='flex gap-3'>
          <button
            type='submit'
            disabled={loading}
            className='flex-1 bg-black px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50'>
            Apply filters
          </button>

          <button
            type='button'
            onClick={clearFilters}
            disabled={loading}
            className='border border-neutral-300 px-4 py-2.5 text-sm font-medium disabled:opacity-50'>
            Clear
          </button>
        </div>
      </form>
    );
  }

  return (
    <main className='mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-12'>
      <div className='flex flex-col gap-5 md:flex-row md:items-end md:justify-between'>
        <div>
          <p className='text-sm font-medium uppercase tracking-[0.2em] text-neutral-500'>
            MultiSports Store
          </p>

          <h1 className='mt-3 text-3xl font-semibold tracking-tight sm:text-4xl'>
            {pageTitle}
          </h1>

          {!loading && !listError && (
            <p className='mt-3 text-sm text-neutral-600'>
              {meta.totalItems} product
              {meta.totalItems === 1 ? '' : 's'}
            </p>
          )}
        </div>

        <div className='flex gap-3'>
          <button
            type='button'
            onClick={() => setMobileFiltersOpen((current) => !current)}
            className='border border-neutral-300 px-4 py-2.5 text-sm font-medium lg:hidden'>
            Filters
          </button>

          <div>
            <label htmlFor='catalog-sort' className='sr-only'>
              Sort products
            </label>

            <select
              id='catalog-sort'
              value={getSortValue(catalogQuery)}
              onChange={handleSortChange}
              className='border border-neutral-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-black'>
              <option value='createdAt:desc'>Newest</option>

              <option value='price:asc'>Price: Low to High</option>

              <option value='price:desc'>Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className='mt-6 flex flex-wrap gap-2'>
          {activeFilters.map((filter) => (
            <button
              key={filter.key}
              type='button'
              onClick={() => removeFilter(filter.key)}
              className='border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-xs font-medium hover:border-black'>
              {filter.label} ×
            </button>
          ))}

          <button
            type='button'
            onClick={clearFilters}
            className='px-2 py-1.5 text-xs font-medium underline underline-offset-4'>
            Clear all
          </button>
        </div>
      )}

      {referencesError && (
        <div
          role='alert'
          className='mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          {referencesError.message}
        </div>
      )}

      {mobileFiltersOpen && (
        <div className='mt-6 border border-neutral-200 p-5 lg:hidden'>
          {renderFilters()}
        </div>
      )}

      <div className='mt-8 grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]'>
        <aside className='hidden lg:block'>
          <div className='sticky top-6'>
            <h2 className='mb-5 text-lg font-semibold'>Filters</h2>

            {renderFilters()}
          </div>
        </aside>

        <section>
          {listError && (
            <div
              role='alert'
              className='border border-red-200 bg-red-50 p-5 text-sm text-red-700'>
              <p>{listError.message}</p>

              <button
                type='button'
                onClick={() => setReloadKey((current) => current + 1)}
                className='mt-4 bg-black px-4 py-2 text-sm font-medium text-white'>
                Try again
              </button>
            </div>
          )}

          {loading && (
            <div className='grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3'>
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className='animate-pulse'>
                  <div className='aspect-square bg-neutral-200' />

                  <div className='mt-4 h-3 w-24 bg-neutral-200' />

                  <div className='mt-3 h-5 w-4/5 bg-neutral-200' />

                  <div className='mt-2 h-4 w-1/2 bg-neutral-200' />
                </div>
              ))}
            </div>
          )}

          {!loading && !listError && products.length === 0 && (
            <div className='border border-neutral-200 px-6 py-16 text-center'>
              <h2 className='text-xl font-semibold'>
                {activeFilters.length > 0
                  ? 'No matching products'
                  : 'No products available'}
              </h2>

              <p className='mx-auto mt-3 max-w-md text-sm leading-6 text-neutral-600'>
                {activeFilters.length > 0
                  ? 'Try changing your search or clearing some filters.'
                  : 'There are currently no active products available in the catalog.'}
              </p>

              {activeFilters.length > 0 && (
                <button
                  type='button'
                  onClick={clearFilters}
                  className='mt-6 bg-black px-5 py-2.5 text-sm font-medium text-white'>
                  Clear filters
                </button>
              )}
            </div>
          )}

          {!loading && !listError && products.length > 0 && (
            <>
              <div className='grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3'>
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              <div className='mt-12 flex flex-col gap-4 border-t border-neutral-200 pt-6 sm:flex-row sm:items-center sm:justify-between'>
                <p className='text-sm text-neutral-600'>
                  Page {meta.page} of {Math.max(meta.totalPages, 1)}
                </p>

                <div className='flex gap-3'>
                  <button
                    type='button'
                    disabled={meta.page <= 1 || loading}
                    onClick={() => changePage(meta.page - 1)}
                    className='border border-neutral-300 px-5 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40'>
                    Previous
                  </button>

                  <button
                    type='button'
                    disabled={meta.page >= meta.totalPages || loading}
                    onClick={() => changePage(meta.page + 1)}
                    className='border border-neutral-300 px-5 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40'>
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

export default CatalogPage;
