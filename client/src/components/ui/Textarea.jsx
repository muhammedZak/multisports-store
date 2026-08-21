import { useId } from 'react';

import { classNames } from '../../utils/classNames.js';
import { Field } from './Field.jsx';

export function Textarea({
  id,
  label,
  hint,
  error,
  required = false,
  className = '',
  ...props
}) {
  const generatedId = useId();

  const textareaId = id ?? generatedId;

  const describedBy = error
    ? `${textareaId}-error`
    : hint
      ? `${textareaId}-hint`
      : undefined;

  return (
    <Field
      id={textareaId}
      label={label}
      hint={hint}
      error={error}
      required={required}>
      <textarea
        id={textareaId}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={classNames(
          'min-h-28 w-full resize-y rounded-[var(--radius-control)] border bg-white px-3.5 py-3 text-sm text-[var(--color-ink)]',
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
