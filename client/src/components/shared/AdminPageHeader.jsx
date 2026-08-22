import { Link } from 'react-router';

export function AdminPageHeader({
  eyebrow,
  title,
  description,

  backTo,
  backLabel = 'Back',

  action,
}) {
  return (
    <header className='border-b border-[var(--color-border)] pb-6'>
      {backTo ? (
        <Link
          to={backTo}
          className='mb-5 inline-flex text-sm font-semibold underline decoration-[var(--color-border-strong)] underline-offset-4 hover:decoration-[var(--color-ink)]'>
          ← {backLabel}
        </Link>
      ) : null}

      <div className='flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between'>
        <div className='max-w-3xl'>
          {eyebrow ? (
            <p className='mb-2 text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-muted)]'>
              {eyebrow}
            </p>
          ) : null}

          <h1 className='mb-0 text-2xl font-black tracking-[-0.035em] sm:text-3xl'>
            {title}
          </h1>

          {description ? (
            <p className='mt-3 mb-0 text-sm leading-6 text-[var(--color-muted)]'>
              {description}
            </p>
          ) : null}
        </div>

        {action ? <div className='shrink-0'>{action}</div> : null}
      </div>
    </header>
  );
}
