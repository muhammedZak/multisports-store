import { configureStore } from '@reduxjs/toolkit';

import authReducer from '../../features/auth/authSlice.js';
import cartReducer from '../../features/cart/cartSlice.js';

import { saveGuestCartItems } from '../../features/cart/guestCartStorage.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
  },
});

let previousGuestItems = store.getState().cart.guestItems;

store.subscribe(() => {
  const guestItems = store.getState().cart.guestItems;

  if (guestItems === previousGuestItems) {
    return;
  }

  previousGuestItems = guestItems;

  saveGuestCartItems(guestItems);
});
