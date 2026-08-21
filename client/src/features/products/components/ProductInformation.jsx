import { formatProductOptionName } from '../product.utils.js';

export function ProductInformation({ description, specifications = {} }) {
  const specificationEntries = Object.entries(specifications);

  return (
    <div className='mt-14 lg:mt-20'>
      <section className='grid gap-5 border-t border-[var(--color-border)] py-8 md:grid-cols-[220px_minmax(0,1fr)] md:py-10'>
        <div>
          <p className='mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]'>
            Details
          </p>

          <h2 className='mb-0 text-xl font-black tracking-[-0.025em]'>
            Product description
          </h2>
        </div>

        <p className='mb-0 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-[var(--color-ink-soft)]'>
          {description}
        </p>
      </section>

      <section className='grid gap-5 border-t border-[var(--color-border)] py-8 md:grid-cols-[220px_minmax(0,1fr)] md:py-10'>
        <div>
          <p className='mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]'>
            Product data
          </p>

          <h2 className='mb-0 text-xl font-black tracking-[-0.025em]'>
            Specifications
          </h2>
        </div>

        {specificationEntries.length === 0 ? (
          <p className='mb-0 text-sm text-[var(--color-muted)]'>
            No specifications are available for this product.
          </p>
        ) : (
          <dl className='m-0 max-w-3xl border-y border-[var(--color-border)]'>
            {specificationEntries.map(([name, value]) => (
              <div
                key={name}
                className='grid gap-1 border-b border-[var(--color-border)] py-4 last:border-b-0 sm:grid-cols-[minmax(140px,0.7fr)_1fr] sm:gap-8'>
                <dt className='text-sm font-semibold text-[var(--color-ink)]'>
                  {formatProductOptionName(name)}
                </dt>

                <dd className='m-0 text-sm text-[var(--color-muted)]'>
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
