import { useCallback, useEffect, useState } from 'react';

import { Link } from 'react-router';

import { fetchAdminProducts } from '../../api/productApi.js';

import { fetchAdminCategories, fetchSports } from '../../api/categoryApi.js';

import { normalizeApiError } from '../../api/errors.js';

import { formatInrFromPaise } from '../../utils/money.js';

const EMPTY_FILTERS = {
  q: '',
  sport: '',
  categoryId: '',
  brand: '',
  status: '',
  sort: 'createdAt',
  order: 'desc',
};

const DEFAULT_QUERY = {
  ...EMPTY_FILTERS,
  page: 1,
  limit: 20,
};

function getDiscountLabel(product) {
  if (product.discountType === 'percentage') {
    return `${product.discountValue}% off`;
  }

  if (product.discountType === 'fixed') {
    return `${formatInrFromPaise(product.discountValue)} off`;
  }

  return null;
}

function AdminProductsPage() {
  const [products, setProducts] = useState([]);

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

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setListError(null);

    try {
      const result = await fetchAdminProducts(appliedFilters);

      setProducts(result.items);
      setMeta(result.meta);
    } catch (requestError) {
      setListError(
        normalizeApiError(
          requestError,
          'Unable to load products. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

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

      if (name === 'sport') {
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
      brand: filterForm.brand.trim(),
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
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <p className='text-sm font-medium uppercase tracking-[0.2em] text-neutral-500'>
            Catalog management
          </p>

          <h1 className='mt-3 text-3xl font-semibold'>Products</h1>

          <p className='mt-3 max-w-2xl text-sm leading-6 text-neutral-600'>
            Search, filter, view and edit products in the store catalog.
          </p>
        </div>

        <Link
          to='/admin/products/new'
          className='inline-flex bg-black px-5 py-3 text-sm font-medium text-white'>
          Add product
        </Link>
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
        className='mt-8 grid gap-4 border border-neutral-200 p-4 md:grid-cols-2 xl:grid-cols-4'>
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
            placeholder='Name or brand'
            className='w-full border border-neutral-300 px-3 py-2.5 outline-none focus:border-black'
          />
        </div>

        <div>
          <label htmlFor='brand' className='mb-2 block text-sm font-medium'>
            Brand
          </label>

          <input
            id='brand'
            name='brand'
            value={filterForm.brand}
            onChange={handleFilterChange}
            placeholder='Nike'
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
            disabled={referencesLoading}
            value={filterForm.sport}
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
            disabled={referencesLoading}
            value={filterForm.categoryId}
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
          <label htmlFor='status' className='mb-2 block text-sm font-medium'>
            Status
          </label>

          <select
            id='status'
            name='status'
            value={filterForm.status}
            onChange={handleFilterChange}
            className='w-full border border-neutral-300 bg-white px-3 py-2.5 outline-none focus:border-black'>
            <option value=''>All statuses</option>

            <option value='active'>Active</option>

            <option value='inactive'>Inactive</option>
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
            <option value='createdAt'>Created</option>

            <option value='name'>Name</option>

            <option value='basePrice'>Price</option>
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
            className='bg-black px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50'>
            Apply
          </button>

          <button
            type='button'
            disabled={loading}
            onClick={handleResetFilters}
            className='border border-neutral-300 px-4 py-2.5 text-sm font-medium disabled:opacity-50'>
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
          Loading products...
        </div>
      )}

      {!loading && listError && products.length === 0 && (
        <button
          type='button'
          onClick={loadProducts}
          className='mt-4 bg-black px-4 py-2 text-sm font-medium text-white'>
          Try again
        </button>
      )}

      {!loading && !listError && products.length === 0 && (
        <div className='mt-5 border border-neutral-200 p-8 text-center'>
          <h2 className='font-semibold'>No products found</h2>

          <p className='mt-2 text-sm text-neutral-600'>
            Try different filters or add your first product.
          </p>

          <Link
            to='/admin/products/new'
            className='mt-5 inline-flex bg-black px-4 py-2.5 text-sm font-medium text-white'>
            Add product
          </Link>
        </div>
      )}

      {!loading && products.length > 0 && (
        <>
          <div className='mt-5 overflow-x-auto border border-neutral-200'>
            <table className='min-w-full text-left text-sm'>
              <thead className='bg-neutral-50'>
                <tr>
                  <th className='px-4 py-3 font-medium'>Product</th>

                  <th className='px-4 py-3 font-medium'>Category</th>

                  <th className='px-4 py-3 font-medium'>Price</th>

                  <th className='px-4 py-3 font-medium'>Status</th>

                  <th className='px-4 py-3 font-medium'>Actions</th>
                </tr>
              </thead>

              <tbody>
                {products.map((product) => {
                  const discount = getDiscountLabel(product);

                  return (
                    <tr
                      key={product.id}
                      className='border-t border-neutral-200 align-top'>
                      <td className='px-4 py-4'>
                        <div className='flex min-w-64 items-center gap-3'>
                          {product.primaryImage?.url ? (
                            <img
                              src={product.primaryImage.url}
                              alt={product.primaryImage.altText || product.name}
                              className='h-16 w-16 object-cover'
                            />
                          ) : (
                            <div className='flex h-16 w-16 items-center justify-center bg-neutral-100 text-xs text-neutral-500'>
                              No image
                            </div>
                          )}

                          <div>
                            <p className='font-medium'>{product.name}</p>

                            <p className='mt-1 text-xs text-neutral-500'>
                              {product.brand} · {getSportLabel(product.sport)}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className='px-4 py-4'>
                        {product.category?.name ?? '—'}
                      </td>

                      <td className='px-4 py-4'>
                        <p className='font-medium'>
                          {formatInrFromPaise(product.basePrice)}
                        </p>

                        {discount && (
                          <p className='mt-1 text-xs text-neutral-500'>
                            {discount}
                          </p>
                        )}
                      </td>

                      <td className='px-4 py-4'>
                        <span
                          className={[
                            'inline-flex px-2.5 py-1 text-xs font-medium',
                            product.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-neutral-200 text-neutral-700',
                          ].join(' ')}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className='px-4 py-4'>
                        <div className='flex gap-3'>
                          <Link
                            to={`/admin/products/${product.id}`}
                            className='font-medium underline underline-offset-4'>
                            View
                          </Link>

                          <Link
                            to={`/admin/products/${product.id}/edit`}
                            className='font-medium underline underline-offset-4'>
                            Edit
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className='mt-5 flex flex-col gap-3 border border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between'>
            <p className='text-sm text-neutral-600'>
              {meta.totalItems} product
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

export default AdminProductsPage;
