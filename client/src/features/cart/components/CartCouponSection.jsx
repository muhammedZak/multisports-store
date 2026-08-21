import { Alert } from '../../../components/ui/Alert.jsx';
import { Button } from '../../../components/ui/Button.jsx';

export function CartCouponSection({
  isCustomer,
  isGuest,

  itemsCount,

  customerCartHasIssues,

  coupon,
}) {
  if (isCustomer) {
    return (
      <CustomerCouponSection
        itemsCount={itemsCount}
        customerCartHasIssues={customerCartHasIssues}
        coupon={coupon}
      />
    );
  }

  if (isGuest) {
    return <GuestCouponSection coupon={coupon} />;
  }

  return null;
}

function CouponInput({
  value,
  disabled,
  loading,

  onChange,
  onSubmit,
}) {
  return (
    <form onSubmit={onSubmit} className='mt-3 flex gap-2'>
      <label className='sr-only'>Coupon code</label>

      <input
        type='text'
        value={value}
        disabled={disabled}
        onChange={onChange}
        placeholder='Coupon code'
        aria-label='Coupon code'
        autoComplete='off'
        className='min-h-10 min-w-0 flex-1 border border-[var(--color-border-strong)] bg-white px-3 text-sm uppercase outline-none transition focus:border-[var(--color-ink)] disabled:bg-[var(--color-surface)]'
      />

      <Button type='submit' size='sm' disabled={disabled} isLoading={loading}>
        {loading ? 'Applying...' : 'Apply'}
      </Button>
    </form>
  );
}

function CustomerCouponSection({
  itemsCount,
  customerCartHasIssues,

  coupon,
}) {
  const {
    customerCoupon,
    customerCouponCode,

    customerCouponInputError,
    customerCouponApplyError,
    customerCouponRemoveError,

    customerHasInvalidSavedCoupon,

    customerCouponDisabled,

    isApplyingCustomerCoupon,
    isRemovingCustomerCoupon,

    handleCustomerCodeChange,
    submitCustomerCoupon,
    removeCustomerCoupon,
  } = coupon;

  return (
    <section className='border-t border-[var(--color-border)] pt-5'>
      <p className='mb-0 text-sm font-bold'>Coupon</p>

      {customerCoupon ? (
        <div className='mt-3 border-l-4 border-[var(--color-success)] bg-[var(--color-success-soft)] px-3 py-3'>
          <div className='flex items-start justify-between gap-3'>
            <div>
              <p className='mb-0 text-sm font-bold text-[var(--color-success)]'>
                {customerCoupon.code} applied
              </p>

              <p className='mt-1 mb-0 text-xs leading-5 text-[var(--color-ink-soft)]'>
                Saved to your Customer Cart and recalculated using current
                server pricing.
              </p>
            </div>

            <button
              type='button'
              disabled={isRemovingCustomerCoupon || isApplyingCustomerCoupon}
              onClick={removeCustomerCoupon}
              className='text-xs font-semibold underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50'>
              {isRemovingCustomerCoupon ? 'Removing...' : 'Remove'}
            </button>
          </div>

          {customerCouponRemoveError ? (
            <p
              role='alert'
              className='mt-3 mb-0 text-sm text-[var(--color-danger)]'>
              {customerCouponRemoveError.message}
            </p>
          ) : null}
        </div>
      ) : (
        <>
          {customerHasInvalidSavedCoupon ? (
            <Alert
              variant='warning'
              title='Saved Coupon needs attention'
              className='mt-3'
              actions={
                <Button
                  type='button'
                  variant='quiet'
                  size='sm'
                  disabled={
                    isRemovingCustomerCoupon || isApplyingCustomerCoupon
                  }
                  onClick={removeCustomerCoupon}>
                  {isRemovingCustomerCoupon ? 'Removing...' : 'Remove'}
                </Button>
              }>
              It is no longer being used for the current Cart total.
            </Alert>
          ) : null}

          <CouponInput
            value={customerCouponCode}
            disabled={customerCouponDisabled || itemsCount === 0}
            loading={isApplyingCustomerCoupon}
            onChange={handleCustomerCodeChange}
            onSubmit={submitCustomerCoupon}
          />

          {customerCouponInputError || customerCouponApplyError ? (
            <p
              role='alert'
              className='mt-3 mb-0 text-sm text-[var(--color-danger)]'>
              {customerCouponInputError ??
                customerCouponApplyError?.fields?.code ??
                customerCouponApplyError?.message}
            </p>
          ) : null}

          {customerCartHasIssues ? (
            <p className='mt-3 mb-0 text-xs leading-5 text-[var(--color-muted)]'>
              Resolve unavailable Cart items before applying a Coupon.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}

function GuestCouponSection({ coupon }) {
  const {
    guestCouponCode,
    guestCouponPreview,
    guestCouponStatus,
    guestCouponError,
    guestCouponDisabled,

    handleGuestCodeChange,
    submitGuestCoupon,
    clearGuestCouponPreview,
  } = coupon;

  const loading = guestCouponStatus === 'loading';

  return (
    <section className='border-t border-[var(--color-border)] pt-5'>
      <p className='mb-0 text-sm font-bold'>Coupon</p>

      <CouponInput
        value={guestCouponCode}
        disabled={guestCouponDisabled}
        loading={loading}
        onChange={handleGuestCodeChange}
        onSubmit={submitGuestCoupon}
      />

      {guestCouponError ? (
        <p
          role='alert'
          className='mt-3 mb-0 text-sm text-[var(--color-danger)]'>
          {guestCouponError.fields?.code ?? guestCouponError.message}
        </p>
      ) : null}

      {guestCouponPreview ? (
        <div className='mt-3 border-l-4 border-[var(--color-success)] bg-[var(--color-success-soft)] px-3 py-3'>
          <div className='flex items-start justify-between gap-3'>
            <div>
              <p className='mb-0 text-sm font-bold text-[var(--color-success)]'>
                {guestCouponPreview.coupon.code} applied
              </p>

              <p className='mt-1 mb-0 text-xs leading-5 text-[var(--color-ink-soft)]'>
                Temporary pricing preview calculated from current server
                pricing.
              </p>
            </div>

            <button
              type='button'
              onClick={clearGuestCouponPreview}
              className='text-xs font-semibold underline underline-offset-4'>
              Remove
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
