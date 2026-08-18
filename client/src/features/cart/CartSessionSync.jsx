import { useEffect } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import {
  clearAuthenticatedCart,
  loadCustomerCart,
  mergeGuestCart,
} from './cartSlice.js';

function CartSessionSync() {
  const dispatch = useDispatch();

  const { initialized, user } = useSelector((state) => state.auth);

  const { ownerId, guestItems, loadStatus, mergeStatus } = useSelector(
    (state) => state.cart,
  );

  useEffect(() => {
    if (!initialized) {
      return;
    }

    if (user?.role === 'customer') {
      /*
       * Guest Cart exists:
       *
       * merge BEFORE performing the normal Customer Cart GET.
       */
      if (guestItems.length > 0) {
        if (mergeStatus === 'idle') {
          dispatch(
            mergeGuestCart({
              customerId: user.id,
              items: guestItems,
            }),
          );

          return;
        }

        /*
         * The merge failed.
         *
         * Do not retry it automatically. Instead load the persisted
         * Customer Cart so the authenticated Customer can continue using it.
         *
         * Guest items remain separately preserved in Redux/localStorage.
         */
        if (mergeStatus === 'failed' && loadStatus === 'idle') {
          dispatch(loadCustomerCart(user.id));
        }

        return;
      }

      /*
       * No Guest Cart exists.
       *
       * Preserve the existing normal authenticated Cart restoration flow.
       */
      if (ownerId !== user.id) {
        dispatch(loadCustomerCart(user.id));
      }

      return;
    }

    /*
     * Guest/Admin must not retain a previous Customer's
     * authenticated Cart state.
     *
     * clearAuthenticatedCart preserves Guest Cart state.
     */
    if (ownerId !== null) {
      dispatch(clearAuthenticatedCart());
    }
  }, [
    dispatch,
    guestItems,
    initialized,
    loadStatus,
    mergeStatus,
    ownerId,
    user?.id,
    user?.role,
  ]);

  return null;
}

export default CartSessionSync;
