import { useId } from 'react';

import { classNames } from '../../utils/classNames.js';
import { Field } from './Field.jsx';

export function Select({
  id,
  label,
  hint,
  error,
  required = false,
  className = '',
  children,
  ...props
}) {
  const generatedId = useId();

  const selectId = id ?? generatedId;

  const describedBy = error
    ? `${selectId}-error`
    : hint
      ? `${selectId}-hint`
      : undefined;

  return (
    <Field
      id={selectId}
      label={label}
      hint={hint}
      error={error}
      required={required}>
      <select
        id={selectId}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={classNames(
          'min-h-11 w-full rounded-[var(--radius-control)] border bg-white px-3.5 text-sm text-[var(--color-ink)]',
          'transition-[border-color,box-shadow] duration-150',
          'focus:border-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--color-ink)]',
          'disabled:bg-[var(--color-surface)] disabled:text-[var(--color-muted)]',

          error
            ? 'border-[var(--color-danger)]'
            : 'border-[var(--color-border-strong)]',

          className,
        )}
        {...props}>
        {children}
      </select>
    </Field>
  );
}
