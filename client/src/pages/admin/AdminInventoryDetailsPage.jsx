import { useCallback, useEffect, useState } from 'react';

import { Link, useParams } from 'react-router';

import { normalizeApiError } from '../../api/errors.js';

import { fetchAdminInventory } from '../../api/inventoryApi.js';

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

function AdminInventoryDetailsPage() {
  const { inventoryId } = useParams();

  const [inventory, setInventory] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const item = await fetchAdminInventory(inventoryId);

      setInventory(item);
    } catch (requestError) {
      setError(
        normalizeApiError(
          requestError,
          'Unable to load this inventory position.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [inventoryId]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  if (loading) {
    return (
      <main className='p-5 sm:p-6'>
        <p className='text-sm text-neutral-600'>Loading inventory...</p>
      </main>
    );
  }

  if (error && !inventory) {
    return (
      <main className='p-5 sm:p-6'>
        <div
          role='alert'
          className='border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          {error.message}
        </div>

        <div className='mt-5 flex flex-wrap gap-4'>
          {error.code !== 'INVENTORY_NOT_FOUND' && (
            <button
              type='button'
              onClick={loadInventory}
              className='bg-black px-4 py-2 text-sm font-medium text-white'>
              Try again
            </button>
          )}

          <Link
            to='/admin/inventory'
            className='px-4 py-2 text-sm font-medium underline underline-offset-4'>
            Back to inventory
          </Link>
        </div>
      </main>
    );
  }

  const variantOptions = Object.entries(inventory.variant?.options ?? {});

  return (
    <main className='p-5 sm:p-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <p className='text-sm font-medium uppercase tracking-[0.2em] text-neutral-500'>
            Inventory details
          </p>

          <h1 className='mt-3 text-3xl font-semibold'>
            {inventory.product.name}
          </h1>

          <p className='mt-2 text-sm text-neutral-600'>
            {inventory.product.brand} ·{' '}
            <span className='capitalize'>{inventory.product.sport}</span>
          </p>
        </div>

        <Link
          to={`/admin/products/${inventory.product.id}`}
          className='inline-flex border border-neutral-300 px-4 py-2.5 text-sm font-medium'>
          View product
        </Link>
      </div>

      <section className='mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <div className='border border-neutral-200 p-5'>
          <p className='text-sm text-neutral-500'>Current stock</p>

          <p className='mt-2 text-3xl font-semibold'>{inventory.quantity}</p>
        </div>

        <div className='border border-neutral-200 p-5'>
          <p className='text-sm text-neutral-500'>Stock state</p>

          <span
            className={[
              'mt-3 inline-flex px-3 py-1.5 text-sm font-medium',
              getStockStateClass(inventory.stockState),
            ].join(' ')}>
            {getStockStateLabel(inventory.stockState)}
          </span>
        </div>

        <div className='border border-neutral-200 p-5'>
          <p className='text-sm text-neutral-500'>Product status</p>

          <p className='mt-2 font-semibold'>
            {inventory.product.isActive ? 'Active' : 'Inactive'}
          </p>
        </div>

        <div className='border border-neutral-200 p-5'>
          <p className='text-sm text-neutral-500'>Inventory type</p>

          <p className='mt-2 font-semibold'>
            {inventory.variant ? 'Variant' : 'Simple product'}
          </p>
        </div>
      </section>

      <section className='mt-6 border border-neutral-200 p-5'>
        <h2 className='text-lg font-semibold'>Product context</h2>

        <dl className='mt-4 grid gap-5 text-sm sm:grid-cols-2'>
          <div>
            <dt className='text-neutral-500'>Product</dt>

            <dd className='mt-1 font-medium'>{inventory.product.name}</dd>
          </div>

          <div>
            <dt className='text-neutral-500'>Brand</dt>

            <dd className='mt-1 font-medium'>{inventory.product.brand}</dd>
          </div>

          <div>
            <dt className='text-neutral-500'>Sport</dt>

            <dd className='mt-1 font-medium capitalize'>
              {inventory.product.sport}
            </dd>
          </div>

          <div>
            <dt className='text-neutral-500'>Category</dt>

            <dd className='mt-1 font-medium'>
              {inventory.product.category?.name ?? '—'}
            </dd>
          </div>
        </dl>
      </section>

      <section className='mt-6 border border-neutral-200 p-5'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h2 className='text-lg font-semibold'>Variant</h2>

            <p className='mt-1 text-sm text-neutral-600'>
              {inventory.variant
                ? 'This stock position belongs to one embedded product variant.'
                : 'This is the Product-level stock position for a simple Product.'}
            </p>
          </div>

          {inventory.variant && (
            <span
              className={[
                'px-3 py-1 text-sm font-medium',
                inventory.variant.isActive
                  ? 'bg-green-100 text-green-700'
                  : 'bg-neutral-200 text-neutral-700',
              ].join(' ')}>
              {inventory.variant.isActive ? 'Active' : 'Inactive'}
            </span>
          )}
        </div>

        {!inventory.variant ? (
          <p className='mt-5 text-sm font-medium'>Simple product</p>
        ) : variantOptions.length === 0 ? (
          <p className='mt-5 text-sm text-neutral-500'>
            No variant options recorded.
          </p>
        ) : (
          <dl className='mt-5 divide-y divide-neutral-200 border border-neutral-200'>
            {variantOptions.map(([name, value]) => (
              <div key={name} className='grid gap-1 p-3 text-sm sm:grid-cols-2'>
                <dt className='font-medium'>{name}</dt>

                <dd className='text-neutral-600'>{String(value)}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className='mt-6 border border-neutral-200 p-5'>
        <h2 className='text-lg font-semibold'>Inventory information</h2>

        <dl className='mt-4 grid gap-5 text-sm sm:grid-cols-2'>
          <div>
            <dt className='text-neutral-500'>Inventory ID</dt>

            <dd className='mt-1 break-all font-medium'>{inventory.id}</dd>
          </div>

          <div>
            <dt className='text-neutral-500'>Variant ID</dt>

            <dd className='mt-1 break-all font-medium'>
              {inventory.variant?.id ?? '—'}
            </dd>
          </div>

          <div>
            <dt className='text-neutral-500'>Created</dt>

            <dd className='mt-1'>{formatDate(inventory.createdAt)}</dd>
          </div>

          <div>
            <dt className='text-neutral-500'>Last updated</dt>

            <dd className='mt-1'>{formatDate(inventory.updatedAt)}</dd>
          </div>
        </dl>
      </section>

      <Link
        to='/admin/inventory'
        className='mt-6 inline-flex text-sm font-medium underline underline-offset-4'>
        Back to inventory
      </Link>
    </main>
  );
}

export default AdminInventoryDetailsPage;
