import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Link, useNavigate } from 'react-router';

import { useDispatch, useSelector } from 'react-redux';

import {
  createRazorpayPaymentOrder,
  previewCheckout,
  verifyRazorpayPayment,
} from '../../api/checkoutApi.js';

import { normalizeApiError } from '../../api/errors.js';

import { fetchMyAddresses } from '../../api/userApi.js';

import { revalidateCustomerCart } from '../../features/cart/cartSlice.js';

import { formatInrFromPaise } from '../../utils/money.js';

import { openRazorpayCheckout } from '../../utils/razorpayCheckout.js';

const CHECKOUT_REFRESH_ERROR_CODES = new Set([
  'CART_EMPTY',
  'CART_ITEM_UNAVAILABLE',
  'OUT_OF_STOCK',
  'INVALID_COUPON',
  'COUPON_INACTIVE',
  'COUPON_NOT_STARTED',
  'COUPON_EXPIRED',
  'COUPON_MINIMUM_NOT_MET',
  'COUPON_USAGE_LIMIT_REACHED',
  'CHECKOUT_NOT_READY',
  'ZERO_VALUE_CHECKOUT_UNSUPPORTED',
]);

const PAYMENT_BLOCKING_ERROR_CODES = new Set([
  'PAYMENT_AMOUNT_MISMATCH',
  'PAYMENT_ALREADY_PROCESSED',
  'ORDER_FINALIZATION_FAILED',
]);

