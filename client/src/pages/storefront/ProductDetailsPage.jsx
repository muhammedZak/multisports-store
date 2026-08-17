import { useCallback, useEffect, useState } from 'react';

import { Link, useParams } from 'react-router';

import { fetchPublicProduct } from '../../api/productApi.js';

import { normalizeApiError } from '../../api/errors.js';

function ProductDetailsPage() {
  const { productId } = useParams();

  const [product, setProduct] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const loadProduct = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const item = await fetchPublicProduct(productId);

      setProduct(item);
    } catch (requestError) {
      setProduct(null);

      setError(
        normalizeApiError(
          requestError,
          'Unable to load this product. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  if (loading) {
    return (
      <main className='mx-auto max-w-7xl px-5 py-10 lg:px-8'>
        <p className='text-sm text-neutral-600'>Loading product details...</p>
      </main>
    );
  }

  if (error?.code === 'PRODUCT_NOT_FOUND') {
    return (
      <main className='mx-auto max-w-7xl px-5 py-16 lg:px-8'>
        <div className='max-w-xl'>
          <p className='text-sm font-medium uppercase tracking-[0.16em] text-neutral-500'>
            Product not found
          </p>

          <h1 className='mt-3 text-3xl font-semibold'>
            This product is unavailable.
          </h1>

          <p className='mt-3 text-sm leading-6 text-neutral-600'>
            The product may no longer be available or the link may be invalid.
          </p>

          <Link
            to='/shop'
            className='mt-6 inline-flex bg-black px-5 py-2.5 text-sm font-medium text-white'>
            Back to shop
          </Link>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className='mx-auto max-w-7xl px-5 py-16 lg:px-8'>
        <div className='max-w-xl'>
          <div
            role='alert'
            className='border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
            {error.message}
          </div>

          <div className='mt-5 flex flex-wrap gap-3'>
            <button
              type='button'
              onClick={loadProduct}
              className='bg-black px-5 py-2.5 text-sm font-medium text-white'>
              Try again
            </button>

            <Link
              to='/shop'
              className='border border-neutral-300 px-5 py-2.5 text-sm font-medium'>
              Back to shop
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className='mx-auto max-w-7xl px-5 py-16 lg:px-8'>
        <div className='max-w-xl'>
          <p className='text-sm text-neutral-600'>
            Unable to display this product.
          </p>

          <button
            type='button'
            onClick={loadProduct}
            className='mt-5 bg-black px-5 py-2.5 text-sm font-medium text-white'>
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className='mx-auto max-w-7xl px-5 py-10 lg:px-8'>
      <Link
        to='/shop'
        className='text-sm font-medium text-neutral-600 underline underline-offset-4 hover:text-black'>
        Back to shop
      </Link>

      <section className='mt-8'>
        <p className='text-xs font-medium uppercase tracking-[0.16em] text-neutral-500'>
          {product.category?.name || product.sport}
        </p>

        <h1 className='mt-3 text-3xl font-semibold tracking-tight sm:text-4xl'>
          {product.name}
        </h1>

        <p className='mt-2 text-sm text-neutral-600'>
          {product.brand} · <span className='capitalize'>{product.sport}</span>
        </p>

        <p className='mt-6 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-neutral-700'>
          {product.description}
        </p>
      </section>
    </main>
  );
}

export default ProductDetailsPage;
