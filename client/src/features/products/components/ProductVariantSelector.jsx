import { Badge } from '../../../components/ui/Badge.jsx';

import { STOCK_STATE_PRESENTATION } from '../product.constants.js';

import { formatProductOptionName } from '../product.utils.js';

export function ProductVariantSelector({
  variants = [],
  selectedVariantId,
  disabled = false,
  onSelect,
}) {
  if (variants.length === 0) {
    return (
      <section className='mt-7'>
        <p className='mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]'>
          Options
        </p>

        <h2 className='mb-0 text-lg font-black tracking-[-0.02em]'>
          Standard product
        </h2>

        <p className='mt-2 mb-0 text-sm text-[var(--color-muted)]'>
          No product option is required.
        </p>
      </section>
    );
  }

  return (
    <section className='mt-7'>
      <div>
        <p className='mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]'>
          Options
        </p>

        <h2 className='mb-0 text-lg font-black tracking-[-0.02em]'>
          Choose an option
        </h2>

        <p className='mt-2 mb-0 text-sm text-[var(--color-muted)]'>
          Select an available option before adding this product to your cart.
        </p>
      </div>

      <div
        className='mt-4 grid gap-2 sm:grid-cols-2'
        role='group'
        aria-label='Product options'>
        {variants.map((variant) => {
          const selected = variant.id === selectedVariantId;

          const options = Object.entries(variant.options ?? {});

          const stock = STOCK_STATE_PRESENTATION[variant.stockState] ?? null;

          const outOfStock = variant.stockState === 'out_of_stock';

          return (
            <button
              key={variant.id}
              type='button'
              disabled={outOfStock || disabled}
              onClick={() => onSelect(variant.id)}
              aria-pressed={selected}
              className={[
                'min-h-20 border px-4 py-3.5 text-left transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2',

                selected
                  ? 'border-[var(--color-ink)] bg-[var(--color-surface)]'
                  : 'border-[var(--color-border-strong)] bg-white hover:border-[var(--color-ink)]',

                outOfStock
                  ? 'cursor-not-allowed border-[var(--color-border)] bg-[var(--color-surface)] opacity-55'
                  : '',
              ].join(' ')}>
              <dl className='m-0 space-y-1.5'>
                {options.map(([name, value]) => (
                  <div
                    key={name}
                    className='flex items-center justify-between gap-3 text-sm'>
                    <dt className='text-[var(--color-muted)]'>
                      {formatProductOptionName(name)}
                    </dt>

                    <dd className='m-0 font-bold text-[var(--color-ink)]'>
                      {String(value)}
                    </dd>
                  </div>
                ))}
              </dl>

              {stock ? (
                <div className='mt-3'>
                  <Badge variant={stock.variant}>{stock.label}</Badge>
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
