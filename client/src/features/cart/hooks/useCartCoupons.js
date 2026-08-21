import { useEffect, useMemo, useRef, useState } from 'react';

import { useDispatch } from 'react-redux';

import { validateGuestCoupon } from '../../../api/couponApi.js';

import { normalizeApiError } from '../../../api/errors.js';

import {
  applyCartCoupon,
  clearCartActionError,
  removeCartCoupon,
} from '../cartSlice.js';

export function useCartCoupons({
  isGuest,
  isCustomer,

  userId,

  guestItems,
  guestLoadStatus,
  guestReloadKey,

  customerCart,

  actionStatus,
  actionError,
  actionOperation,

  revalidationStatus,

  customerCartHasIssues,
}) {
  const dispatch = useDispatch();

  const [guestCouponCode, setGuestCouponCode] = useState('');

  const [guestCouponPreview, setGuestCouponPreview] = useState(null);

  const [guestCouponStatus, setGuestCouponStatus] = useState('idle');

  const [guestCouponError, setGuestCouponError] = useState(null);

  const [customerCouponCode, setCustomerCouponCode] = useState('');

  const [customerCouponInputError, setCustomerCouponInputError] =
    useState(null);

  const guestCouponRequestRef = useRef(0);

  const isCustomerCartRevalidating =
    isCustomer && revalidationStatus === 'loading';

  const guestCouponCartKey = useMemo(
    () =>
      guestItems
        .map(
          (item) =>
            `${item.productId}:${item.variantId ?? 'simple'}:${item.quantity}`,
        )
        .sort()
        .join('|'),
    [guestItems],
  );

  useEffect(() => {
    if (!isCustomer) {
      setCustomerCouponCode('');

      setCustomerCouponInputError(null);

      return;
    }

    /*
     * Synchronize the input with the
     * authoritative Customer Cart.
     */
    setCustomerCouponCode(customerCart.coupon?.code ?? '');

    setCustomerCouponInputError(null);
  }, [isCustomer, customerCart.coupon?.code]);

  useEffect(() => {
    /*
     * Any Guest Cart identity,
     * quantity or pricing-refresh change
     * invalidates the old Coupon preview.
     */
    guestCouponRequestRef.current += 1;

    setGuestCouponPreview(null);

    setGuestCouponError(null);

    setGuestCouponStatus('idle');

    if (!isGuest || !guestCouponCartKey) {
      setGuestCouponCode('');
    }
  }, [guestCouponCartKey, guestReloadKey, isGuest]);

  function handleGuestCodeChange(event) {
    setGuestCouponCode(event.target.value.toUpperCase());

    /*
     * The displayed preview belongs
     * to the previously validated code.
     */
    if (guestCouponPreview || guestCouponError) {
      guestCouponRequestRef.current += 1;

      setGuestCouponPreview(null);

      setGuestCouponError(null);

      setGuestCouponStatus('idle');
    }
  }

  async function submitGuestCoupon(event) {
    event.preventDefault();

    if (
      !isGuest ||
      guestItems.length === 0 ||
      guestCouponStatus === 'loading'
    ) {
      return;
    }

    const code = guestCouponCode.trim().toUpperCase();

    if (!code) {
      setGuestCouponError({
        code: 'VALIDATION_ERROR',

        message: 'Enter a Coupon code.',

        fields: {
          code: 'Coupon code is required.',
        },
      });

      return;
    }

    const requestId = guestCouponRequestRef.current + 1;

    guestCouponRequestRef.current = requestId;

    setGuestCouponStatus('loading');

    setGuestCouponError(null);

    setGuestCouponPreview(null);

    try {
      /*
       * Never send browser-owned
       * prices or totals.
       */
      const items = guestItems.map((item) => ({
        productId: item.productId,

        ...(item.variantId
          ? {
              variantId: item.variantId,
            }
          : {}),

        quantity: item.quantity,
      }));

      const preview = await validateGuestCoupon({
        code,
        items,
      });

      /*
       * Cart may have changed while
       * this request was running.
       */
      if (guestCouponRequestRef.current !== requestId) {
        return;
      }

      setGuestCouponPreview(preview);

      setGuestCouponCode(preview.coupon.code);

      setGuestCouponStatus('succeeded');
    } catch (requestError) {
      if (guestCouponRequestRef.current !== requestId) {
        return;
      }

      setGuestCouponError(
        normalizeApiError(requestError, 'Unable to validate this Coupon.'),
      );

      setGuestCouponStatus('failed');
    }
  }

  function clearGuestCouponPreview() {
    guestCouponRequestRef.current += 1;

    setGuestCouponCode('');

    setGuestCouponPreview(null);

    setGuestCouponError(null);

    setGuestCouponStatus('idle');
  }

  function handleCustomerCodeChange(event) {
    setCustomerCouponCode(event.target.value.toUpperCase());

    setCustomerCouponInputError(null);

    if (
      actionOperation === 'coupon-apply' &&
      actionStatus !== 'loading' &&
      actionError
    ) {
      dispatch(clearCartActionError());
    }
  }

  function submitCustomerCoupon(event) {
    event.preventDefault();

    if (
      !isCustomer ||
      !userId ||
      actionStatus === 'loading' ||
      isCustomerCartRevalidating
    ) {
      return;
    }

    const code = customerCouponCode.trim().toUpperCase();

    if (!code) {
      setCustomerCouponInputError('Coupon code is required.');

      return;
    }

    setCustomerCouponInputError(null);

    dispatch(
      applyCartCoupon({
        customerId: userId,
        code,
      }),
    );
  }

  function removeCustomerCoupon() {
    if (
      !isCustomer ||
      !userId ||
      actionStatus === 'loading' ||
      isCustomerCartRevalidating
    ) {
      return;
    }

    setCustomerCouponInputError(null);

    dispatch(removeCartCoupon(userId));
  }

  const customerCoupon = isCustomer ? (customerCart.coupon ?? null) : null;

  const guestCouponPricing = isGuest
    ? (guestCouponPreview?.pricing ?? null)
    : null;

  const isApplyingCustomerCoupon =
    isCustomer &&
    actionStatus === 'loading' &&
    actionOperation === 'coupon-apply';

  const isRemovingCustomerCoupon =
    isCustomer &&
    actionStatus === 'loading' &&
    actionOperation === 'coupon-remove';

  const customerCouponApplyError =
    isCustomer &&
    actionStatus !== 'loading' &&
    actionOperation === 'coupon-apply'
      ? actionError
      : null;

  const customerCouponRemoveError =
    isCustomer &&
    actionStatus !== 'loading' &&
    actionOperation === 'coupon-remove'
      ? actionError
      : null;

  const guestCouponDisabled =
    guestCouponStatus === 'loading' ||
    guestItems.length === 0 ||
    guestLoadStatus === 'loading' ||
    guestLoadStatus === 'refreshing';

  const customerCouponDisabled =
    isApplyingCustomerCoupon ||
    isRemovingCustomerCoupon ||
    isCustomerCartRevalidating ||
    customerCartHasIssues;

  return {
    guestCouponCode,
    guestCouponPreview,
    guestCouponStatus,
    guestCouponError,
    guestCouponPricing,
    guestCouponDisabled,

    customerCouponCode,
    customerCoupon,
    customerCouponInputError,
    customerCouponApplyError,
    customerCouponRemoveError,
    customerCouponDisabled,

    isApplyingCustomerCoupon,
    isRemovingCustomerCoupon,

    handleGuestCodeChange,
    submitGuestCoupon,
    clearGuestCouponPreview,

    handleCustomerCodeChange,
    submitCustomerCoupon,
    removeCustomerCoupon,
  };
}
