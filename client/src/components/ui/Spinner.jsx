import { classNames } from '../../utils/classNames.js';

const sizeClasses = {
  sm: 'size-4 border-2',
  md: 'size-5 border-2',
  lg: 'size-7 border-[3px]',
};

export function Spinner({ size = 'md', label = 'Loading', className = '' }) {
  return (
    <span
      className={classNames(
        'inline-block shrink-0 animate-spin rounded-full border-current border-r-transparent',
        sizeClasses[size] ?? sizeClasses.md,
        className,
      )}
      role='status'
      aria-label={label}
    />
  );
}
