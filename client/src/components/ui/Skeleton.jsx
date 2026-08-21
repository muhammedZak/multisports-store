import { classNames } from '../../utils/classNames.js';

export function Skeleton({ className = '' }) {
  return (
    <div
      className={classNames(
        'animate-pulse bg-[var(--color-surface-strong)]',
        className,
      )}
      aria-hidden='true'
    />
  );
}
