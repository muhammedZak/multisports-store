import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import {
  addCustomerCartItem,
  clearCustomerCart,
  fetchCustomerCart,
  mergeCustomerCart,
  removeCustomerCartItem,
  updateCustomerCartItemQuantity,
} from '../../api/cartApi.js';

import { normalizeApiError } from '../../api/errors.js';

import {
  loadGuestCartItems,
  sanitizeGuestCartItem,
} from './guestCartStorage.js';

function createEmptyCart() {
  return {
    id: null,

    items: [],

    pricing: {
      subtotal: 0,
    },

    issues: [],

    canCheckout: false,
  };
}

function createAuthenticatedCartState() {
  return {
    cart: createEmptyCart(),

    ownerId: null,

    initialized: false,

    loadStatus: 'idle',
    actionStatus: 'idle',

    loadError: null,
    actionError: null,

    loadRequestId: null,
    actionRequestId: null,

    actionItemId: null,
    actionOperation: null,

    mergeStatus: 'idle',
    mergeError: null,
    mergeRequestId: null,
  };
}

function createInitialState() {
  return {
    ...createAuthenticatedCartState(),

    guestItems: loadGuestCartItems(),
  };
}

const initialState = createInitialState();

export const loadCustomerCart = createAsyncThunk(
  'cart/loadCustomerCart',

  async (customerId, { rejectWithValue }) => {
    try {
      const cart = await fetchCustomerCart();

      return {
        customerId,
        cart,
      };
    } catch (error) {
      return rejectWithValue(
        normalizeApiError(error, 'Unable to load your cart.'),
      );
    }
  },

  {
    condition: (customerId, { getState }) => {
      if (!customerId) {
        return false;
      }

      const { cart } = getState();

      if (
        cart.ownerId === customerId &&
        (cart.loadStatus === 'loading' || cart.loadStatus === 'succeeded')
      ) {
        return false;
      }

      return true;
    },
  },
);

export const mergeGuestCart = createAsyncThunk(
  'cart/mergeGuestCart',

  async ({ customerId, items }, { rejectWithValue }) => {
    try {
      const cart = await mergeCustomerCart({
        items,
      });

      return {
        customerId,
        cart,
      };
    } catch (error) {
      return rejectWithValue(
        normalizeApiError(error, 'Unable to merge your Guest Cart.'),
      );
    }
  },

  {
    condition: ({ customerId, items }, { getState }) => {
      const state = getState();

      return (
        Boolean(customerId) &&
        Array.isArray(items) &&
        items.length > 0 &&
        state.auth.user?.id === customerId &&
        state.auth.user?.role === 'customer' &&
        state.cart.mergeStatus === 'idle'
      );
    },
  },
);

export const addCartItem = createAsyncThunk(
  'cart/addCartItem',

  async ({ customerId, item }, { rejectWithValue }) => {
    try {
      const cart = await addCustomerCartItem(item);

      return {
        customerId,
        cart,
      };
    } catch (error) {
      return rejectWithValue(
        normalizeApiError(error, 'Unable to add this item to your cart.'),
      );
    }
  },

  {
    condition: ({ customerId }, { getState }) => {
      const state = getState();

      return (
        Boolean(customerId) &&
        state.auth.user?.id === customerId &&
        state.auth.user?.role === 'customer' &&
        state.cart.actionStatus !== 'loading'
      );
    },
  },
);

export const updateCartItemQuantity = createAsyncThunk(
  'cart/updateCartItemQuantity',

  async ({ customerId, cartItemId, quantity }, { rejectWithValue }) => {
    try {
      const cart = await updateCustomerCartItemQuantity(cartItemId, {
        quantity,
      });

      return {
        customerId,
        cartItemId,
        cart,
      };
    } catch (error) {
      return rejectWithValue(
        normalizeApiError(error, 'Unable to update this cart quantity.'),
      );
    }
  },

  {
    condition: ({ customerId, cartItemId, quantity }, { getState }) => {
      const state = getState();

      return (
        Boolean(customerId) &&
        Boolean(cartItemId) &&
        Number.isSafeInteger(quantity) &&
        quantity > 0 &&
        state.auth.user?.id === customerId &&
        state.auth.user?.role === 'customer' &&
        state.cart.actionStatus !== 'loading'
      );
    },
  },
);

