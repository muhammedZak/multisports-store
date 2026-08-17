import { useCallback, useEffect, useState } from 'react';

import { Link, useParams } from 'react-router';

import { fetchPublicProduct } from '../../api/productApi.js';

import { normalizeApiError } from '../../api/errors.js';

import { formatInrFromPaise } from '../../utils/money.js';

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

function formatOptionName(name) {
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function ProductDetailsPage() {
  const { productId } = useParams();

  const [product, setProduct] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [selectedImageId, setSelectedImageId] = useState(null);

  const [selectedVariantId, setSelectedVariantId] = useState('');

  const loadProduct = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const item = await fetchPublicProduct(productId);

      const preferredImage =
        item.images?.find((image) => image.isPrimary) ??
        item.images?.[0] ??
        null;

      setProduct(item);

      setSelectedImageId(preferredImage?.id ?? null);

      setSelectedVariantId('');
    } catch (requestError) {
      setProduct(null);

      setSelectedImageId(null);

      setSelectedVariantId('');

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

  const images = product.images ?? [];

  const variants = product.variants ?? [];

  const specifications = Object.entries(product.specifications ?? {});

  const selectedImage =
    images.find((image) => image.id === selectedImageId) ??
    images.find((image) => image.isPrimary) ??
    images[0] ??
    null;

  const selectedVariant =
    variants.find((variant) => variant.id === selectedVariantId) ?? null;

  const hasDiscount = product.currentPrice < product.basePrice;

  const discountLabel = getDiscountLabel(product);

  return (
    <main className='mx-auto max-w-7xl px-5 py-10 lg:px-8'>
      <Link
        to='/shop'
        className='text-sm font-medium text-neutral-600 underline underline-offset-4 hover:text-black'>
        Back to shop
      </Link>

      <div className='mt-8 grid gap-10 lg:grid-cols-2 lg:gap-14'>
        {/* Product images */}
        <section>
          <div className='aspect-square overflow-hidden bg-neutral-100'>
            {selectedImage?.url ? (
              <img
                src={selectedImage.url}
                alt={selectedImage.altText || product.name}
                className='h-full w-full object-cover'
              />
            ) : (
              <div className='flex h-full items-center justify-center text-sm text-neutral-500'>
                No image available
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div
              className='mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5'
              aria-label='Product images'>
              {images.map((image) => {
                const selected = image.id === selectedImage?.id;

                return (
                  <button
                    key={image.id}
                    type='button'
                    onClick={() => setSelectedImageId(image.id)}
                    aria-pressed={selected}
                    className={[
                      'aspect-square overflow-hidden border bg-neutral-100',
                      selected
                        ? 'border-black'
                        : 'border-neutral-200 hover:border-neutral-500',
                    ].join(' ')}>
                    <img
                      src={image.url}
                      alt={image.altText || product.name}
                      className='h-full w-full object-cover'
                    />
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Product information */}
        <section className='lg:pt-2'>
          <p className='text-sm font-medium text-neutral-500'>
            {product.brand}
          </p>

          <h1 className='mt-2 text-3xl font-semibold tracking-tight sm:text-4xl'>
            {product.name}
          </h1>

          <div className='mt-3 flex flex-wrap items-center gap-2 text-sm text-neutral-500'>
            <span className='capitalize'>{product.sport}</span>

            {product.category?.name && (
              <>
                <span aria-hidden='true'>·</span>
                <span>{product.category.name}</span>
              </>
            )}
          </div>

          {/* Pricing */}
          <div className='mt-7 border-y border-neutral-200 py-6'>
            <div className='flex flex-wrap items-baseline gap-3'>
              <p className='text-2xl font-semibold'>
                {formatInrFromPaise(product.currentPrice)}
              </p>

              {hasDiscount && (
                <p className='text-base text-neutral-400 line-through'>
                  {formatInrFromPaise(product.basePrice)}
                </p>
              )}

              {hasDiscount && discountLabel && (
                <p className='text-sm font-medium text-green-700'>
                  {discountLabel}
                </p>
              )}
            </div>

            <p className='mt-2 text-xs text-neutral-500'>
              Inclusive of applicable taxes
            </p>
          </div>

          {/* Variants */}
          <div className='mt-7'>
            <div className='flex items-center justify-between gap-4'>
              <h2 className='text-base font-semibold'>Options</h2>

              {selectedVariant && (
                <span className='text-xs font-medium text-neutral-500'>
                  Selected
                </span>
              )}
            </div>

            {variants.length === 0 ? (
              <p className='mt-3 text-sm text-neutral-500'>
                No Product options are required.
              </p>
            ) : (
              <>
                <p className='mt-2 text-sm text-neutral-600'>
                  Choose an available option.
                </p>

                <div className='mt-4 grid gap-3 sm:grid-cols-2'>
                  {variants.map((variant) => {
                    const selected = variant.id === selectedVariantId;

                    const options = Object.entries(variant.options ?? {});

                    return (
                      <button
                        key={variant.id}
                        type='button'
                        onClick={() => setSelectedVariantId(variant.id)}
                        aria-pressed={selected}
                        className={[
                          'border p-4 text-left transition',
                          selected
                            ? 'border-black bg-neutral-50'
                            : 'border-neutral-300 hover:border-neutral-500',
                        ].join(' ')}>
                        <dl className='space-y-2'>
                          {options.map(([name, value]) => (
                            <div
                              key={name}
                              className='flex items-center justify-between gap-4 text-sm'>
                              <dt className='text-neutral-500'>
                                {formatOptionName(name)}
                              </dt>

                              <dd className='font-medium'>{String(value)}</dd>
                            </div>
                          ))}
                        </dl>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      {/* Description */}
      <section className='mt-14 border-t border-neutral-200 pt-8'>
        <h2 className='text-xl font-semibold'>Product description</h2>

        <p className='mt-4 max-w-4xl whitespace-pre-wrap text-sm leading-7 text-neutral-700'>
          {product.description}
        </p>
      </section>

      {/* Specifications */}
      <section className='mt-10 border-t border-neutral-200 pt-8'>
        <h2 className='text-xl font-semibold'>Specifications</h2>

        {specifications.length === 0 ? (
          <p className='mt-4 text-sm text-neutral-500'>
            No specifications are available for this product.
          </p>
        ) : (
          <dl className='mt-5 max-w-4xl divide-y divide-neutral-200 border-y border-neutral-200'>
            {specifications.map(([name, value]) => (
              <div
                key={name}
                className='grid gap-1 py-4 sm:grid-cols-2 sm:gap-6'>
                <dt className='text-sm font-medium text-neutral-700'>
                  {formatOptionName(name)}
                </dt>

                <dd className='text-sm text-neutral-600'>{String(value)}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </main>
  );
}

export default ProductDetailsPage;
