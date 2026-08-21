import { Alert } from '../../../components/ui/Alert.jsx';
import { Badge } from '../../../components/ui/Badge.jsx';
import { Button } from '../../../components/ui/Button.jsx';

import { formatInrFromPaise } from '../../../utils/money.js';

function getPaymentButtonLabel({
  paymentStatus,

  paymentNeedsVerification,

  paymentBlocked,

  totalAmount,
}) {
  if (paymentStatus === 'creating') {
    return 'Preparing payment...';
  }

  if (paymentStatus === 'checkout_open') {
    return 'Payment window open';
  }

  if (paymentStatus === 'verifying') {
    return 'Verifying payment...';
  }

  if (paymentNeedsVerification) {
    return 'Retry verification';
  }

  if (paymentBlocked) {
    return 'Payment requires attention';
  }

  return `Pay ${formatInrFromPaise(totalAmount)}`;
}

export function CheckoutPaymentSummary({
  preview,
  previewStatus,

  paymentStatus,
  paymentError,

  providerAttemptMessage,

  paymentInProgress,
  paymentNeedsVerification,
  paymentBlocked,

  onPayment,
}) {
  const pricing = preview?.pricing;

  const discountAmount = pricing?.discountAmount ?? 0;

  const buttonLabel = getPaymentButtonLabel({
    paymentStatus,

    paymentNeedsVerification,

    paymentBlocked,

    totalAmount: pricing?.totalAmount,
  });

  const paymentDisabled =
    !preview?.canProceed ||
    previewStatus !== 'succeeded' ||
    paymentInProgress ||
    paymentBlocked;

  return (
    <aside className='border-t border-[var(--color-ink)] pt-5 lg:sticky lg:top-24'>
      <p className='mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]'>
        Payment
      </p>

      <h2 className='mb-0 text-xl font-black tracking-[-0.025em]'>Summary</h2>

      <div className='mt-5 space-y-4'>
        <div className='flex justify-between gap-4'>
          <span className='text-sm text-[var(--color-muted)]'>Subtotal</span>

          <span className='font-bold ds-tabular-nums'>
            {formatInrFromPaise(pricing?.subtotal)}
          </span>
        </div>

        {discountAmount > 0 ? (
          <div className='flex justify-between gap-4'>
            <span className='text-sm text-[var(--color-muted)]'>
              Coupon discount
            </span>

            <span className='font-semibold text-[var(--color-success)] ds-tabular-nums'>
              −{formatInrFromPaise(discountAmount)}
            </span>
          </div>
        ) : null}

        {preview?.coupon ? (
          <div>
            <Badge variant='success'>{preview.coupon.code} applied</Badge>
          </div>
        ) : null}

        <div className='flex items-baseline justify-between gap-4 border-t border-[var(--color-border)] pt-5'>
          <span className='font-bold'>Total</span>

          <span className='text-xl font-black tracking-[-0.03em] ds-tabular-nums'>
            {formatInrFromPaise(pricing?.totalAmount)}
          </span>
        </div>
      </div>

      {providerAttemptMessage ? (
        <Alert variant='warning' className='mt-5'>
          {providerAttemptMessage}
        </Alert>
      ) : null}

      {paymentError ? (
        <Alert
          variant={
            paymentBlocked || paymentNeedsVerification ? 'warning' : 'danger'
          }
          title={
            paymentNeedsVerification
              ? 'Payment needs verification'
              : paymentBlocked
                ? 'Payment requires attention'
                : 'Payment could not continue'
          }
          className='mt-5'>
          {paymentError.message}
        </Alert>
      ) : null}

      {paymentStatus === 'creating' ? (
        <Alert variant='neutral' className='mt-5'>
          Preparing secure payment...
        </Alert>
      ) : null}

      {paymentStatus === 'checkout_open' ? (
        <Alert variant='neutral' className='mt-5'>
          Complete payment in the Razorpay window.
        </Alert>
      ) : null}

      {paymentStatus === 'verifying' ? (
        <Alert
          variant='info'
          title='Payment response received'
          className='mt-5'>
          Verifying payment and placing your Order...
        </Alert>
      ) : null}

      <Button
        type='button'
        size='lg'
        disabled={paymentDisabled}
        onClick={onPayment}
        className='mt-6 w-full'>
        {buttonLabel}
      </Button>

      <p className='mt-4 mb-0 text-xs leading-5 text-[var(--color-muted)]'>
        An Order is confirmed only after the backend verifies the Razorpay
        payment and completes Order placement.
      </p>

      {paymentNeedsVerification ? (
        <p className='mt-3 mb-0 border-l-2 border-[var(--color-warning)] pl-3 text-xs font-semibold leading-5 text-[var(--color-warning)]'>
          Do not make another payment. Retry verification only.
        </p>
      ) : null}
    </aside>
  );
}
