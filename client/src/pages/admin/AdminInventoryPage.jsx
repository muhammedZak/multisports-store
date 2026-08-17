import { useCallback, useEffect, useState } from 'react';

import { Link } from 'react-router';

import { fetchAdminCategories, fetchSports } from '../../api/categoryApi.js';

import { normalizeApiError } from '../../api/errors.js';

import { fetchAdminInventories } from '../../api/inventoryApi.js';

const EMPTY_FILTERS = {
  q: '',
  sport: '',
  categoryId: '',
  stockState: '',
  sort: 'updatedAt',
  order: 'desc',
};

const DEFAULT_QUERY = {
  ...EMPTY_FILTERS,
  page: 1,
  limit: 20,
};

function formatDate(value) {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getStockStateLabel(stockState) {
  if (stockState === 'in_stock') {
    return 'In stock';
  }

  if (stockState === 'low_stock') {
    return 'Low stock';
  }

  if (stockState === 'out_of_stock') {
    return 'Out of stock';
  }

  return stockState;
}

function getStockStateClass(stockState) {
  if (stockState === 'in_stock') {
    return 'bg-green-100 text-green-700';
  }

  if (stockState === 'low_stock') {
    return 'bg-amber-100 text-amber-700';
  }

  if (stockState === 'out_of_stock') {
    return 'bg-red-100 text-red-700';
  }

  return 'bg-neutral-100 text-neutral-700';
}

function formatVariantOptions(variant) {
  if (!variant) {
    return 'Simple product';
  }

  const options = Object.entries(variant.options ?? {});

  if (options.length === 0) {
    return 'Variant';
  }

  return options
    .map(([name, value]) => `${name}: ${String(value)}`)
    .join(' · ');
}

function AdminInventoryPage() {
  const [inventories, setInventories] = useState([]);

  const [sports, setSports] = useState([]);

  const [categories, setCategories] = useState([]);

  const [filterForm, setFilterForm] = useState(EMPTY_FILTERS);

  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_QUERY);

  const [meta, setMeta] = useState({
    page: 1,
    limit: 20,
    totalItems: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(true);

  const [referencesLoading, setReferencesLoading] = useState(true);

  const [listError, setListError] = useState(null);

  const [referencesError, setReferencesError] = useState(null);

  const loadInventories = useCallback(async () => {
    setLoading(true);
    setListError(null);

    try {
      const result = await fetchAdminInventories(appliedFilters);

      setInventories(result.items);
      setMeta(result.meta);
    } catch (requestError) {
      setListError(
        normalizeApiError(
          requestError,
          'Unable to load inventory. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    loadInventories();
  }, [loadInventories]);

  useEffect(() => {
    async function loadReferences() {
      setReferencesLoading(true);
      setReferencesError(null);

      try {
        const [sportItems, categoryItems] = await Promise.all([
          fetchSports(),
          fetchAdminCategories(),
        ]);

        setSports(sportItems);
        setCategories(categoryItems);
      } catch (requestError) {
        setReferencesError(
          normalizeApiError(requestError, 'Unable to load catalog references.'),
        );
      } finally {
        setReferencesLoading(false);
      }
    }

    loadReferences();
  }, []);

  const visibleCategories = filterForm.sport
    ? categories.filter((category) => category.sport === filterForm.sport)
    : categories;

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilterForm((current) => {
      const next = {
        ...current,
        [name]: value,
      };

      if (name === 'sport' && value) {
        const selectedCategory = categories.find(
          (category) => category.id === current.categoryId,
        );

        if (selectedCategory && selectedCategory.sport !== value) {
          next.categoryId = '';
        }
      }

      return next;
    });
  }

  function handleFilterSubmit(event) {
    event.preventDefault();

    setAppliedFilters({
      ...filterForm,
      q: filterForm.q.trim(),
      page: 1,
      limit: 20,
    });
  }

  function handleResetFilters() {
    setFilterForm(EMPTY_FILTERS);
    setAppliedFilters(DEFAULT_QUERY);
  }

  function changePage(page) {
    setAppliedFilters((current) => ({
      ...current,
      page,
    }));
  }

  function getSportLabel(value) {
    return sports.find((sport) => sport.value === value)?.label ?? value;
  }

  return (
    <main className='p-5 sm:p-6'>
      <div>
        <p className='text-sm font-medium uppercase tracking-[0.2em] text-neutral-500'>
          Stock management
        </p>

        <h1 className='mt-3 text-3xl font-semibold'>Inventory</h1>

        <p className='mt-3 max-w-2xl text-sm leading-6 text-neutral-600'>
          View exact stock positions for simple products and product variants.
        </p>
      </div>

      {referencesError && (
        <div
          role='alert'
          className='mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          {referencesError.message}
        </div>
      )}

      <form
        onSubmit={handleFilterSubmit}
        className='mt-8 grid gap-4 border border-neutral-200 p-4 md:grid-cols-2 xl:grid-cols-3'>
        <div>
          <label htmlFor='q' className='mb-2 block text-sm font-medium'>
            Search
          </label>

          <input
            id='q'
            name='q'
            type='search'
            value={filterForm.q}
            onChange={handleFilterChange}
            placeholder='Product name or brand'
            className='w-full border border-neutral-300 px-3 py-2.5 outline-none focus:border-black'
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
            className='w-full border border-neutral-300 bg-white px-3 py-2.5 outline-none focus:border-black disabled:bg-neutral-100'>
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
            className='w-full border border-neutral-300 bg-white px-3 py-2.5 outline-none focus:border-black disabled:bg-neutral-100'>
            <option value=''>All categories</option>

            {visibleCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
                {!category.isActive ? ' (Inactive)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor='stockState'
            className='mb-2 block text-sm font-medium'>
            Stock state
          </label>

          <select
            id='stockState'
            name='stockState'
            value={filterForm.stockState}
            onChange={handleFilterChange}
            className='w-full border border-neutral-300 bg-white px-3 py-2.5 outline-none focus:border-black'>
            <option value=''>All stock states</option>
            <option value='in_stock'>In stock</option>
            <option value='low_stock'>Low stock</option>
            <option value='out_of_stock'>Out of stock</option>
          </select>
        </div>

        <div>
          <label htmlFor='sort' className='mb-2 block text-sm font-medium'>
            Sort
          </label>

          <select
            id='sort'
            name='sort'
            value={filterForm.sort}
            onChange={handleFilterChange}
            className='w-full border border-neutral-300 bg-white px-3 py-2.5 outline-none focus:border-black'>
            <option value='updatedAt'>Last updated</option>
            <option value='quantity'>Quantity</option>
          </select>
        </div>

        <div>
          <label htmlFor='order' className='mb-2 block text-sm font-medium'>
            Order
          </label>

          <select
            id='order'
            name='order'
            value={filterForm.order}
            onChange={handleFilterChange}
            className='w-full border border-neutral-300 bg-white px-3 py-2.5 outline-none focus:border-black'>
            <option value='desc'>Descending</option>
            <option value='asc'>Ascending</option>
          </select>
        </div>

        <div className='flex items-end gap-3'>
          <button
            type='submit'
            disabled={loading}
            className='bg-black px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50'>
            Apply
          </button>

          <button
            type='button'
            disabled={loading}
            onClick={handleResetFilters}
            className='border border-neutral-300 px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50'>
            Reset
          </button>
        </div>
      </form>

      {listError && (
        <div
          role='alert'
          className='mt-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          {listError.message}
        </div>
      )}

      {loading && (
        <div className='mt-5 border border-neutral-200 p-8 text-sm text-neutral-600'>
          Loading inventory...
        </div>
      )}

      {!loading && listError && inventories.length === 0 && (
        <button
          type='button'
          onClick={loadInventories}
          className='mt-4 bg-black px-4 py-2 text-sm font-medium text-white'>
          Try again
        </button>
      )}

      {!loading && !listError && inventories.length === 0 && (
        <div className='mt-5 border border-neutral-200 p-8 text-center'>
          <h2 className='font-semibold'>No inventory positions found</h2>

          <p className='mt-2 text-sm text-neutral-600'>
            Try changing or clearing the current filters.
          </p>

          <button
            type='button'
            onClick={handleResetFilters}
            className='mt-5 bg-black px-4 py-2.5 text-sm font-medium text-white'>
            Clear filters
          </button>
        </div>
      )}

      {!loading && inventories.length > 0 && (
        <>
          {/* Mobile */}
          <div className='mt-5 grid gap-4 md:hidden'>
            {inventories.map((inventory) => (
              <article
                key={inventory.id}
                className='border border-neutral-200 p-4'>
                <div className='flex items-start justify-between gap-4'>
                  <div>
                    <h2 className='font-medium'>{inventory.product.name}</h2>

                    <p className='mt-1 text-xs text-neutral-500'>
                      {inventory.product.brand} ·{' '}
                      {getSportLabel(inventory.product.sport)}
                    </p>
                  </div>

                  <span
                    className={[
                      'shrink-0 px-2.5 py-1 text-xs font-medium',
                      getStockStateClass(inventory.stockState),
                    ].join(' ')}>
                    {getStockStateLabel(inventory.stockState)}
                  </span>
                </div>

                <dl className='mt-4 space-y-3 text-sm'>
                  <div>
                    <dt className='text-neutral-500'>Inventory</dt>
                    <dd className='mt-1 font-medium'>
                      {formatVariantOptions(inventory.variant)}
                    </dd>
                  </div>

                  <div>
                    <dt className='text-neutral-500'>Category</dt>
                    <dd className='mt-1'>
                      {inventory.product.category?.name ?? '—'}
                    </dd>
                  </div>

                  <div>
                    <dt className='text-neutral-500'>Exact quantity</dt>
                    <dd className='mt-1 text-lg font-semibold'>
                      {inventory.quantity}
                    </dd>
                  </div>

                  <div>
                    <dt className='text-neutral-500'>Updated</dt>
                    <dd className='mt-1'>{formatDate(inventory.updatedAt)}</dd>
                  </div>
                </dl>

                <Link
                  to={`/admin/inventory/${inventory.id}`}
                  className='mt-4 inline-flex text-sm font-medium underline underline-offset-4'>
                  Adjust / History
                </Link>
              </article>
            ))}
          </div>

          {/* Desktop */}
          <div className='mt-5 hidden overflow-x-auto border border-neutral-200 md:block'>
            <table className='min-w-full text-left text-sm'>
              <thead className='bg-neutral-50'>
                <tr>
                  <th className='px-4 py-3 font-medium'>Product</th>

                  <th className='px-4 py-3 font-medium'>Inventory</th>

                  <th className='px-4 py-3 font-medium'>Quantity</th>

                  <th className='px-4 py-3 font-medium'>Stock state</th>

                  <th className='px-4 py-3 font-medium'>Updated</th>

                  <th className='px-4 py-3 font-medium'>Actions</th>
                </tr>
              </thead>

              <tbody>
                {inventories.map((inventory) => (
                  <tr
                    key={inventory.id}
                    className='border-t border-neutral-200 align-top'>
                    <td className='px-4 py-4'>
                      <p className='font-medium'>{inventory.product.name}</p>

                      <p className='mt-1 text-xs text-neutral-500'>
                        {inventory.product.brand} ·{' '}
                        {getSportLabel(inventory.product.sport)}
                      </p>

                      <p className='mt-1 text-xs text-neutral-500'>
                        {inventory.product.category?.name ?? '—'}
                      </p>

                      {!inventory.product.isActive && (
                        <p className='mt-2 text-xs font-medium text-neutral-500'>
                          Product inactive
                        </p>
                      )}
                    </td>

                    <td className='px-4 py-4'>
                      <p className='max-w-72'>
                        {formatVariantOptions(inventory.variant)}
                      </p>

                      {inventory.variant && !inventory.variant.isActive && (
                        <p className='mt-2 text-xs font-medium text-neutral-500'>
                          Variant inactive
                        </p>
                      )}
                    </td>

                    <td className='px-4 py-4 text-lg font-semibold'>
                      {inventory.quantity}
                    </td>

                    <td className='px-4 py-4'>
                      <span
                        className={[
                          'inline-flex px-2.5 py-1 text-xs font-medium',
                          getStockStateClass(inventory.stockState),
                        ].join(' ')}>
                        {getStockStateLabel(inventory.stockState)}
                      </span>
                    </td>

                    <td className='whitespace-nowrap px-4 py-4 text-neutral-600'>
                      {formatDate(inventory.updatedAt)}
                    </td>

                    <td className='px-4 py-4'>
                      <Link
                        to={`/admin/inventory/${inventory.id}`}
                        className='font-medium underline underline-offset-4'>
                        Adjust / History
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className='mt-5 flex flex-col gap-3 border border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between'>
            <p className='text-sm text-neutral-600'>
              {meta.totalItems} inventory position
              {meta.totalItems === 1 ? '' : 's'}
            </p>

            <div className='flex items-center gap-3'>
              <button
                type='button'
                disabled={meta.page <= 1 || loading}
                onClick={() => changePage(meta.page - 1)}
                className='border border-neutral-300 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40'>
                Previous
              </button>

              <span className='text-sm'>
                Page {meta.page} of {Math.max(meta.totalPages, 1)}
              </span>

              <button
                type='button'
                disabled={meta.page >= meta.totalPages || loading}
                onClick={() => changePage(meta.page + 1)}
                className='border border-neutral-300 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40'>
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}

export default AdminInventoryPage;
