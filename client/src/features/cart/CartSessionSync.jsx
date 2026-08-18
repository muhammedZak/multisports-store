import { useEffect } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import { clearAuthenticatedCart, loadCustomerCart } from './cartSlice.js';

function CartSessionSync() {
  const dispatch = useDispatch();

  const { initialized, user } = useSelector((state) => state.auth);

  const ownerId = useSelector((state) => state.cart.ownerId);

  useEffect(() => {
    if (!initialized) {
      return;
    }

    if (user?.role === 'customer') {
      if (ownerId !== user.id) {
        dispatch(loadCustomerCart(user.id));
      }

      return;
    }

    /*
     * Guest/Admin must not retain a previous Customer's
     * authenticated Cart state.
     */
    if (ownerId !== null) {
      dispatch(clearAuthenticatedCart());
    }
  }, [dispatch, initialized, ownerId, user?.id, user?.role]);

  return null;
}

export default CartSessionSync;
