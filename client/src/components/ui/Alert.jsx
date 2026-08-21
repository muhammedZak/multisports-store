import { classNames } from '../../utils/classNames.js';

const variantClasses = {
  neutral:
    'border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-ink)]',

  info: 'border-[var(--color-info)] bg-[var(--color-info-soft)] text-[var(--color-ink)]',

  success:
    'border-[var(--color-success)] bg-[var(--color-success-soft)] text-[var(--color-ink)]',

  warning:
    'border-[var(--color-warning)] bg-[var(--color-warning-soft)] text-[var(--color-ink)]',

  danger:
    'border-[var(--color-danger)] bg-[var(--color-danger-soft)] text-[var(--color-ink)]',
};

export function Alert({
  title,
  children,
  variant = 'neutral',
  actions,
  className = '',
}) {
  const isError = variant === 'danger';

  return (
    <div
      className={classNames(
        'border-l-4 px-4 py-3',

        variantClasses[variant] ?? variantClasses.neutral,

        className,
      )}
      role={isError ? 'alert' : 'status'}>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          {title ? <p className='mb-1 font-semibold'>{title}</p> : null}

          <div className='text-sm leading-6 text-[var(--color-ink-soft)]'>
            {children}
          </div>
        </div>

        {actions ? <div className='shrink-0'>{actions}</div> : null}
      </div>
    </div>
  );
}
