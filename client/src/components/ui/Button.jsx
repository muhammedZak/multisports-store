import { classNames } from '../../utils/classNames.js';
import { Spinner } from './Spinner.jsx';

const variantClasses = {
  primary:
    'border-[var(--color-ink)] bg-[var(--color-ink)] text-white hover:bg-[#2b2b2b]',

  secondary:
    'border-[var(--color-border-strong)] bg-white text-[var(--color-ink)] hover:border-[var(--color-ink)]',

  quiet:
    'border-transparent bg-transparent text-[var(--color-ink)] hover:bg-[var(--color-surface)]',

  danger:
    'border-[var(--color-danger)] bg-[var(--color-danger)] text-white hover:bg-[#8f1c14]',
};

const sizeClasses = {
  sm: 'min-h-9 px-3 text-sm',
  md: 'min-h-10 px-4 text-sm',
  lg: 'min-h-12 px-5 text-base',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  type = 'button',
  className = '',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={classNames(
        'inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] border font-semibold tracking-[-0.01em]',
        'transition-[background-color,border-color,color,opacity] duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-45',

        variantClasses[variant] ?? variantClasses.primary,

        sizeClasses[size] ?? sizeClasses.md,

        className,
      )}
      {...props}>
      {isLoading ? <Spinner size='sm' label='Working' /> : null}

      {children}
    </button>
  );
}
