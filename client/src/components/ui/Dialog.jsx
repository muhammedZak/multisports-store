import { useEffect, useRef } from 'react';

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const handleCancel = (event) => {
    event.preventDefault();

    onClose?.();
  };

  const handleBackdropClick = (event) => {
    if (event.target === dialogRef.current) {
      onClose?.();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      className='m-auto w-[min(92vw,36rem)] border border-[var(--color-border)] bg-white p-0 text-[var(--color-ink)] shadow-xl'>
      <div className='flex items-start justify-between gap-6 border-b border-[var(--color-border)] px-5 py-4'>
        <div>
          <h2 className='mb-0 text-lg font-bold tracking-[-0.02em]'>{title}</h2>

          {description ? (
            <p className='mt-1 mb-0 text-sm text-[var(--color-muted)]'>
              {description}
            </p>
          ) : null}
        </div>

        <button
          type='button'
          onClick={onClose}
          className='grid size-9 shrink-0 place-items-center border border-transparent text-xl leading-none hover:border-[var(--color-border)] hover:bg-[var(--color-surface)]'
          aria-label='Close dialog'>
          ×
        </button>
      </div>

      <div className='px-5 py-5'>{children}</div>

      {footer ? (
        <div className='border-t border-[var(--color-border)] px-5 py-4'>
          {footer}
        </div>
      ) : null}
    </dialog>
  );
}
