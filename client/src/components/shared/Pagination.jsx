import { Button } from '../ui/Button.jsx';

export function Pagination({
  page,
  totalPages,
  totalItems,

  itemLabel = 'item',

  loading = false,

  onPageChange,
}) {
  const safeTotalPages = Math.max(totalPages ?? 0, 1);

  return (
    <nav
      aria-label={`${itemLabel} pagination`}
      className='mt-8 flex flex-col gap-4 border-t border-[var(--color-border)] pt-5 sm:flex-row sm:items-center sm:justify-between'>
      <p className='mb-0 text-sm text-[var(--color-muted)]'>
        {totalItems} {itemLabel}
        {totalItems === 1 ? '' : 's'}
      </p>

      <div className='flex flex-wrap items-center gap-3'>
        <Button
          type='button'
          variant='secondary'
          size='sm'
          disabled={page <= 1 || loading}
          onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>

        <span className='text-sm font-semibold'>
          Page {page} of {safeTotalPages}
        </span>

        <Button
          type='button'
          variant='secondary'
          size='sm'
          disabled={page >= totalPages || loading}
          onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
    </nav>
  );
}
