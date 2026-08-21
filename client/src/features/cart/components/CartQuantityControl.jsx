export function CartQuantityControl({
  productName,

  quantity,

  canDecrease,
  canIncrease,

  isUpdating,
  quantityBlocked,

  onDecrease,
  onIncrease,
}) {
  return (
    <div>
      <p className='mb-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]'>
        Quantity
      </p>

      <div className='inline-flex min-h-10 items-stretch border border-[var(--color-border-strong)] bg-white'>
        <button
          type='button'
          aria-label={`Decrease quantity for ${productName}`}
          disabled={!canDecrease}
          onClick={onDecrease}
          className='grid w-10 place-items-center text-lg transition-colors hover:bg-[var(--color-surface)] disabled:cursor-not-allowed disabled:text-[var(--color-border-strong)]'>
          −
        </button>

        <span
          aria-live='polite'
          className='grid min-w-11 place-items-center border-x border-[var(--color-border)] px-2 text-sm font-bold'>
          {quantity}
        </span>

        <button
          type='button'
          aria-label={`Increase quantity for ${productName}`}
          disabled={!canIncrease}
          onClick={onIncrease}
          className='grid w-10 place-items-center text-lg transition-colors hover:bg-[var(--color-surface)] disabled:cursor-not-allowed disabled:text-[var(--color-border-strong)]'>
          +
        </button>
      </div>

      {isUpdating ? (
        <p className='mt-2 mb-0 text-xs text-[var(--color-muted)]'>
          Updating...
        </p>
      ) : null}

      {quantityBlocked ? (
        <p className='mt-2 mb-0 max-w-xs text-xs leading-5 text-[var(--color-muted)]'>
          Refresh or remove this item before changing its quantity.
        </p>
      ) : null}
    </div>
  );
}
