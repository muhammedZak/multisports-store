import { useEffect, useRef } from 'react';

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}) {
  const drawerRef = useRef(null);

  useEffect(() => {
    const drawer = drawerRef.current;

    if (!drawer) {
      return;
    }

    if (open && !drawer.open) {
      drawer.showModal();
    }

    if (!open && drawer.open) {
      drawer.close();
    }
  }, [open]);

  const handleCancel = (event) => {
    event.preventDefault();

    onClose?.();
  };

  const handleBackdropClick = (event) => {
    if (event.target === drawerRef.current) {
      onClose?.();
    }
  };

  return (
    <dialog
      ref={drawerRef}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      className='m-0 ml-auto h-dvh max-h-none w-[min(92vw,30rem)] border-0 border-l border-[var(--color-border)] bg-white p-0 text-[var(--color-ink)] shadow-2xl'>
      <div className='flex h-full flex-col'>
        <div className='flex items-start justify-between gap-6 border-b border-[var(--color-border)] px-5 py-4'>
          <div>
            <h2 className='mb-0 text-lg font-bold tracking-[-0.02em]'>
              {title}
            </h2>

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
            aria-label='Close drawer'>
            ×
          </button>
        </div>

        <div className='min-h-0 flex-1 overflow-y-auto px-5 py-5'>
          {children}
        </div>

        {footer ? (
          <div className='border-t border-[var(--color-border)] px-5 py-4'>
            {footer}
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
