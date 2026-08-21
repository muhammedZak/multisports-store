import { classNames } from '../../utils/classNames.js';

const variantClasses = {
  neutral:
    'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-soft)]',

  accent:
    'border-[#f0b59f] bg-[var(--color-accent-soft)] text-[var(--color-accent)]',

  success:
    'border-[#b9dfc3] bg-[var(--color-success-soft)] text-[var(--color-success)]',

  warning:
    'border-[#ead4a5] bg-[var(--color-warning-soft)] text-[var(--color-warning)]',

  danger:
    'border-[#efbeb9] bg-[var(--color-danger-soft)] text-[var(--color-danger)]',

  info: 'border-[#bdd3fb] bg-[var(--color-info-soft)] text-[var(--color-info)]',
};

export function Badge({ children, variant = 'neutral', className = '' }) {
  return (
    <span
      className={classNames(
        'inline-flex min-h-6 items-center rounded-[var(--radius-pill)] border px-2.5 py-0.5 text-xs font-semibold leading-none',

        variantClasses[variant] ?? variantClasses.neutral,

        className,
      )}>
      {children}
    </span>
  );
}
