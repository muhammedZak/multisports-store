import { Link } from 'react-router';

import { Badge } from '../../../components/ui/Badge.jsx';

import { formatInrFromPaise } from '../../../utils/money.js';

import { STOCK_STATE_PRESENTATION } from '../catalog.constants.js';

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

export function ProductCard({ product }) {
  const hasDiscount = product.currentPrice < product.basePrice;

  const discountLabel = getDiscountLabel(product);

  const stockPresentation =
    STOCK_STATE_PRESENTATION[product.stockState] ?? null;

  return (
    <article className='min-w-0'>
      <Link
        to={`/products/${product.id}`}
        className='group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-4'>
        <div className='relative aspect-square overflow-hidden bg-[var(--color-surface)]'>
          {product.primaryImage?.url ? (
            <img
              src={product.primaryImage.url}
              alt={product.primaryImage.altText || product.name}
              className='h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.025]'
            />
          ) : (
            <div className='flex h-full items-center justify-center border border-[var(--color-border)] text-sm text-[var(--color-muted)]'>
              No image
            </div>
          )}

          {discountLabel ? (
            <div className='absolute left-3 top-3'>
              <Badge variant='accent'>{discountLabel}</Badge>
            </div>
          ) : null}
        </div>

        <div className='pt-3.5'>
          <div className='flex items-start justify-between gap-3'>
            <p className='mb-0 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]'>
              {product.category?.name || product.sport}
            </p>

            {product.reviewCount > 0 ? (
              <p
                className='mb-0 shrink-0 text-xs font-semibold text-[var(--color-ink)]'
                aria-label={`${product.averageRating} out of 5 stars from ${product.reviewCount} reviews`}>
                <span aria-hidden='true'>★</span>{' '}
                {Number(product.averageRating).toFixed(1)}
              </p>
            ) : null}
          </div>

          <h2 className='mt-1.5 mb-0 text-[15px] font-bold leading-5 tracking-[-0.015em] text-[var(--color-ink)] group-hover:underline group-hover:underline-offset-4'>
            {product.name}
          </h2>

          <p className='mt-1 mb-0 text-sm text-[var(--color-muted)]'>
            {product.brand}
          </p>

          <div className='mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1'>
            <p className='mb-0 font-bold text-[var(--color-ink)]'>
              {formatInrFromPaise(product.currentPrice)}
            </p>

            {hasDiscount ? (
              <p className='mb-0 text-sm text-[var(--color-muted)] line-through'>
                {formatInrFromPaise(product.basePrice)}
              </p>
            ) : null}
          </div>

          <div className='mt-2'>
            {stockPresentation ? (
              <Badge variant={stockPresentation.variant}>
                {stockPresentation.label}
              </Badge>
            ) : null}
          </div>

          {product.reviewCount === 0 ? (
            <p className='mt-2 mb-0 text-xs text-[var(--color-muted)]'>
              No reviews yet
            </p>
          ) : null}
        </div>
      </Link>
    </article>
  );
}
