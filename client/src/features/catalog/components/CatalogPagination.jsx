import { Button } from '../../../components/ui/Button.jsx';

export function CatalogPagination({ meta, loading, onPageChange }) {
  const totalPages = Math.max(meta.totalPages, 1);

  return (
    <nav
      aria-label='Catalog pages'
      className='mt-14 flex flex-col gap-4 border-t border-[var(--color-border)] pt-6 sm:flex-row sm:items-center sm:justify-between'>
      <p className='mb-0 text-sm text-[var(--color-muted)]'>
        Page{' '}
        <strong className='font-semibold text-[var(--color-ink)]'>
          {meta.page}
        </strong>{' '}
        of {totalPages}
      </p>

      <div className='flex gap-2'>
        <Button
          type='button'
          variant='secondary'
          disabled={meta.page <= 1 || loading}
          onClick={() => onPageChange(meta.page - 1)}>
          Previous
        </Button>

        <Button
          type='button'
          variant='secondary'
          disabled={meta.page >= meta.totalPages || loading}
          onClick={() => onPageChange(meta.page + 1)}>
          Next
        </Button>
      </div>
    </nav>
  );
}
