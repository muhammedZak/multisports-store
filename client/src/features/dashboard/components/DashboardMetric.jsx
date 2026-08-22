import { Link } from 'react-router';

export function DashboardMetric({
  label,
  value,
  detail,

  to,

  attention = false,
}) {
  const content = (
    <>
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
    </>
  );

  if (!to) {
    return (
      <div className='border-t border-[var(--color-border)] py-4'>
        {content}
      </div>
    );
  }

  return (
    <Link
      to={to}
      className='block border-t border-[var(--color-border)] py-4 transition hover:bg-[var(--color-surface)]'>
      {content}

      <span className='mt-3 inline-flex text-xs font-semibold underline decoration-[var(--color-border-strong)] underline-offset-4'>
        View details
      </span>
    </Link>
  );
}
