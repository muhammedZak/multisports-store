import { useEffect, useState } from 'react';

import { useNavigate } from 'react-router';

import { useDispatch } from 'react-redux';

import {
  createRazorpayPaymentOrder,
  verifyRazorpayPayment,
} from '../../../api/checkoutApi.js';

import { normalizeApiError } from '../../../api/errors.js';

import { revalidateCustomerCart } from '../../cart/cartSlice.js';

import { openRazorpayCheckout } from '../../../utils/razorpayCheckout.js';

import {
  CHECKOUT_REFRESH_ERROR_CODES,
  PAYMENT_BLOCKING_ERROR_CODES,
} from '../checkout.constants.js';

export function useCheckoutPayment({
  user,

  selectedAddressId,
  selectedAddress,

  preview,

  loadPreview,
  loadAddresses,
}) {
  const dispatch = useDispatch();

  const navigate = useNavigate();

  /*
   * Keep one provider Order
   * available after Customer
   * closes Razorpay.
   *
   * Retry must reopen the same
   * provider Order rather than
   * creating another payable
   * Order immediately.
   */
  const [paymentSession, setPaymentSession] = useState(null);

  /*
   * Once Razorpay reports success,
   * preserve callback values until
   * backend verification succeeds.
   */
  const [verificationPayload, setVerificationPayload] = useState(null);

  const [paymentStatus, setPaymentStatus] = useState('idle');

  const [paymentError, setPaymentError] = useState(null);

  const [providerAttemptMessage, setProviderAttemptMessage] = useState('');

  /*
   * Changing address creates
   * a different Checkout intent.
   *
   * Verification-pending and blocked
   * states lock address controls, so
   * this cannot discard a successful
   * provider callback awaiting verify.
   */
  useEffect(() => {
    setPaymentSession(null);

    setVerificationPayload(null);

    setPaymentStatus('idle');

    setPaymentError(null);

    setProviderAttemptMessage('');
  }, [selectedAddressId]);

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
       * Order finalization already
       * reconciled persisted Cart.
       *
       * Refresh Redux from backend
       * authority but do not delay
       * confirmation navigation.
       */
      dispatch(revalidateCustomerCart(user.id));

      navigate(`/checkout/confirmation/${result.order.id}`, {
        replace: true,

        state: {
          order: result.order,

          payment: result.payment,
        },
      });
    } catch (requestError) {
      const normalizedError = normalizeApiError(
        requestError,
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
       * This may happen AFTER
       * Customer has paid.
       *
       * Never offer another payment.
       * Preserve the successful
       * callback and retry backend
       * verification only.
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

    /*
     * Customer already completed
     * payment at provider.
     *
     * Only backend verification
     * may be retried.
     */
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
         * Payment creation performs
         * a second authoritative
         * Checkout resolution.
         *
         * Never silently charge a
         * different amount than
         * Customer just reviewed.
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
    } catch (requestError) {
      const normalizedError = normalizeApiError(
        requestError,
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

  async function refreshCheckout() {
    if (checkoutControlsLocked) {
      return;
    }

    /*
     * Explicit Checkout refresh
     * means Customer wants a new
     * current Checkout intent.
     *
     * Do not reuse the old
     * uncompleted provider Order.
     */
    setPaymentSession(null);

    setPaymentError(null);

    setProviderAttemptMessage('');

    await loadPreview();
  }

  return {
    paymentStatus,
    paymentError,

    providerAttemptMessage,

    paymentInProgress,

    paymentNeedsVerification,

    paymentBlocked,

    checkoutControlsLocked,

    handlePayment,

    refreshCheckout,
  };
}
