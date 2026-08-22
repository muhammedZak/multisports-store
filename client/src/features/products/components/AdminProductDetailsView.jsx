import { Badge } from '../../../components/ui/Badge.jsx';

import { formatInrFromPaise } from '../../../utils/money.js';

import { formatProductOptionName } from '../product.utils.js';

import {
  adminProductDateFormatter,
  getAdminProductDiscountLabel,
} from '../adminProduct.utils.js';

export function AdminProductDetailsView({ product }) {
  const specifications = Object.entries(product.specifications ?? {});

  return (
    <div className='mt-8 space-y-10'>
      <section className='border-y border-[var(--color-border)] py-6'>
        <div className='flex items-center justify-between gap-4'>
          <h2 className='mb-0 text-lg font-black'>Status</h2>

          <Badge variant={product.isActive ? 'success' : 'neutral'}>
            {product.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </section>

      <section>
        <h2 className='mb-0 text-lg font-black'>Images</h2>

        <div className='mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3'>
          {product.images.map((image) => (
            <article
              key={image.id}
              className='border-t border-[var(--color-border)] pt-4'>
              <img
                src={image.url}
                alt={image.altText || product.name}
                className='aspect-square w-full object-cover'
              />

              <div className='mt-3 flex flex-wrap gap-2'>
                {image.isPrimary ? (
                  <Badge variant='accent'>Primary</Badge>
                ) : null}

                <span className='text-xs text-[var(--color-muted)]'>
                  Order {image.sortOrder}
                </span>
              </div>

              <p className='mt-2 mb-0 text-xs text-[var(--color-muted)]'>
                Alt: {image.altText || '—'}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className='border-t border-[var(--color-border)] pt-6'>
        <div className='flex items-start justify-between gap-4'>
          <div>
            <h2 className='mb-0 text-lg font-black'>Variants</h2>

            <p className='mt-2 mb-0 text-sm text-[var(--color-muted)]'>
              Product option combinations configured for this Product.
            </p>
          </div>

          <span className='text-sm text-[var(--color-muted)]'>
            {(product.variants ?? []).length} Variant
            {(product.variants ?? []).length === 1 ? '' : 's'}
          </span>
        </div>

        {(product.variants ?? []).length === 0 ? (
          <p className='mt-5 mb-0 text-sm text-[var(--color-muted)]'>
            No Variants configured.
          </p>
        ) : (
          <div className='mt-5 grid gap-x-8 gap-y-6 lg:grid-cols-2'>
            {product.variants.map((variant) => (
              <article
                key={variant.id}
                className='border-t border-[var(--color-border)] pt-4'>
                <div className='flex items-center justify-between gap-3'>
                  <p className='mb-0 font-bold'>Variant</p>

                  <Badge variant={variant.isActive ? 'success' : 'neutral'}>
                    {variant.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <dl className='mt-4 border-y border-[var(--color-border)]'>
                  {Object.entries(variant.options ?? {}).map(
                    ([name, value]) => (
                      <div
                        key={name}
                        className='grid grid-cols-2 gap-3 border-b border-[var(--color-border)] py-3 text-sm last:border-b-0'>
                        <dt className='font-semibold'>
                          {formatProductOptionName(name)}
                        </dt>

                        <dd className='m-0 text-[var(--color-muted)]'>
                          {String(value)}
                        </dd>
                      </div>
                    ),
                  )}
                </dl>

                <p className='mt-3 mb-0 break-all text-xs text-[var(--color-muted)]'>
                  ID: {variant.id}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className='grid gap-8 border-t border-[var(--color-border)] pt-6 lg:grid-cols-2'>
        <div>
          <h2 className='mb-0 text-lg font-black'>Catalog information</h2>

          <dl className='mt-5 space-y-4 text-sm'>
            <div>
              <dt className='text-[var(--color-muted)]'>Brand</dt>

              <dd className='mt-1 mb-0 font-semibold'>{product.brand}</dd>
            </div>

            <div>
              <dt className='text-[var(--color-muted)]'>Sport</dt>

              <dd className='mt-1 mb-0 capitalize font-semibold'>
                {product.sport}
              </dd>
            </div>

            <div>
              <dt className='text-[var(--color-muted)]'>Category</dt>

              <dd className='mt-1 mb-0 font-semibold'>
                {product.category?.name ?? '—'}
              </dd>
            </div>

            <div>
              <dt className='text-[var(--color-muted)]'>Created</dt>

              <dd className='mt-1 mb-0'>
                {adminProductDateFormatter.format(new Date(product.createdAt))}
              </dd>
            </div>

            <div>
              <dt className='text-[var(--color-muted)]'>Updated</dt>

              <dd className='mt-1 mb-0'>
                {adminProductDateFormatter.format(new Date(product.updatedAt))}
              </dd>
            </div>
          </dl>
        </div>

        <div>
          <h2 className='mb-0 text-lg font-black'>Pricing</h2>

          <dl className='mt-5 space-y-4 text-sm'>
            <div>
              <dt className='text-[var(--color-muted)]'>Base price</dt>

              <dd className='mt-1 mb-0 text-xl font-black ds-tabular-nums'>
                {formatInrFromPaise(product.basePrice)}
              </dd>
            </div>

            <div>
              <dt className='text-[var(--color-muted)]'>Discount</dt>

              <dd className='mt-1 mb-0 font-semibold'>
                {getAdminProductDiscountLabel(product)}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className='border-t border-[var(--color-border)] pt-6'>
        <h2 className='mb-0 text-lg font-black'>Description</h2>

        <p className='mt-4 mb-0 whitespace-pre-wrap text-sm leading-7 text-[var(--color-ink-soft)]'>
          {product.description}
        </p>
      </section>

      <section className='border-t border-[var(--color-border)] pt-6'>
        <h2 className='mb-0 text-lg font-black'>Specifications</h2>

        {specifications.length === 0 ? (
          <p className='mt-4 mb-0 text-sm text-[var(--color-muted)]'>
            No specifications recorded.
          </p>
        ) : (
          <dl className='mt-5 border-y border-[var(--color-border)]'>
            {specifications.map(([key, value]) => (
              <div
                key={key}
                className='grid gap-1 border-b border-[var(--color-border)] py-3 text-sm last:border-b-0 sm:grid-cols-2'>
                <dt className='font-semibold'>{key}</dt>

                <dd className='m-0 text-[var(--color-muted)]'>
                  {String(value)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </div>
  );
}
