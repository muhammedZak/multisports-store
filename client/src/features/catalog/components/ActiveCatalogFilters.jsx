export function ActiveCatalogFilters({ filters, onRemove, onClear }) {
  if (filters.length === 0) {
    return null;
  }

  return (
    <section
      aria-label='Applied filters'
      className='mt-6 border-y border-[var(--color-border)] py-4'>
      <div className='flex flex-wrap items-center gap-2'>
        <p className='mr-1 mb-0 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]'>
          Applied
        </p>

        {filters.map((filter) => (
          <button
            key={filter.key}
            type='button'
            onClick={() => onRemove(filter.key)}
            className='inline-flex min-h-8 items-center border border-[var(--color-border-strong)] bg-white px-2.5 text-xs font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink)] hover:bg-[var(--color-surface)]'
            aria-label={`Remove ${filter.label} filter`}>
            {filter.label}

            <span
              aria-hidden='true'
              className='ml-2 text-base font-normal leading-none'>
              ×
            </span>
          </button>
        ))}

        <button
          type='button'
          onClick={onClear}
          className='min-h-8 px-2 text-xs font-semibold underline decoration-[var(--color-border-strong)] underline-offset-4 hover:decoration-[var(--color-ink)]'>
          Clear all
        </button>
      </div>
    </section>
  );
}
