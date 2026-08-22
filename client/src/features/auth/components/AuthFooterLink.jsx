import { Link } from 'react-router';

export function AuthFooterLink({
  children,

  to,
  state,

  linkLabel,
}) {
  return (
    <footer className='mt-8 border-t border-[var(--color-border)] pt-6 text-center'>
      <p className='mb-0 text-sm text-[var(--color-muted)]'>
        {children}{' '}
        <Link
          to={to}
          state={state}
          className='font-semibold text-[var(--color-ink)] underline decoration-[var(--color-border-strong)] underline-offset-4 hover:decoration-[var(--color-ink)]'>
          {linkLabel}
        </Link>
      </p>
    </footer>
  );
}
