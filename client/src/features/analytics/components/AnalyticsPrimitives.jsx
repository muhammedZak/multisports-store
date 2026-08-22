export function AnalyticsMetric({
  label,
  value,
  detail,

  attention = false,
}) {
  return (
    <div className='border-t border-[var(--color-border)] py-4'>
      <p className='mb-0 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]'>
        {label}
      </p>

      <p
        className={[
          'mt-2 mb-0 text-2xl font-black tracking-[-0.03em] ds-tabular-nums',

          attention ? 'text-[var(--color-danger)]' : 'text-[var(--color-ink)]',
        ].join(' ')}>
        {value}
      </p>

      {detail ? (
        <p className='mt-2 mb-0 text-xs leading-5 text-[var(--color-muted)]'>
          {detail}
        </p>
      ) : null}
    </div>
  );
}

export function AnalyticsChartPanel({
  title,
  description,

  action,

  children,
}) {
  return (
    <section className='min-w-0 border border-[var(--color-border)] bg-white'>
      <header className='flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-4 py-4 sm:px-5'>
        <div>
          <h3 className='mb-0 font-black'>{title}</h3>

          {description ? (
            <p className='mt-1 mb-0 text-xs leading-5 text-[var(--color-muted)]'>
              {description}
            </p>
          ) : null}
        </div>

        {action ? <div className='shrink-0'>{action}</div> : null}
      </header>

      <div className='min-w-0 p-3 sm:p-5'>{children}</div>
    </section>
  );
}

export function AnalyticsSectionHeading({ eyebrow, title, description }) {
  return (
    <header>
      <p className='mb-0 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]'>
        {eyebrow}
      </p>

      <h2 className='mt-2 mb-0 text-xl font-black tracking-[-0.025em]'>
        {title}
      </h2>

      {description ? (
        <p className='mt-2 mb-0 max-w-3xl text-sm leading-6 text-[var(--color-muted)]'>
          {description}
        </p>
      ) : null}
    </header>
  );
}
