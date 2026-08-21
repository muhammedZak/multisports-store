import { useId } from 'react';

import { classNames } from '../../utils/classNames.js';
import { Field } from './Field.jsx';

export function Input({
  id,
  label,
  hint,
  error,
  required = false,
  className = '',
  ...props
}) {
  const generatedId = useId();

  const inputId = id ?? generatedId;

  const describedBy = error
    ? `${inputId}-error`
    : hint
      ? `${inputId}-hint`
      : undefined;

  return (
    <Field
      id={inputId}
      label={label}
      hint={hint}
      error={error}
      required={required}>
      <input
        id={inputId}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={classNames(
          'min-h-11 w-full rounded-[var(--radius-control)] border bg-white px-3.5 text-sm text-[var(--color-ink)]',
          'placeholder:text-[#92928b]',
          'transition-[border-color,box-shadow] duration-150',
          'focus:border-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--color-ink)]',
          'disabled:bg-[var(--color-surface)] disabled:text-[var(--color-muted)]',

          error
            ? 'border-[var(--color-danger)]'
            : 'border-[var(--color-border-strong)]',

          className,
        )}
        {...props}
      />
    </Field>
  );
}
