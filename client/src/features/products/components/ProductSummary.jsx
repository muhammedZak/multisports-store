import { Badge } from '../../../components/ui/Badge.jsx';

import { formatInrFromPaise } from '../../../utils/money.js';

import { STOCK_STATE_PRESENTATION } from '../product.constants.js';

import { getDiscountLabel } from '../product.utils.js';

export function ProductSummary({ product }) {
  const hasDiscount = product.currentPrice < product.basePrice;

  const discountLabel = getDiscountLabel(product);

  const stockPresentation =
    STOCK_STATE_PRESENTATION[product.stockState] ?? null;

  return (
    <>
      <div>
        <p className='mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]'>
          {product.brand}
        </p>

        <h1 className='mb-0 max-w-xl text-3xl font-black leading-[1.05] tracking-[-0.045em] sm:text-4xl lg:text-[44px]'>
          {product.name}
        </h1>

        <div className='mt-4'>
          {product.reviewCount > 0 ? (
            <a
              href='#reviews'
              className='inline-flex items-center gap-2 text-sm font-semibold hover:underline hover:underline-offset-4'>
              <span aria-hidden='true' className='text-[var(--color-warning)]'>
                ★
              </span>

              <span>{Number(product.averageRating).toFixed(1)}</span>

              <span className='font-normal text-[var(--color-muted)]'>
                {product.reviewCount} review
                {product.reviewCount === 1 ? '' : 's'}
              </span>
            </a>
          ) : (
            <a
              href='#reviews'
              className='text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:underline hover:underline-offset-4'>
              No reviews yet
            </a>
          )}
        </div>

        <div className='mt-3 flex flex-wrap items-center gap-2 text-sm text-[var(--color-muted)]'>
          <span className='capitalize'>{product.sport}</span>

          {product.category?.name ? (
            <>
              <span aria-hidden='true'>/</span>

              <span>{product.category.name}</span>
            </>
          ) : null}
        </div>
      </div>

      <section
        aria-label='Product price and availability'
        className='mt-7 border-y border-[var(--color-border)] py-6'>
        <div className='flex flex-wrap items-center gap-x-3 gap-y-2'>
          <p className='mb-0 text-2xl font-black tracking-[-0.025em]'>
            {formatInrFromPaise(product.currentPrice)}
          </p>

          {hasDiscount ? (
            <p className='mb-0 text-base text-[var(--color-muted)] line-through'>
              {formatInrFromPaise(product.basePrice)}
            </p>
          ) : null}

          {hasDiscount && discountLabel ? (
            <Badge variant='accent'>{discountLabel}</Badge>
          ) : null}
        </div>

        <p className='mt-2 mb-0 text-xs text-[var(--color-muted)]'>
          Inclusive of applicable taxes
        </p>

        {stockPresentation ? (
          <div className='mt-4'>
            <Badge variant={stockPresentation.variant}>
              {stockPresentation.label}
            </Badge>
          </div>
        ) : null}
      </section>
    </>
  );
}