function formatOptionName(name) {
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function AddressCard({ address, selected, disabled, onSelect }) {
  return (
    <label
      className={`block border p-5 ${
        selected ? 'border-black bg-neutral-50' : 'border-neutral-200'
      } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
      <div className='flex items-start gap-3'>
        <input
          type='radio'
          name='shippingAddress'
          checked={selected}
          disabled={disabled}
          onChange={() => onSelect(address.id)}
          className='mt-1 h-4 w-4'
        />

        <div className='min-w-0'>
          <div className='flex flex-wrap items-center gap-2'>
            <p className='font-semibold'>{address.fullName}</p>

            {address.isDefault && (
              <span className='bg-green-50 px-2 py-1 text-xs font-medium text-green-700'>
                Default
              </span>
            )}
          </div>

          <div className='mt-3 space-y-1 text-sm leading-6 text-neutral-600'>
            <p>{address.address}</p>

            <p>
              {address.city}, {address.state} {address.postalCode}
            </p>

            <p>{address.country}</p>

            <p className='pt-1'>{address.phone}</p>
          </div>
        </div>
      </div>
    </label>
  );
}

function CheckoutItem({ item }) {
  const options = Object.entries(item.variant?.options ?? {});

  return (
    <article className='border-b border-neutral-200 py-5 last:border-0'>
      <div className='flex items-start justify-between gap-5'>
        <div>
          <p className='font-semibold'>
            {item.product?.name ?? 'Unavailable product'}
          </p>

          {item.product?.brand && (
            <p className='mt-1 text-sm text-neutral-500'>
              {item.product.brand}
            </p>
          )}

          {options.length > 0 && (
            <div className='mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-600'>
              {options.map(([name, value]) => (
                <span key={name}>
                  {formatOptionName(name)}:{' '}
                  <span className='font-medium text-black'>
                    {String(value)}
                  </span>
                </span>
              ))}
            </div>
          )}

          <p className='mt-2 text-sm text-neutral-600'>
            Quantity: {item.quantity}
          </p>

          {item.issues?.map((issue, index) => (
            <p
              key={`${item.id}-issue-${index}`}
              className='mt-2 text-sm text-amber-700'>
              {issue.message}
            </p>
          ))}
        </div>

        <div className='text-right'>
          <p className='font-semibold'>
            {formatInrFromPaise(item.pricing?.lineTotal)}
          </p>

          <p className='mt-1 text-xs text-neutral-500'>
            {formatInrFromPaise(item.pricing?.unitPrice)} each
          </p>
        </div>
      </div>
    </article>
  );
}

function CheckoutPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const user = useSelector((state) => state.auth.user);

  const [addresses, setAddresses] = useState([]);

  const [addressesStatus, setAddressesStatus] = useState('loading');

  const [addressesError, setAddressesError] = useState(null);

  const [selectedAddressId, setSelectedAddressId] = useState('');

  const [preview, setPreview] = useState(null);

  const [previewStatus, setPreviewStatus] = useState('idle');

  const [previewError, setPreviewError] = useState(null);

  /*
   * Keep one provider Order available after
   * closing Razorpay so Retry Payment reopens
   * the SAME provider Order instead of
   * immediately creating another payable Order.
   */
  const [paymentSession, setPaymentSession] = useState(null);

  /*
   * Once Razorpay reports success, preserve
   * these callback values until backend
   * verification succeeds.
   *
   * Never start another payment while these
   * values are awaiting verification.
   */
  const [verificationPayload, setVerificationPayload] = useState(null);

  const [paymentStatus, setPaymentStatus] = useState('idle');

  const [paymentError, setPaymentError] = useState(null);

  const [providerAttemptMessage, setProviderAttemptMessage] = useState('');

  const previewRequestRef = useRef(0);

  const loadAddresses = useCallback(async () => {
    setAddressesStatus('loading');
    setAddressesError(null);

    try {
      const items = await fetchMyAddresses();

      setAddresses(items);

      setSelectedAddressId((current) => {
        if (current && items.some((item) => item.id === current)) {
          return current;
        }

        return items.find((item) => item.isDefault)?.id ?? items[0]?.id ?? '';
      });

      setAddressesStatus('succeeded');
    } catch (error) {
      setAddressesError(
        normalizeApiError(error, 'Unable to load your saved addresses.'),
      );

      setAddressesStatus('failed');
    }
  }, []);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const loadPreview = useCallback(async () => {
    if (!selectedAddressId) {
      setPreview(null);
      setPreviewStatus('idle');
      setPreviewError(null);

      return;
    }

    const requestId = previewRequestRef.current + 1;

    previewRequestRef.current = requestId;

    setPreviewStatus('loading');
    setPreviewError(null);

    try {
      const checkout = await previewCheckout({
        shippingAddressId: selectedAddressId,
      });

      if (previewRequestRef.current !== requestId) {
        return;
      }

      setPreview(checkout);

      setPreviewStatus('succeeded');
    } catch (error) {
      if (previewRequestRef.current !== requestId) {
        return;
      }

      setPreview(null);

      setPreviewError(normalizeApiError(error, 'Unable to prepare checkout.'));

      setPreviewStatus('failed');
    }
  }, [selectedAddressId]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  /*
   * Changing shipping address invalidates any
   * provider Order created for the previous
   * Checkout intent.
   *
   * Verification-pending states disable the
   * address controls, so this cannot discard
   * a successful callback awaiting verify.
   */
  useEffect(() => {
    setPaymentSession(null);
    setVerificationPayload(null);
    setPaymentStatus('idle');
    setPaymentError(null);
    setProviderAttemptMessage('');
  }, [selectedAddressId]);

  const selectedAddress = useMemo(
    () => addresses.find((address) => address.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId],
  );

  const paymentInProgress =
    paymentStatus === 'creating' ||
    paymentStatus === 'checkout_open' ||
    paymentStatus === 'verifying';

  const paymentNeedsVerification =
    paymentStatus === 'verification_failed' && Boolean(verificationPayload);

  const paymentBlocked = paymentStatus === 'blocked';

  const checkoutControlsLocked =
    paymentInProgress || paymentNeedsVerification || paymentBlocked;

  async function verifyCompletedPayment(payload) {
    setPaymentStatus('verifying');
    setPaymentError(null);
    setProviderAttemptMessage('');

    try {
      const result = await verifyRazorpayPayment(payload);

      if (result?.result !== 'order_placed' || !result?.order) {
        setPaymentStatus('blocked');

        setPaymentError({
          code: 'ORDER_CONFIRMATION_MISSING',
          message:
            'Payment verification completed without a confirmed Order. Do not start another payment.',
          fields: {},
        });

        return;
      }

      /*
       * Task 8.6 has already reconciled the
       * persisted Cart after Order commit.
       *
       * Refresh Redux from backend authority.
       * Confirmation should not wait on this
       * non-critical UI refresh.
       */
      dispatch(revalidateCustomerCart(user.id));

      navigate('/checkout/confirmation', {
        replace: true,

        state: {
          order: result.order,
          payment: result.payment,
        },
      });
    } catch (error) {
      const normalizedError = normalizeApiError(
        error,
        'Unable to verify the completed payment.',
      );

      if (PAYMENT_BLOCKING_ERROR_CODES.has(normalizedError.code)) {
        setPaymentStatus('blocked');

        setPaymentError({
          ...normalizedError,

          message:
            normalizedError.code === 'ORDER_FINALIZATION_FAILED'
              ? 'Your payment was confirmed, but the Order could not be finalized safely. Do not make another payment for this checkout.'
              : `${normalizedError.message} Do not start another payment until this payment is resolved.`,
        });

        return;
      }

      /*
       * Provider/network verification failures
       * may occur AFTER the Customer has paid.
       *
       * Preserve callback data and offer only
       * Retry verification.
       */
      setPaymentStatus('verification_failed');

      setPaymentError({
        ...normalizedError,

        message:
          'The payment response was received, but backend verification did not finish. Retry verification; do not pay again.',
      });
    }
  }

  async function handlePayment() {
    if (
      !selectedAddressId ||
      !preview?.canProceed ||
      paymentInProgress ||
      paymentBlocked
    ) {
      return;
    }

    if (paymentNeedsVerification && verificationPayload) {
      await verifyCompletedPayment(verificationPayload);

      return;
    }

    setPaymentError(null);
    setProviderAttemptMessage('');

    let session = paymentSession;

    try {
      if (!session) {
        setPaymentStatus('creating');

        session = await createRazorpayPaymentOrder({
          shippingAddressId: selectedAddressId,
        });

        const razorpay = session?.razorpay;

        if (
          !razorpay?.keyId ||
          !razorpay?.orderId ||
          !Number.isSafeInteger(razorpay.amount) ||
          razorpay.amount <= 0 ||
          razorpay.currency !== 'INR'
        ) {
          throw new Error('Invalid Razorpay Order response.');
        }

        /*
         * Payment creation performs a second
         * authoritative Checkout resolution.
         *
         * If the amount changed between preview
         * and payment creation, make the Customer
         * review the new total instead of silently
         * opening Razorpay for a different amount.
         */
        if (razorpay.amount !== preview.pricing.totalAmount) {
          setPaymentStatus('idle');
          setPaymentSession(null);

          setPaymentError({
            code: 'CHECKOUT_CHANGED',
            message:
              'Checkout pricing changed before payment. Review the refreshed total before continuing.',
            fields: {},
          });

          await loadPreview();

          return;
        }

        setPaymentSession(session);
      }

      setPaymentStatus('checkout_open');

      const result = await openRazorpayCheckout({
        options: {
          key: session.razorpay.keyId,

          amount: session.razorpay.amount,

          currency: session.razorpay.currency,

          order_id: session.razorpay.orderId,

          name: 'MultiSports Store',

          description: 'Order payment',

          prefill: {
            name: selectedAddress?.fullName ?? user?.name ?? '',

            email: user?.email ?? '',

            contact: selectedAddress?.phone ?? user?.phone ?? '',
          },
        },

        onPaymentFailed(providerError) {
          setProviderAttemptMessage(
            providerError?.description ??
              'Razorpay reported a failed payment attempt. You can retry inside the payment window or close it.',
          );
        },
      });

      if (result.status === 'cancelled') {
        setPaymentStatus('idle');

        setPaymentError({
          code: 'PAYMENT_WINDOW_CLOSED',

          message:
            'The payment window was closed. No Order has been confirmed. You can reopen the same payment.',
          fields: {},
        });

        return;
      }

      const response = result.response;

      const payload = {
        razorpayOrderId: response?.razorpay_order_id,

        razorpayPaymentId: response?.razorpay_payment_id,

        razorpaySignature: response?.razorpay_signature,
      };

      if (
        !payload.razorpayOrderId ||
        !payload.razorpayPaymentId ||
        !payload.razorpaySignature
      ) {
        setPaymentStatus('blocked');

        setPaymentError({
          code: 'PAYMENT_CALLBACK_INVALID',

          message:
            'Razorpay returned an incomplete successful-payment response. Do not start another payment.',
          fields: {},
        });

        return;
      }

      setVerificationPayload(payload);

      await verifyCompletedPayment(payload);
    } catch (error) {
      const normalizedError = normalizeApiError(
        error,
        'Unable to start Razorpay payment.',
      );

      setPaymentStatus('idle');

      setPaymentError(normalizedError);

      if (CHECKOUT_REFRESH_ERROR_CODES.has(normalizedError.code)) {
        setPaymentSession(null);

        dispatch(revalidateCustomerCart(user.id));

        await loadPreview();
      }

      if (normalizedError.code === 'INVALID_SHIPPING_ADDRESS') {
        setPaymentSession(null);

        await loadAddresses();
      }
    }
  }

  async function handleRefreshCheckout() {
    if (checkoutControlsLocked) {
      return;
    }

    /*
     * Explicit refresh means the Customer wants
     * a new current Checkout intent.
     *
     * Do not reuse a previous uncompleted
     * provider Order after that review changes.
     */
    setPaymentSession(null);
    setPaymentError(null);
    setProviderAttemptMessage('');

    await loadPreview();
  }

  if (addressesStatus === 'loading') {
    return (
      <main className='mx-auto max-w-7xl px-5 py-10 lg:px-8'>
        <p className='text-sm text-neutral-600'>Loading checkout...</p>
      </main>
    );
  }

  return (
    <main className='mx-auto max-w-7xl px-5 py-10 lg:px-8'>
      <div>
        <Link
          to='/cart'
          className='text-sm font-medium underline underline-offset-4'>
          Back to cart
        </Link>

        <p className='mt-8 text-sm font-medium uppercase tracking-[0.2em] text-neutral-500'>
          Checkout
        </p>

        <h1 className='mt-3 text-3xl font-semibold tracking-tight sm:text-4xl'>
          Review your order
        </h1>

        <p className='mt-3 max-w-2xl text-sm leading-6 text-neutral-600'>
          Shipping, pricing, stock and Coupon eligibility are checked again
          before payment starts.
        </p>
      </div>

      {addressesError && (
        <div
          role='alert'
          className='mt-8 border border-red-200 bg-red-50 p-4 text-sm text-red-700'>
          <p>{addressesError.message}</p>

          <button
            type='button'
            onClick={loadAddresses}
            className='mt-3 font-medium underline underline-offset-4'>
            Try again
          </button>
        </div>
      )}

      {!addressesError && addresses.length === 0 && (
        <section className='mt-8 border border-neutral-200 p-8 text-center'>
          <h2 className='text-xl font-semibold'>Add a shipping address</h2>

          <p className='mx-auto mt-3 max-w-lg text-sm leading-6 text-neutral-600'>
            Checkout needs a shipping address before your order can be reviewed.
          </p>

          <Link
            to='/account/addresses/new'
            state={{
              from: '/checkout',
            }}
            className='mt-5 inline-flex bg-black px-5 py-3 text-sm font-medium text-white'>
            Add shipping address
          </Link>
        </section>
      )}

      {addresses.length > 0 && (
        <div className='mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start'>
          <div className='space-y-8'>
            <section>
              <div className='flex flex-wrap items-end justify-between gap-4'>
                <div>
                  <h2 className='text-xl font-semibold'>Shipping address</h2>

                  <p className='mt-2 text-sm text-neutral-600'>
                    Select where this order should be delivered.
                  </p>
                </div>

                <Link
                  to='/account/addresses/new'
                  state={{
                    from: '/checkout',
                  }}
                  className='text-sm font-medium underline underline-offset-4'>
                  Add another address
                </Link>
              </div>

              <div className='mt-5 grid gap-4 md:grid-cols-2'>
                {addresses.map((address) => (
                  <AddressCard
                    key={address.id}
                    address={address}
                    selected={selectedAddressId === address.id}
                    disabled={checkoutControlsLocked}
                    onSelect={setSelectedAddressId}
                  />
                ))}
              </div>
            </section>

            <section className='border border-neutral-200 p-6'>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <div>
                  <h2 className='text-xl font-semibold'>Order review</h2>

                  <p className='mt-1 text-sm text-neutral-600'>
                    Current server-approved Cart contents and pricing.
                  </p>
                </div>

                <button
                  type='button'
                  disabled={
                    previewStatus === 'loading' || checkoutControlsLocked
                  }
                  onClick={handleRefreshCheckout}
                  className='text-sm font-medium underline underline-offset-4 disabled:cursor-not-allowed disabled:text-neutral-400'>
                  {previewStatus === 'loading'
                    ? 'Refreshing...'
                    : 'Refresh checkout'}
                </button>
              </div>

              {previewStatus === 'loading' && (
                <p className='mt-6 text-sm text-neutral-600'>
                  Checking current availability and pricing...
                </p>
              )}

              {previewError && (
                <div
                  role='alert'
                  className='mt-6 border border-red-200 bg-red-50 p-4 text-sm text-red-700'>
                  <p>{previewError.message}</p>

                  <button
                    type='button'
                    disabled={checkoutControlsLocked}
                    onClick={loadPreview}
                    className='mt-3 font-medium underline underline-offset-4 disabled:opacity-50'>
                    Try again
                  </button>
                </div>
              )}

              {preview && preview.issues?.length > 0 && (
                <div className='mt-6 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800'>
                  <p className='font-medium'>Checkout needs your attention.</p>

                  <div className='mt-2 space-y-2'>
                    {preview.issues.map((issue, index) => (
                      <p key={`${issue.code}-${index}`}>{issue.message}</p>
                    ))}
                  </div>

                  <Link
                    to='/cart'
                    className='mt-3 inline-flex font-medium underline underline-offset-4'>
                    Review cart
                  </Link>
                </div>
              )}

              {preview?.items?.length > 0 && (
                <div className='mt-5'>
                  {preview.items.map((item) => (
                    <CheckoutItem key={item.id} item={item} />
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className='border border-neutral-200 p-6 lg:sticky lg:top-6'>
            <h2 className='text-lg font-semibold'>Payment summary</h2>

            <div className='mt-5 space-y-3'>
              <div className='flex justify-between gap-4'>
                <span className='text-sm text-neutral-600'>Subtotal</span>

                <span className='font-medium'>
                  {formatInrFromPaise(preview?.pricing?.subtotal)}
                </span>
              </div>

              {(preview?.pricing?.discountAmount ?? 0) > 0 && (
                <div className='flex justify-between gap-4'>
                  <span className='text-sm text-neutral-600'>
                    Coupon discount
                  </span>

                  <span className='font-medium text-green-700'>
                    −{formatInrFromPaise(preview.pricing.discountAmount)}
                  </span>
                </div>
              )}

              {preview?.coupon && (
                <div className='border border-green-200 bg-green-50 p-3 text-sm text-green-800'>
                  <span className='font-medium'>{preview.coupon.code}</span>{' '}
                  applied
                </div>
              )}

              <div className='flex justify-between gap-4 border-t border-neutral-200 pt-4'>
                <span className='font-semibold'>Total</span>

                <span className='text-xl font-semibold'>
                  {formatInrFromPaise(preview?.pricing?.totalAmount)}
                </span>
              </div>
            </div>

            {providerAttemptMessage && (
              <div
                role='status'
                className='mt-5 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800'>
                {providerAttemptMessage}
              </div>
            )}

            {paymentError && (
              <div
                role='alert'
                className={`mt-5 border p-3 text-sm ${
                  paymentBlocked || paymentNeedsVerification
                    ? 'border-amber-300 bg-amber-50 text-amber-900'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}>
                {paymentError.message}
              </div>
            )}

            {paymentStatus === 'creating' && (
              <p aria-live='polite' className='mt-5 text-sm text-neutral-600'>
                Preparing secure payment...
              </p>
            )}

            {paymentStatus === 'checkout_open' && (
              <p aria-live='polite' className='mt-5 text-sm text-neutral-600'>
                Complete payment in the Razorpay window.
              </p>
            )}

            {paymentStatus === 'verifying' && (
              <div
                aria-live='polite'
                className='mt-5 border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800'>
                Payment response received. Verifying and placing your Order...
              </div>
            )}

            <button
              type='button'
              disabled={
                !preview?.canProceed ||
                previewStatus !== 'succeeded' ||
                paymentInProgress ||
                paymentBlocked
              }
              onClick={handlePayment}
              className='mt-6 w-full bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50'>
              {paymentStatus === 'creating'
                ? 'Preparing payment...'
                : paymentStatus === 'checkout_open'
                  ? 'Payment window open'
                  : paymentStatus === 'verifying'
                    ? 'Verifying payment...'
                    : paymentNeedsVerification
                      ? 'Retry verification'
                      : paymentBlocked
                        ? 'Payment requires attention'
                        : `Pay ${formatInrFromPaise(
                            preview?.pricing?.totalAmount,
                          )}`}
            </button>

            <p className='mt-4 text-xs leading-5 text-neutral-500'>
              An Order is shown as confirmed only after the backend verifies the
              Razorpay payment and completes Order placement.
            </p>
          </aside>
        </div>
      )}
    </main>
  );
}

export default CheckoutPage;
