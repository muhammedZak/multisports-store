import { useCallback, useEffect, useState } from 'react';

import { Link, useLocation, useParams } from 'react-router';

import {
  fetchAdminProduct,
  updateAdminProductStatus,
} from '../../api/productApi.js';

import { normalizeApiError } from '../../api/errors.js';

import { formatInrFromPaise } from '../../utils/money.js';

function formatDate(value) {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getDiscountLabel(product) {
  if (product.discountType === 'percentage') {
    return `${product.discountValue}%`;
  }

  if (product.discountType === 'fixed') {
    return formatInrFromPaise(product.discountValue);
  }

  return 'No discount';
}

function AdminProductDetailsPage() {
  const { productId } = useParams();

  const location = useLocation();

  const [product, setProduct] = useState(null);

  const [loading, setLoading] = useState(true);

  const [statusUpdating, setStatusUpdating] = useState(false);

  const [error, setError] = useState(null);

  const [message, setMessage] = useState(location.state?.message ?? '');

  const loadProduct = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const item = await fetchAdminProduct(productId);

      setProduct(item);
    } catch (requestError) {
      setError(normalizeApiError(requestError, 'Unable to load this product.'));
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  async function handleStatusChange() {
    const nextIsActive = !product.isActive;

    if (!nextIsActive) {
      const confirmed = window.confirm(`Deactivate "${product.name}"?`);

      if (!confirmed) {
        return;
      }
    }

    setStatusUpdating(true);
    setError(null);
    setMessage('');

    try {
      const updated = await updateAdminProductStatus(product.id, nextIsActive);

      setProduct(updated);

      setMessage(
        nextIsActive
          ? 'Product activated successfully.'
          : 'Product deactivated successfully.',
      );
    } catch (requestError) {
      setError(
        normalizeApiError(
          requestError,
          nextIsActive
            ? 'Unable to activate this product.'
            : 'Unable to deactivate this product.',
        ),
      );
    } finally {
      setStatusUpdating(false);
    }
  }

  if (loading) {
    return (
      <main className='p-5 sm:p-6'>
        <p className='text-sm text-neutral-600'>Loading product...</p>
      </main>
    );
  }

  if (error && !product) {
    return (
      <main className='p-5 sm:p-6'>
        <div
          role='alert'
          className='border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          {error.message}
        </div>

        <div className='mt-5 flex gap-4'>
          {error.code !== 'PRODUCT_NOT_FOUND' && (
            <button
              type='button'
              onClick={loadProduct}
              className='bg-black px-4 py-2 text-sm font-medium text-white'>
              Try again
            </button>
          )}

          <Link
            to='/admin/products'
            className='px-4 py-2 text-sm font-medium underline underline-offset-4'>
            Back to products
          </Link>
        </div>
      </main>
    );
  }

  const specifications = Object.entries(product.specifications ?? {});

  return (
    <main className='p-5 sm:p-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <p className='text-sm font-medium uppercase tracking-[0.2em] text-neutral-500'>
            Product details
          </p>

          <h1 className='mt-3 text-3xl font-semibold'>{product.name}</h1>

          <p className='mt-2 text-sm text-neutral-600'>
            {product.brand} · {product.sport}
          </p>
        </div>

        <div className='flex flex-wrap gap-3'>
          <Link
            to={`/admin/products/${product.id}/edit`}
            className='border border-neutral-300 px-4 py-2.5 text-sm font-medium'>
            Edit product
          </Link>

          <button
            type='button'
            disabled={statusUpdating}
            onClick={handleStatusChange}
            className='bg-black px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50'>
            {statusUpdating
              ? 'Updating...'
              : product.isActive
                ? 'Deactivate'
                : 'Activate'}
          </button>
        </div>
      </div>

      {message && (
        <div
          role='status'
          className='mt-6 border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700'>
          {message}
        </div>
      )}

      {error && (
        <div
          role='alert'
          className='mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          {error.message}

          {error.fields?.categoryId && (
            <p className='mt-1'>{error.fields.categoryId}</p>
          )}
        </div>
      )}

      <section className='mt-8 border border-neutral-200 p-5'>
        <div className='flex items-center justify-between gap-4'>
          <h2 className='text-lg font-semibold'>Status</h2>

          <span
            className={[
              'px-3 py-1 text-sm font-medium',
              product.isActive
                ? 'bg-green-100 text-green-700'
                : 'bg-neutral-200 text-neutral-700',
            ].join(' ')}>
            {product.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </section>

      <section className='mt-6 border border-neutral-200 p-5'>
        <h2 className='text-lg font-semibold'>Images</h2>

        <div className='mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {product.images.map((image) => (
            <div key={image.id} className='border border-neutral-200 p-3'>
              <img
                src={image.url}
                alt={image.altText || product.name}
                className='aspect-square w-full object-cover'
              />

              <p className='mt-2 text-xs font-medium text-neutral-600'>
                {image.isPrimary ? 'Primary image · ' : ''}
                Order {image.sortOrder}
              </p>

              <p className='mt-1 text-xs text-neutral-500'>
                Alt: {image.altText || '—'}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className='mt-6 grid gap-6 border border-neutral-200 p-5 lg:grid-cols-2'>
        <div>
          <h2 className='text-lg font-semibold'>Catalog information</h2>

          <dl className='mt-4 space-y-4 text-sm'>
            <div>
              <dt className='text-neutral-500'>Brand</dt>
              <dd className='mt-1 font-medium'>{product.brand}</dd>
            </div>

            <div>
              <dt className='text-neutral-500'>Sport</dt>
              <dd className='mt-1 font-medium capitalize'>{product.sport}</dd>
            </div>

            <div>
              <dt className='text-neutral-500'>Category</dt>
              <dd className='mt-1 font-medium'>
                {product.category?.name ?? '—'}
              </dd>
            </div>

            <div>
              <dt className='text-neutral-500'>Created</dt>
              <dd className='mt-1'>{formatDate(product.createdAt)}</dd>
            </div>

            <div>
              <dt className='text-neutral-500'>Updated</dt>
              <dd className='mt-1'>{formatDate(product.updatedAt)}</dd>
            </div>
          </dl>
        </div>

        <div>
          <h2 className='text-lg font-semibold'>Pricing</h2>

          <dl className='mt-4 space-y-4 text-sm'>
            <div>
              <dt className='text-neutral-500'>Base price</dt>
              <dd className='mt-1 text-lg font-semibold'>
                {formatInrFromPaise(product.basePrice)}
              </dd>
            </div>

            <div>
              <dt className='text-neutral-500'>Discount</dt>
              <dd className='mt-1 font-medium'>{getDiscountLabel(product)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className='mt-6 border border-neutral-200 p-5'>
        <h2 className='text-lg font-semibold'>Description</h2>

        <p className='mt-4 whitespace-pre-wrap text-sm leading-6 text-neutral-700'>
          {product.description}
        </p>
      </section>

      <section className='mt-6 border border-neutral-200 p-5'>
        <h2 className='text-lg font-semibold'>Specifications</h2>

        {specifications.length === 0 ? (
          <p className='mt-4 text-sm text-neutral-500'>
            No specifications recorded.
          </p>
        ) : (
          <dl className='mt-4 divide-y divide-neutral-200 border border-neutral-200'>
            {specifications.map(([key, value]) => (
              <div key={key} className='grid gap-1 p-3 sm:grid-cols-2'>
                <dt className='text-sm font-medium'>{key}</dt>

                <dd className='text-sm text-neutral-600'>{String(value)}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <Link
        to='/admin/products'
        className='mt-6 inline-flex text-sm font-medium underline underline-offset-4'>
        Back to products
      </Link>
    </main>
  );
}

export default AdminProductDetailsPage;