export const removeCartItem = createAsyncThunk(
  'cart/removeCartItem',

  async ({ customerId, cartItemId }, { rejectWithValue }) => {
    try {
      const cart = await removeCustomerCartItem(cartItemId);

      return {
        customerId,
        cartItemId,
        cart,
      };
    } catch (error) {
      return rejectWithValue(
        normalizeApiError(error, 'Unable to remove this item from your cart.'),
      );
    }
  },

  {
    condition: ({ customerId, cartItemId }, { getState }) => {
      const state = getState();

      return (
        Boolean(customerId) &&
        Boolean(cartItemId) &&
        state.auth.user?.id === customerId &&
        state.auth.user?.role === 'customer' &&
        state.cart.actionStatus !== 'loading'
      );
    },
  },
);

export const clearCart = createAsyncThunk(
  'cart/clearCart',

  async (customerId, { rejectWithValue }) => {
    try {
      const cart = await clearCustomerCart();

      return {
        customerId,
        cart,
      };
    } catch (error) {
      return rejectWithValue(
        normalizeApiError(error, 'Unable to clear your cart.'),
      );
    }
  },

  {
    condition: (customerId, { getState }) => {
      const state = getState();

      return (
        Boolean(customerId) &&
        state.auth.user?.id === customerId &&
        state.auth.user?.role === 'customer' &&
        state.cart.actionStatus !== 'loading'
      );
    },
  },
);

