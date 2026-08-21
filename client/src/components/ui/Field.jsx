export function Field({ id, label, hint, error, required = false, children }) {
  return (
    <div className='space-y-1.5'>
      {label ? (
        <label
          htmlFor={id}
          className='block text-sm font-semibold text-[var(--color-ink)]'>
          {label}

          {required ? (
            <span
              className='ml-1 text-[var(--color-danger)]'
              aria-hidden='true'>
              *
            </span>
          ) : null}
        </label>
      ) : null}

      {children}

      {error ? (
        <p id={`${id}-error`} className='text-sm text-[var(--color-danger)]'>
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className='text-sm text-[var(--color-muted)]'>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
