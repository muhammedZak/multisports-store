import { Link } from 'react-router';

import { useSelector } from 'react-redux';

import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

import { CheckoutAddressSelector } from '../../features/checkout/components/CheckoutAddressSelector.jsx';
import { CheckoutOrderReview } from '../../features/checkout/components/CheckoutOrderReview.jsx';
import { CheckoutPaymentSummary } from '../../features/checkout/components/CheckoutPaymentSummary.jsx';

import { useCheckoutAddresses } from '../../features/checkout/hooks/useCheckoutAddresses.js';
import { useCheckoutPayment } from '../../features/checkout/hooks/useCheckoutPayment.js';
import { useCheckoutPreview } from '../../features/checkout/hooks/useCheckoutPreview.js';

function CheckoutLoading() {
  return (
    <main className='ds-container py-10 lg:py-12'>
      <div className='max-w-xl'>
        <Skeleton className='h-3 w-24' />

        <Skeleton className='mt-4 h-10 w-3/4' />

        <Skeleton className='mt-3 h-4 w-full' />
      </div>

      <div className='mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]'>
        <div>
          <Skeleton className='h-6 w-48' />

          <div className='mt-5 grid gap-3 md:grid-cols-2'>
            <Skeleton className='h-44 w-full' />

            <Skeleton className='h-44 w-full' />
          </div>

          <Skeleton className='mt-10 h-6 w-40' />

          <Skeleton className='mt-5 h-40 w-full' />
        </div>

        <div>
          <Skeleton className='h-6 w-36' />

          <Skeleton className='mt-6 h-4 w-full' />

          <Skeleton className='mt-5 h-4 w-full' />

          <Skeleton className='mt-6 h-12 w-full' />
        </div>
      </div>
    </main>
  );
}

function CheckoutPage() {
  const user = useSelector((state) => state.auth.user);

  const addresses = useCheckoutAddresses();

  const checkoutPreview = useCheckoutPreview(addresses.selectedAddressId);

  const payment = useCheckoutPayment({
    user,

    selectedAddressId: addresses.selectedAddressId,

    selectedAddress: addresses.selectedAddress,

    preview: checkoutPreview.preview,

    loadPreview: checkoutPreview.loadPreview,

    loadAddresses: addresses.loadAddresses,
  });

  if (addresses.status === 'loading' && addresses.addresses.length === 0) {
    return <CheckoutLoading />;
  }

  return (
    <main className='ds-container py-8 lg:py-12'>
      <header className='border-b border-[var(--color-border)] pb-7 lg:pb-8'>
        <p className='mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-muted)]'>
          Checkout
        </p>

        <h1 className='mb-0 text-3xl font-black tracking-[-0.045em] sm:text-4xl lg:text-5xl'>
          Review your Order
        </h1>

        <p className='mt-3 mb-0 max-w-2xl text-sm leading-6 text-[var(--color-muted)]'>
          Shipping, pricing, stock and Coupon eligibility are checked again
          before payment starts.
        </p>
      </header>

      {addresses.error ? (
        <div className='mt-6'>
          <Alert
            variant='danger'
            title='Unable to load saved addresses'
            actions={
              <Button
                type='button'
                variant='secondary'
                size='sm'
                disabled={payment.checkoutControlsLocked}
                onClick={addresses.loadAddresses}>
                Try again
              </Button>
            }>
            {addresses.error.message}
          </Alert>
        </div>
      ) : null}

      {!addresses.error && addresses.addresses.length === 0 ? (
        <section className='border-y border-[var(--color-border)] py-16 text-center sm:py-20'>
          <p className='mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]'>
            Delivery
          </p>

          <h2 className='mb-0 text-2xl font-black tracking-[-0.035em]'>
            Add a shipping address
          </h2>

          <p className='mx-auto mt-3 mb-0 max-w-lg text-sm leading-6 text-[var(--color-muted)]'>
            Checkout needs a shipping address before your Order can be reviewed.
          </p>

          <Link
            to='/account/addresses/new'
            state={{
              from: '/checkout',
            }}
            className='mt-6 inline-flex min-h-11 items-center border border-[var(--color-ink)] bg-[var(--color-ink)] px-5 text-sm font-bold text-white transition hover:bg-[#2b2b2b]'>
            Add shipping address
          </Link>
        </section>
      ) : null}

      {addresses.addresses.length > 0 ? (
        <div className='mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start xl:gap-16'>
          <div className='space-y-10'>
            <CheckoutAddressSelector
              addresses={addresses.addresses}
              selectedAddressId={addresses.selectedAddressId}
              disabled={payment.checkoutControlsLocked}
              onSelect={addresses.setSelectedAddressId}
            />

            <CheckoutOrderReview
              preview={checkoutPreview.preview}
              status={checkoutPreview.status}
              error={checkoutPreview.error}
              controlsLocked={payment.checkoutControlsLocked}
              onRefresh={payment.refreshCheckout}
              onRetry={checkoutPreview.loadPreview}
            />
          </div>

          <CheckoutPaymentSummary
            preview={checkoutPreview.preview}
            previewStatus={checkoutPreview.status}
            paymentStatus={payment.paymentStatus}
            paymentError={payment.paymentError}
            providerAttemptMessage={payment.providerAttemptMessage}
            paymentInProgress={payment.paymentInProgress}
            paymentNeedsVerification={payment.paymentNeedsVerification}
            paymentBlocked={payment.paymentBlocked}
            onPayment={payment.handlePayment}
          />
        </div>
      ) : null}
    </main>
  );
}

export default CheckoutPage;