const cartSlice = createSlice({
  name: 'cart',

  initialState,

  reducers: {
    addGuestCartItem(state, action) {
      const incomingItem = sanitizeGuestCartItem(action.payload);

      if (!incomingItem) {
        return;
      }

      const existingItem = state.guestItems.find(
        (item) =>
          item.productId === incomingItem.productId &&
          (item.variantId ?? null) === (incomingItem.variantId ?? null),
      );

      if (existingItem) {
        const mergedQuantity = existingItem.quantity + incomingItem.quantity;

        if (!Number.isSafeInteger(mergedQuantity)) {
          return;
        }

        existingItem.quantity = mergedQuantity;

        return;
      }

      state.guestItems.push(incomingItem);
    },

    updateGuestCartItemQuantity(state, action) {
      const incomingItem = sanitizeGuestCartItem(action.payload);

      if (!incomingItem) {
        return;
      }

      const existingItem = state.guestItems.find(
        (item) =>
          item.productId === incomingItem.productId &&
          (item.variantId ?? null) === (incomingItem.variantId ?? null),
      );

      if (!existingItem) {
        return;
      }

      existingItem.quantity = incomingItem.quantity;
    },

    removeGuestCartItem(state, action) {
      const identity = sanitizeGuestCartItem({
        ...action.payload,
        quantity: 1,
      });

      if (!identity) {
        return;
      }

      state.guestItems = state.guestItems.filter(
        (item) =>
          !(
            item.productId === identity.productId &&
            (item.variantId ?? null) === (identity.variantId ?? null)
          ),
      );
    },

    clearGuestCart(state) {
      state.guestItems = [];
    },

    clearAuthenticatedCart(state) {
      /*
       * Reset only the backend-authoritative Customer Cart.
       * Guest Cart must survive login/logout/session transitions until
       * Task 6.5 explicitly performs Guest → Customer Cart merge.
       */
      const guestItems = state.guestItems;

      Object.assign(state, createAuthenticatedCartState());

      state.guestItems = guestItems;
    },

    clearCartActionError(state) {
      state.actionError = null;
      state.actionItemId = null;
      state.actionOperation = null;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(loadCustomerCart.pending, (state, action) => {
        state.ownerId = action.meta.arg;

        state.loadStatus = 'loading';
        state.loadError = null;

        state.loadRequestId = action.meta.requestId;
      })

      .addCase(loadCustomerCart.fulfilled, (state, action) => {
        if (
          state.loadRequestId !== action.meta.requestId ||
          state.ownerId !== action.payload.customerId
        ) {
          return;
        }

        state.cart = action.payload.cart;

        state.initialized = true;

        state.loadStatus = 'succeeded';
        state.loadError = null;

        state.loadRequestId = null;
      })

      .addCase(loadCustomerCart.rejected, (state, action) => {
        if (state.loadRequestId !== action.meta.requestId) {
          return;
        }

        state.initialized = true;

        state.loadStatus = 'failed';
        state.loadError = action.payload;

        state.loadRequestId = null;
      })

      .addCase(mergeGuestCart.pending, (state, action) => {
        state.ownerId = action.meta.arg.customerId;

        /*
         * The Customer Cart is intentionally considered not ready while
         * Guest → Customer reconciliation is happening.
         *
         * This prevents a stale/empty Customer Cart from flashing before the
         * authoritative merge response arrives.
         */
        state.initialized = false;

        state.loadStatus = 'idle';
        state.loadError = null;
        state.loadRequestId = null;

        state.mergeStatus = 'loading';
        state.mergeError = null;
        state.mergeRequestId = action.meta.requestId;
      })

      .addCase(mergeGuestCart.fulfilled, (state, action) => {
        if (
          state.mergeRequestId !== action.meta.requestId ||
          state.ownerId !== action.payload.customerId
        ) {
          return;
        }

        /*
         * Never calculate the merged Customer Cart locally.
         * The backend response is the commerce authority.
         */
        state.cart = action.payload.cart;

        state.initialized = true;

        state.loadStatus = 'succeeded';
        state.loadError = null;
        state.loadRequestId = null;

        state.mergeStatus = 'succeeded';
        state.mergeError = null;
        state.mergeRequestId = null;

        /*
         * Clear Guest persistence ONLY after the backend confirms success.
         *
         * The existing Redux store subscriber observes this change and removes
         * multisports_guest_cart from localStorage.
         */
        state.guestItems = [];
      })

      .addCase(mergeGuestCart.rejected, (state, action) => {
        if (state.mergeRequestId !== action.meta.requestId) {
          return;
        }

        /*
         * Do NOT clear guestItems here.
         *
         * A failed merge must preserve the Guest Cart in Redux/localStorage.
         */
        state.mergeStatus = 'failed';

        state.mergeError = action.payload ?? {
          message: 'Unable to merge your Guest Cart.',
        };

        state.mergeRequestId = null;

        /*
         * The next CartSessionSync pass will GET the Customer's actual
         * persisted Cart.
         */
        state.initialized = false;

        state.loadStatus = 'idle';
        state.loadError = null;
        state.loadRequestId = null;
      })

      .addCase(addCartItem.pending, (state, action) => {
        state.ownerId = action.meta.arg.customerId;

        state.actionStatus = 'loading';
        state.actionError = null;
        state.actionItemId = null;
        state.actionOperation = null;
        state.actionRequestId = action.meta.requestId;
      })

      .addCase(addCartItem.fulfilled, (state, action) => {
        if (
          state.actionRequestId !== action.meta.requestId ||
          state.ownerId !== action.payload.customerId
        ) {
          return;
        }

        /*
         * Never calculate Customer Cart state locally.
         * Replace it with the backend-authoritative Cart.
         */
        state.cart = action.payload.cart;

        state.initialized = true;

        state.actionStatus = 'idle';
        state.actionError = null;
        state.actionItemId = null;
        state.actionOperation = null;
        state.actionRequestId = null;
      })

      .addCase(addCartItem.rejected, (state, action) => {
        if (state.actionRequestId !== action.meta.requestId) {
          return;
        }

        state.actionStatus = 'idle';
        state.actionError = action.payload;

        state.actionItemId = null;
        state.actionOperation = null;
        state.actionRequestId = null;
      })

      .addCase(updateCartItemQuantity.pending, (state, action) => {
        state.ownerId = action.meta.arg.customerId;

        state.actionStatus = 'loading';
        state.actionError = null;

        state.actionRequestId = action.meta.requestId;
        state.actionItemId = action.meta.arg.cartItemId;
        state.actionOperation = 'quantity';
      })

      .addCase(updateCartItemQuantity.fulfilled, (state, action) => {
        if (
          state.actionRequestId !== action.meta.requestId ||
          state.ownerId !== action.payload.customerId
        ) {
          return;
        }

        /*
         * Customer Cart remains backend-authoritative.
         * Never calculate the successful Customer quantity or totals locally.
         */
        state.cart = action.payload.cart;

        state.initialized = true;

        state.actionStatus = 'idle';
        state.actionError = null;

        state.actionRequestId = null;
        state.actionItemId = null;

        state.actionOperation = null;
      })

      .addCase(updateCartItemQuantity.rejected, (state, action) => {
        if (state.actionRequestId !== action.meta.requestId) {
          return;
        }

        state.actionStatus = 'idle';
        state.actionError = action.payload;

        state.actionRequestId = null;
        state.actionItemId = action.meta.arg.cartItemId;

        state.actionOperation = 'quantity';
      })

      .addCase(removeCartItem.pending, (state, action) => {
        state.ownerId = action.meta.arg.customerId;

        state.actionStatus = 'loading';
        state.actionError = null;

        state.actionRequestId = action.meta.requestId;
        state.actionItemId = action.meta.arg.cartItemId;
        state.actionOperation = 'remove';
      })

      .addCase(removeCartItem.fulfilled, (state, action) => {
        if (
          state.actionRequestId !== action.meta.requestId ||
          state.ownerId !== action.payload.customerId
        ) {
          return;
        }

        /*
         * Customer Cart stays backend-authoritative.
         * The removed line and recalculated subtotal come from the response.
         */
        state.cart = action.payload.cart;

        state.initialized = true;

        state.actionStatus = 'idle';
        state.actionError = null;

        state.actionRequestId = null;
        state.actionItemId = null;
        state.actionOperation = null;
      })

      .addCase(removeCartItem.rejected, (state, action) => {
        if (state.actionRequestId !== action.meta.requestId) {
          return;
        }

        state.actionStatus = 'idle';
        state.actionError = action.payload;

        state.actionRequestId = null;
        state.actionItemId = action.meta.arg.cartItemId;
        state.actionOperation = 'remove';
      })

      .addCase(clearCart.pending, (state, action) => {
        state.ownerId = action.meta.arg;

        state.actionStatus = 'loading';
        state.actionError = null;

        state.actionRequestId = action.meta.requestId;
        state.actionItemId = null;
        state.actionOperation = 'clear';
      })

      .addCase(clearCart.fulfilled, (state, action) => {
        if (
          state.actionRequestId !== action.meta.requestId ||
          state.ownerId !== action.payload.customerId
        ) {
          return;
        }

        /*
         * Customer Cart remains backend-authoritative.
         * Replace it with the resolved empty Cart returned by the server.
         */
        state.cart = action.payload.cart;

        state.initialized = true;

        state.actionStatus = 'idle';
        state.actionError = null;

        state.actionRequestId = null;
        state.actionItemId = null;
        state.actionOperation = null;
      })

      .addCase(clearCart.rejected, (state, action) => {
        if (state.actionRequestId !== action.meta.requestId) {
          return;
        }

        state.actionStatus = 'idle';
        state.actionError = action.payload;

        state.actionRequestId = null;
        state.actionItemId = null;
        state.actionOperation = 'clear';
      });
  },
});

export const {
  addGuestCartItem,
  updateGuestCartItemQuantity,
  removeGuestCartItem,
  clearGuestCart,
  clearAuthenticatedCart,
  clearCartActionError,
} = cartSlice.actions;

export default cartSlice.reducer;
